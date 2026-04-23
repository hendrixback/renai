"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
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

const NO_PERMISSION = "Only admins can manage the team.";

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

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return {
        error: NO_PERMISSION,
        success: null,
        inviteUrl: null,
        fieldErrors: {},
      };
    }
    throw err;
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

  // Prevent OWNER role unless the inviter is OWNER. ADMIN can promote up to
  // ADMIN; promoting someone to OWNER requires transferring ownership and
  // is restricted to existing Owners.
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

  // Revoke any existing pending invite for this email in this company by
  // deletion (stale-invite cleanup). Explicit user-initiated revoke on a
  // visible invite record uses `revokeInvitation` which preserves the row
  // with revokedAt for audit purposes.
  await prisma.invitation.deleteMany({
    where: {
      companyId: ctx.company.id,
      email: parsed.data.email,
      acceptedAt: null,
      revokedAt: null,
    },
  });

  const token = generateInvitationToken();
  const invitation = await prisma.invitation.create({
    data: {
      companyId: ctx.company.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt: invitationExpiry(),
      invitedById: ctx.user.id,
    },
    select: { id: true, email: true, role: true },
  });

  await logActivity(ctx, {
    type: "USER_INVITED",
    module: "team",
    recordId: invitation.id,
    description: `Invited ${invitation.email} as ${invitation.role}`,
    metadata: { email: invitation.email, role: invitation.role },
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
  if (!ctx) return;

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const target = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      companyId: ctx.company.id,
      acceptedAt: null,
    },
    select: { id: true, email: true, role: true, revokedAt: true },
  });
  if (!target || target.revokedAt) return;

  // Soft-revoke preserves the audit trail. A stale row older than
  // invitation TTL (7d) is cleaned up by expiresAt + filter logic at
  // consumption time.
  await prisma.invitation.update({
    where: { id: target.id },
    data: { revokedAt: new Date() },
  });

  await logActivity(ctx, {
    type: "USER_INVITATION_REVOKED",
    module: "team",
    recordId: target.id,
    description: `Revoked invitation for ${target.email}`,
    metadata: { email: target.email, role: target.role },
  });

  revalidatePath("/settings/team");
}

export async function removeMember(membershipId: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const target = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      companyId: true,
      role: true,
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!target || target.companyId !== ctx.company.id) return;

  // Only Owners can remove other Owners/Admins; this preserves the invariant
  // that an Admin can't knock out a peer or a superior role.
  if (
    (target.role === "OWNER" || target.role === "ADMIN") &&
    ctx.company.role !== "OWNER"
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (target.role === "OWNER") {
      const ownerCount = await tx.membership.count({
        where: { companyId: ctx.company.id, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        throw new Error("Cannot remove the last owner");
      }
    }
    await tx.membership.delete({ where: { id: membershipId } });
  });

  await logActivity(ctx, {
    type: "USER_REMOVED",
    module: "team",
    recordId: target.id,
    description: `Removed ${target.user.email} (${target.role}) from the team`,
    metadata: {
      email: target.user.email,
      name: target.user.name,
      role: target.role,
    },
  });

  revalidatePath("/settings/team");
}
