"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getCurrentUser, isPlatformAdmin } from "@/lib/auth";
import {
  generateInvitationToken,
  invitationExpiry,
} from "@/lib/invitations";
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
    .replace(/[\u0300-\u036f]/g, "")
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
  await prisma.invitation.create({
    data: {
      companyId: company.id,
      email: parsed.data.ownerEmail,
      role: "OWNER",
      token,
      expiresAt: invitationExpiry(),
      invitedById: user.id,
    },
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
    select: { id: true },
  });
  if (!company) return;

  await setActiveCompany(companyId);
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
    select: { id: true },
  });
  if (!target) {
    return {
      error: "No user with that email. They must sign up first.",
      success: null,
    };
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { role: "ADMIN" },
  });
  revalidatePath("/admin");
  return { error: null, success: `${parsed.data.email} is now a platform admin.` };
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
  return {
    error: null,
    success: `Password rotated for ${parsed.data.email}.`,
  };
}
