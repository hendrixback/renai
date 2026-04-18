"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageTeam, getCurrentContext } from "@/lib/auth";
import {
  generateInvitationToken,
  invitationExpiry,
} from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

export type TeamState = {
  error: string | null;
  success: string | null;
  inviteUrl: string | null;
  fieldErrors: Record<string, string[]>;
};

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export async function inviteTeammate(
  _prev: TeamState | null,
  formData: FormData,
): Promise<TeamState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return {
      error: "Not authenticated",
      success: null,
      inviteUrl: null,
      fieldErrors: {},
    };
  }
  if (!canManageTeam(ctx.company.role)) {
    return {
      error: "Only owners and admins can invite teammates.",
      success: null,
      inviteUrl: null,
      fieldErrors: {},
    };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      error: null,
      success: null,
      inviteUrl: null,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  // Prevent OWNER role unless the inviter is OWNER.
  if (parsed.data.role === "OWNER" && ctx.company.role !== "OWNER") {
    return {
      error: null,
      success: null,
      inviteUrl: null,
      fieldErrors: { role: ["Only owners can invite other owners."] },
    };
  }

  // Bail early if the email is already a member of this company.
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      memberships: { where: { companyId: ctx.company.id } },
    },
  });
  if (existingUser && existingUser.memberships.length > 0) {
    return {
      error: null,
      success: null,
      inviteUrl: null,
      fieldErrors: { email: ["That person is already on your team."] },
    };
  }

  // Revoke any existing pending invite for this email in this company.
  await prisma.invitation.deleteMany({
    where: {
      companyId: ctx.company.id,
      email: parsed.data.email,
      acceptedAt: null,
    },
  });

  const token = generateInvitationToken();
  await prisma.invitation.create({
    data: {
      companyId: ctx.company.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt: invitationExpiry(),
      invitedById: ctx.user.id,
    },
  });

  const origin =
    process.env.PUBLIC_APP_URL ??
    process.env.RAILWAY_PUBLIC_DOMAIN_URL ??
    "";
  const inviteUrl = origin
    ? `${origin.replace(/\/$/, "")}/signup?token=${token}`
    : `/signup?token=${token}`;

  revalidatePath("/settings/team");
  return {
    error: null,
    success: `Invite created for ${parsed.data.email}.`,
    inviteUrl,
    fieldErrors: {},
  };
}

export async function revokeInvitation(invitationId: string) {
  const ctx = await getCurrentContext();
  if (!ctx || !canManageTeam(ctx.company.role)) return;

  await prisma.invitation.deleteMany({
    where: {
      id: invitationId,
      companyId: ctx.company.id,
      acceptedAt: null,
    },
  });

  revalidatePath("/settings/team");
}

export async function removeMember(membershipId: string) {
  const ctx = await getCurrentContext();
  if (!ctx || !canManageTeam(ctx.company.role)) return;

  // Don't let the last OWNER remove themselves / another owner if it'd
  // leave the company ownerless.
  const target = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { companyId: true, role: true, userId: true },
  });
  if (!target || target.companyId !== ctx.company.id) return;

  if (target.role === "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { companyId: ctx.company.id, role: "OWNER" },
    });
    if (ownerCount <= 1) return;
  }

  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath("/settings/team");
}
