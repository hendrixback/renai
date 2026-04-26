"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext, getCurrentUser } from "@/lib/auth";
import { passwordSchema } from "@/lib/auth/password-policy";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { checkLimit, limiters } from "@/lib/rate-limit";

export type AccountState = {
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string[]>;
};

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export async function updateProfile(
  _prev: AccountState | null,
  formData: FormData,
): Promise<AccountState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      error: null,
      success: null,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const previousName = ctx.user.name;

  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { name: parsed.data.name },
  });

  if (previousName !== parsed.data.name) {
    await logActivity(ctx, {
      type: "RECORD_UPDATED",
      module: "account",
      recordId: ctx.user.id,
      description: `Updated profile name: "${previousName ?? "(empty)"}" → "${parsed.data.name}"`,
      metadata: {
        previousName: previousName ?? null,
        newName: parsed.data.name,
      },
    });
  }

  revalidatePath("/", "layout");
  return { error: null, success: "Profile updated.", fieldErrors: {} };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New password and confirmation don't match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: AccountState | null,
  formData: FormData,
): Promise<AccountState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  // Rate-limit by user id to thwart a compromised-session attacker
  // hammering the change-password endpoint to enumerate the current
  // password.
  const limit = checkLimit(limiters.passwordChange, user.id);
  if (!limit.allowed) {
    logger.warn("Password change rate-limited", {
      event: "auth.password.rate_limited",
      userId: user.id,
    });
    return {
      error:
        "Too many password change attempts. Please wait before trying again.",
      success: null,
      fieldErrors: {},
    };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: null,
      success: null,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) {
    return { error: "User not found", success: null, fieldErrors: {} };
  }

  const ok = await bcrypt.compare(
    parsed.data.currentPassword,
    record.passwordHash,
  );
  if (!ok) {
    logger.warn("Password change: current password mismatch", {
      event: "auth.password.mismatch",
      userId: user.id,
    });
    return {
      error: null,
      success: null,
      fieldErrors: { currentPassword: ["Incorrect current password"] },
    };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Password change is security-sensitive — audit to ActivityLog under
  // the user's active company (if any) and to the logger unconditionally
  // so a user with no company context still leaves a footprint.
  const ctx = await getCurrentContext();
  if (ctx) {
    await logActivity(ctx, {
      type: "USER_PASSWORD_CHANGED",
      module: "account",
      recordId: user.id,
      description: "Password changed",
    });
  }
  logger.info("Password changed", {
    event: "auth.password.changed",
    userId: user.id,
  });

  return { error: null, success: "Password changed.", fieldErrors: {} };
}
