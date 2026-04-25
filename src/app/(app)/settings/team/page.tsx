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
      },
    }),
  ]);

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
      invitations={invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt.toISOString(),
      }))}
    />
  );
}
