import { notFound, redirect } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  ListChecksIcon,
} from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { flags } from "@/lib/flags";
import {
  getTaskSummary,
  listAssignableMembers,
  listTasks,
  parseTaskFilters,
  type TaskListSearchParams,
} from "@/lib/tasks";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { TasksFilters } from "@/components/tasks/tasks-filters";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<TaskListSearchParams>;
}) {
  if (!flags.tasksEnabled) notFound();

  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/tasks");

  const sp = await searchParams;
  const filters = parseTaskFilters(sp, ctx.user.id);

  const [tasks, members, summary, mySummary] = await Promise.all([
    listTasks({
      companyId: ctx.company.id,
      currentUserId: ctx.user.id,
      filters,
      take: 200,
    }),
    listAssignableMembers(ctx.company.id),
    getTaskSummary({ companyId: ctx.company.id }),
    getTaskSummary({ companyId: ctx.company.id, assignedToId: ctx.user.id }),
  ]);

  const isAdmin =
    ctx.company.role === "ADMIN" || ctx.company.role === "OWNER";

  return (
    <>
      <PageHeader
        title="Tasks"
        actions={<TaskFormDialog members={members} />}
      />

      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tasks{" "}
            <span className="text-muted-foreground">
              — {summary.open + summary.inProgress} open
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Track follow-ups across modules. Tasks can link to a specific
            record (waste flow, Scope entry, etc.) or stand alone.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Open across team"
            value={summary.open + summary.inProgress}
            caption={`${summary.open} open · ${summary.inProgress} in progress`}
            icon={<ListChecksIcon />}
            accent="default"
          />
          <KpiCard
            label="Assigned to you"
            value={mySummary.open + mySummary.inProgress}
            caption={`${mySummary.completed} completed all-time`}
            icon={<CheckCircle2Icon />}
            accent="success"
          />
          <KpiCard
            label="Overdue"
            value={summary.overdue}
            caption={
              summary.overdue > 0
                ? "Past due date and still open"
                : "Nothing overdue"
            }
            icon={<AlertTriangleIcon />}
            accent={summary.overdue > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Blocked"
            value={summary.blocked}
            caption={
              summary.blocked > 0
                ? "Need attention to unblock"
                : "No blocked tasks"
            }
            icon={<ClockIcon />}
            accent={summary.blocked > 0 ? "warning" : "default"}
          />
        </div>

        <TasksFilters members={members} currentUserId={ctx.user.id} />

        <TasksTable
          tasks={tasks}
          members={members}
          currentUserId={ctx.user.id}
          isAdmin={isAdmin}
        />
      </div>
    </>
  );
}
