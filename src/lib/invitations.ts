import "server-only";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const INVITATION_TTL_DAYS = 7;

export function generateInvitationToken(): string {
  return randomBytes(24).toString("base64url");
}

export function invitationExpiry(): Date {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function getValidInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      company: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invitation) return null;
  if (invitation.acceptedAt) return null;
  if (invitation.expiresAt < new Date()) return null;

  return invitation;
}
