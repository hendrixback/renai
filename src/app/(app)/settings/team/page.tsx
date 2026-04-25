import { redirect } from "next/navigation";

import { canManageTeam, getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamPanel } from "@/components/team-panel";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/settings/team");

  const [memberships, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.invitation.findMany({
      // Pending = not yet accepted, not revoked, and still within
      // the 7-day TTL. Same filter set as /team-overview so the two
      // surfaces never disagree about what's outstanding.
      where: {
        companyId: ctx.company.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
        resendMessageId: true,
      },
    }),
  ]);

  // Pull the most recent bounce/complaint event per pending invitation
  // so the UI can show "Bounced" / "Spam complaint" inline. We only
  // care about the terminal-failure events; SENT/DELIVERED don't
  // change the action surface.
  const messageIds = invitations
    .map((i) => i.resendMessageId)
    .filter((id): id is string => id !== null);
  const failureEvents = messageIds.length
    ? await prisma.emailEvent.findMany({
        where: {
          resendMessageId: { in: messageIds },
          type: { in: ["BOUNCED", "COMPLAINED"] },
        },
        orderBy: { receivedAt: "desc" },
        select: {
          resendMessageId: true,
          type: true,
          reason: true,
          receivedAt: true,
        },
      })
    : [];
  const eventByMessageId = new Map<
    string,
    { type: "BOUNCED" | "COMPLAINED"; reason: string | null }
  >();
  for (const e of failureEvents) {
    if (eventByMessageId.has(e.resendMessageId)) continue; // newest wins
    eventByMessageId.set(e.resendMessageId, {
      type: e.type as "BOUNCED" | "COMPLAINED",
      reason: e.reason,
    });
  }

  return (
    <TeamPanel
      canManage={canManageTeam(ctx.company.role)}
      isOwner={ctx.company.role === "OWNER"}
      currentUserId={ctx.user.id}
      members={memberships.map((m) => ({
        id: m.id,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        userId: m.user.id,
        createdAt: m.createdAt.toISOString(),
      }))}
      invitations={invitations.map((i) => {
        const failure = i.resendMessageId
          ? eventByMessageId.get(i.resendMessageId) ?? null
          : null;
        return {
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
          deliveryStatus: failure
            ? {
                kind: failure.type,
                reason: failure.reason,
              }
            : null,
        };
      })}
    />
  );
}
