"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth";
import {
  generateInvitationToken,
  invitationExpiry,
} from "@/lib/invitations";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { setActiveCompany } from "@/lib/session";

export type AdminCreateCompanyState = {
  error: string | null;
  fieldErrors: Record<string, string[]>;
  inviteUrl: string | null;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Use 2-letter ISO country code")
    .optional()
    .or(z.literal("")),
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid email"),
});

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "company";
  let n = 0;
  while (true) {
    const exists = await prisma.company.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function createCompanyAndInviteOwner(
  _prev: AdminCreateCompanyState | null,
  formData: FormData,
): Promise<AdminCreateCompanyState> {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdmin(user)) {
    return {
      error: "Forbidden",
      fieldErrors: {},
      inviteUrl: null,
    };
  }

  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    country: formData.get("country"),
    ownerEmail: formData.get("ownerEmail"),
  });

  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
      inviteUrl: null,
    };
  }

  const slug = await uniqueSlug(slugify(parsed.data.name));

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      slug,
      country: parsed.data.country || null,
    },
  });

  const token = generateInvitationToken();
  const invitation = await prisma.invitation.create({
    data: {
      companyId: company.id,
      email: parsed.data.ownerEmail,
      role: "OWNER",
      token,
      expiresAt: invitationExpiry(),
      invitedById: user.id,
    },
    select: { id: true, email: true },
  });

  // Audit trail under the new company so its eventual Owner can see
  // the provisioning event.
  await logActivity(
    { user: { id: user.id }, company: { id: company.id } },
    {
      type: "COMPANY_CREATED",
      module: "admin",
      recordId: company.id,
      description: `Company "${company.name}" created by platform admin`,
      metadata: {
        slug: company.slug,
        country: company.country,
        ownerEmail: parsed.data.ownerEmail,
        platformAdminId: user.id,
      },
    },
  );
  await logActivity(
    { user: { id: user.id }, company: { id: company.id } },
    {
      type: "USER_INVITED",
      module: "team",
      recordId: invitation.id,
      description: `Invited ${invitation.email} as OWNER`,
      metadata: { email: invitation.email, role: "OWNER" },
    },
  );
  logger.info("Admin created company + owner invite", {
    event: "admin.company.created",
    platformAdminId: user.id,
    companyId: company.id,
    ownerEmail: parsed.data.ownerEmail,
  });

  const origin =
    process.env.PUBLIC_APP_URL ??
    process.env.RAILWAY_PUBLIC_DOMAIN_URL ??
    "";
  const inviteUrl = origin
    ? `${origin.replace(/\/$/, "")}/signup?token=${token}`
    : `/signup?token=${token}`;

  revalidatePath("/admin");
  return { error: null, fieldErrors: {}, inviteUrl };
}

export async function adminViewAs(companyId: string) {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdmin(user)) return;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) return;

  // Log to the target company so its Owner can see admin access in
  // their own activity history. setActiveCompany happens after so that
  // a failed logActivity doesn't grant a silent access.
  await logActivity(
    { user: { id: user.id }, company: { id: company.id } },
    {
      type: "IMPERSONATION_STARTED",
      module: "admin",
      description: `Platform admin started viewing "${company.name}"`,
      metadata: { platformAdminId: user.id },
    },
  );

  await setActiveCompany(companyId);
  logger.info("Admin view-as started", {
    event: "admin.impersonation.start",
    platformAdminId: user.id,
    companyId: company.id,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

const promoteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function promotePlatformAdmin(
  _prev: { error: string | null; success: string | null } | null,
  formData: FormData,
) {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdmin(user)) {
    return { error: "Forbidden", success: null };
  }
  const parsed = promoteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Enter a valid email", success: null };
  }
  const target = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true },
  });
  if (!target) {
    return {
      error: "No user with that email. They must sign up first.",
      success: null,
    };
  }
  if (target.role === "ADMIN") {
    return {
      error: `${parsed.data.email} is already a platform admin.`,
      success: null,
    };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { role: "ADMIN" },
  });

  // Platform-level role change — no company scope. Goes to the logger
  // only (Axiom/Sentry ingestion). Highly sensitive, so the log context
  // includes both the actor and the target.
  logger.warn("Platform admin promoted", {
    event: "admin.platform_admin.promoted",
    promotedById: user.id,
    promotedUserId: target.id,
    promotedEmail: parsed.data.email,
  });

  revalidatePath("/admin");
  return {
    error: null,
    success: `${parsed.data.email} is now a platform admin.`,
  };
}

/**
 * One-off bootstrap: set a password directly for a user. Useful when a
 * platform admin needs to rotate another admin's credentials without the
 * self-service flow (first-run, lockout, etc.). Leaves regular app users
 * unchanged — only targets other platform admins.
 */
const rotatePasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  newPassword: z.string().min(8).max(200),
});

export async function rotateAdminPassword(
  _prev: { error: string | null; success: string | null } | null,
  formData: FormData,
) {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdmin(user)) {
    return { error: "Forbidden", success: null };
  }
  const parsed = rotatePasswordSchema.safeParse({
    email: formData.get("email"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return {
      error: "Provide a valid email and 8+ char password",
      success: null,
    };
  }
  const target = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true },
  });
  if (!target) return { error: "User not found", success: null };
  if (target.role !== "ADMIN") {
    return {
      error: "This action only applies to platform admins.",
      success: null,
    };
  }
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: hash },
  });

  // Highly sensitive — platform-admin credential rotation. Log with
  // actor + target + timestamp via the logger. Never write to
  // ActivityLog (cross-company, platform-level event).
  logger.warn("Platform admin password rotated", {
    event: "admin.platform_admin.password_rotated",
    rotatedById: user.id,
    targetUserId: target.id,
    targetEmail: parsed.data.email,
  });

  return {
    error: null,
    success: `Password rotated for ${parsed.data.email}.`,
  };
}
