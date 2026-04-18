"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const user = await getCurrentUser();
  if (!user) {
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

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/", "layout");
  return { error: null, success: "Profile updated.", fieldErrors: {} };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(200),
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

  const parsed = passwordSchema.safeParse({
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

  const ok = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!ok) {
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

  return { error: null, success: "Password changed.", fieldErrors: {} };
}
