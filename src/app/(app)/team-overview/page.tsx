import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2Icon, UserPlus2Icon, UsersIcon } from "lucide-react";

import { canManageTeam, getCurrentContext } from "@/lib/auth";
import {
  getTeamOverview,
  parseTeamFilters,
  type TeamSearchParams,
} from "@/lib/team";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { PendingInvitationsList } from "@/components/team-overview/pending-invitations-list";
import { TeamMembersTable } from "@/components/team-overview/team-members-table";
import { TeamOverviewFilters } from "@/components/team-overview/team-overview-filters";

export const dynamic = "force-dynamic";

export default async function TeamOverviewPage({
  searchParams,
}: {
  searchParams: Promise<TeamSearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/team-overview");

  const sp = await searchParams;
  const filters = parseTeamFilters(sp);
  const data = await getTeamOverview(ctx.company.id, filters);

  const activeCount = data.members.filter((m) => m.status === "ACTIVE").length;
  const inactiveCount = data.members.filter(
    (m) => m.status === "INACTIVE",
  ).length;
  const totalOpenTasks = data.members.reduce((sum, m) => sum + m.taskOpen, 0);
  const totalOverdue = data.members.reduce(
    (sum, m) => sum + m.taskOverdue,
    0,
  );

  const canManage = canManageTeam(ctx.company.role);

  return (
    <>
      <PageHeader
        title="Team Overview"
        actions={
          canManage ? (
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href="/settings/team">
                  <UserPlus2Icon className="size-4" />
                  Manage invitations
                </Link>
              }
            />
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Team{" "}
            <span className="text-muted-foreground">
              — {data.members.length} member
              {data.members.length === 1 ? "" : "s"}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Roles, activity, and task workload across {ctx.company.name}.
            Click a row to open the user&apos;s profile.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Active members"
            value={activeCount}
            caption={`${inactiveCount} inactive (>30 days)`}
            icon={<UsersIcon />}
            accent="success"
          />
          <KpiCard
            label="Pending invitations"
            value={data.invitations.length}
            caption={
              data.invitations.length > 0
                ? "Waiting for acceptance"
                : "No outstanding invitations"
            }
            icon={<UserPlus2Icon />}
            accent="default"
          />
          <KpiCard
            label="Open tasks"
            value={totalOpenTasks}
            caption="Across the whole team"
            icon={<CheckCircle2Icon />}
            accent="default"
          />
          <KpiCard
            label="Overdue"
            value={totalOverdue}
            caption={totalOverdue > 0 ? "Past due date" : "Nothing overdue"}
            icon={<CheckCircle2Icon />}
            accent={totalOverdue > 0 ? "danger" : "default"}
          />
        </div>

        <TeamOverviewFilters departments={data.departments} />

        <TeamMembersTable members={data.members} />

        {data.invitations.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Pending invitations</h2>
              <p className="text-sm text-muted-foreground">
                People who&apos;ve been invited but haven&apos;t accepted
                yet. Manage these from{" "}
                <Link
                  href="/settings/team"
                  className="underline underline-offset-2"
                >
                  Settings → Team
                </Link>
                .
              </p>
            </div>
            <PendingInvitationsList invitations={data.invitations} />
          </section>
        ) : null}
      </div>
    </>
  );
}
