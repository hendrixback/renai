import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  MailIcon,
  UserIcon,
} from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { listTasks } from "@/lib/tasks";
import {
  getTeamMemberProfile,
  getUserRecentActivity,
} from "@/lib/team";
import { ROLE_LABELS } from "@/lib/team-shared";
import { isOverdue } from "@/lib/tasks-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/team-overview");

  const { id } = await params;
  const profile = await getTeamMemberProfile({
    companyId: ctx.company.id,
    userId: id,
  });
  if (!profile) notFound();

  const [openTasks, completedTasks, activity] = await Promise.all([
    listTasks({
      companyId: ctx.company.id,
      currentUserId: ctx.user.id,
      filters: {
        assignedToId: id,
        status: "OPEN",
        overdueOnly: false,
      },
      take: 50,
    }),
    listTasks({
      companyId: ctx.company.id,
      currentUserId: ctx.user.id,
      filters: {
        assignedToId: id,
        status: "COMPLETED",
        overdueOnly: false,
      },
      take: 10,
    }),
    getUserRecentActivity({
      companyId: ctx.company.id,
      userId: id,
      limit: 15,
    }),
  ]);

  const inProgress = await listTasks({
    companyId: ctx.company.id,
    currentUserId: ctx.user.id,
    filters: {
      assignedToId: id,
      status: "IN_PROGRESS",
      overdueOnly: false,
    },
    take: 50,
  });
  const activeTasks = [...openTasks, ...inProgress];

  const now = new Date();

  return (
    <>
      <PageHeader
        title={profile.name ?? profile.email}
        actions={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/team-overview">
                <ArrowLeftIcon className="size-4" />
                Back to team
              </Link>
            }
          />
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              <span>{profile.name ?? profile.email}</span>
              <Badge variant="outline">{ROLE_LABELS[profile.role]}</Badge>
              <Badge
                variant={
                  profile.status === "ACTIVE" ? "default" : "outline"
                }
              >
                {profile.status.toLowerCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <MailIcon className="size-3.5" />
                  {profile.email}
                </span>
                {profile.department ? (
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="size-3.5" />
                    {profile.department}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5" />
                  Joined {dateFormatter.format(profile.joinedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3.5" />
                  Last active{" "}
                  {profile.lastActiveAt
                    ? dateTimeFormatter.format(profile.lastActiveAt)
                    : "never"}
                </span>
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Open tasks"
            value={profile.taskOpen}
            caption={`${profile.taskOverdue} overdue`}
            icon={<CheckCircle2Icon />}
            accent={profile.taskOverdue > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Completed tasks"
            value={profile.taskCompleted}
            caption="All-time"
            icon={<CheckCircle2Icon />}
            accent="success"
          />
          <KpiCard
            label="Member status"
            value={profile.status === "ACTIVE" ? "Active" : "Inactive"}
            caption={
              profile.lastActiveAt
                ? `Last seen ${dateFormatter.format(profile.lastActiveAt)}`
                : "Never signed in"
            }
            icon={<UserIcon />}
            accent={profile.status === "ACTIVE" ? "success" : "default"}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open + in-progress tasks</CardTitle>
            <CardDescription>
              Items currently assigned to {profile.name ?? profile.email}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open tasks assigned.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {activeTasks.map((task) => {
                  const overdue = isOverdue(task, now);
                  return (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                    >
                      <Badge
                        variant={
                          task.priority === "CRITICAL"
                            ? "destructive"
                            : task.priority === "HIGH"
                              ? "default"
                              : task.priority === "LOW"
                                ? "outline"
                                : "secondary"
                        }
                      >
                        {task.priority.toLowerCase()}
                      </Badge>
                      <span className="font-medium">{task.title}</span>
                      {task.relatedModule ? (
                        <span className="text-xs text-muted-foreground">
                          {task.relatedModule.replace(/-/g, " ")}
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {task.dueDate ? (
                          <span
                            className={
                              overdue ? "text-destructive font-medium" : ""
                            }
                          >
                            due {dateFormatter.format(task.dueDate)}
                          </span>
                        ) : (
                          "no due date"
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent completed tasks</CardTitle>
            <CardDescription>Last 10 closed items.</CardDescription>
          </CardHeader>
          <CardContent>
            {completedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No completed tasks yet.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {completedTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                  >
                    <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{task.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {task.completedAt
                        ? `closed ${dateFormatter.format(task.completedAt)}`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Most recent platform actions by this user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recorded activity yet.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                  >
                    <Badge variant="outline" className="text-xs">
                      {entry.module}
                    </Badge>
                    <span>{entry.description}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {dateTimeFormatter.format(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
