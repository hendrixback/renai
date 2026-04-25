import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import {
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  type TaskListFilters,
} from "@/lib/tasks-shared";

// Spec §18 — Tasks. This module is the read/query side. Mutations live
// in src/app/(app)/tasks/actions.ts so they can be reached from forms.
// Permission gating is enforced both here (for read filtering) and in
// the action layer (for writes) — defense in depth.
//
// Pure constants, types, and helpers are in `tasks-shared.ts` so the
// client can import them without dragging in `server-only`.

export {
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_VALUES,
  TASK_RELATED_MODULES,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_VALUES,
  isOverdue,
  parseTaskFilters,
} from "@/lib/tasks-shared";
export type {
  TaskListFilters,
  TaskListSearchParams,
  TaskPriorityValue,
  TaskRelatedModule,
  TaskStatusValue,
} from "@/lib/tasks-shared";

export function buildTaskWhere(
  companyId: string,
  filters: TaskListFilters,
  currentUserId: string,
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    companyId,
    deletedAt: null,
  };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  else if (filters.myTasks) where.assignedToId = currentUserId;
  return where;
}

async function loadTasks(args: {
  companyId: string;
  currentUserId: string;
  filters: TaskListFilters;
  take?: number;
}) {
  const where = buildTaskWhere(
    args.companyId,
    args.filters,
    args.currentUserId,
  );
  const tasks = await prisma.task.findMany({
    where,
    take: args.take,
    orderBy: [
      { status: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      assignedToId: true,
      assignedById: true,
      relatedModule: true,
      relatedRecordId: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (args.filters.overdueOnly) {
    const now = new Date();
    return tasks.filter((t) => {
      if (t.dueDate === null) return false;
      if (t.status !== "OPEN" && t.status !== "IN_PROGRESS") return false;
      return t.dueDate.getTime() < now.getTime();
    });
  }
  return tasks;
}

export async function listTasks(args: {
  companyId: string;
  currentUserId: string;
  filters: TaskListFilters;
  take?: number;
}): Promise<Awaited<ReturnType<typeof loadTasks>>> {
  return loadTasks(args);
}

export type TaskRow = Awaited<ReturnType<typeof loadTasks>>[number];

export async function getTaskById(args: {
  id: string;
  companyId: string;
}): Promise<TaskRow | null> {
  const task = await prisma.task.findFirst({
    where: { id: args.id, companyId: args.companyId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      assignedToId: true,
      assignedById: true,
      relatedModule: true,
      relatedRecordId: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
  });
  return task;
}

export type TaskSummary = {
  open: number;
  inProgress: number;
  blocked: number;
  completed: number;
  cancelled: number;
  overdue: number;
};

/** Roll-up counts used by the Dashboard widget + Team Overview. */
export async function getTaskSummary(args: {
  companyId: string;
  assignedToId?: string;
}): Promise<TaskSummary> {
  const where: Prisma.TaskWhereInput = {
    companyId: args.companyId,
    deletedAt: null,
    ...(args.assignedToId ? { assignedToId: args.assignedToId } : {}),
  };
  const [groups, openWithDue] = await Promise.all([
    prisma.task.groupBy({
      where,
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: {
        ...where,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueDate: { lt: new Date() },
      },
      select: { id: true },
    }),
  ]);

  const counts: TaskSummary = {
    open: 0,
    inProgress: 0,
    blocked: 0,
    completed: 0,
    cancelled: 0,
    overdue: openWithDue.length,
  };
  for (const g of groups) {
    const n = g._count._all;
    if (g.status === "OPEN") counts.open = n;
    else if (g.status === "IN_PROGRESS") counts.inProgress = n;
    else if (g.status === "BLOCKED") counts.blocked = n;
    else if (g.status === "COMPLETED") counts.completed = n;
    else if (g.status === "CANCELLED") counts.cancelled = n;
  }
  return counts;
}

/** Per-user counts, used by Team Overview to show "open / completed"
 *  next to each member's row. Single query, joined company-wide. */
export async function getTaskCountsByUser(
  companyId: string,
): Promise<Map<string, { open: number; completed: number; overdue: number }>> {
  const tasks = await prisma.task.findMany({
    where: { companyId, deletedAt: null, assignedToId: { not: null } },
    select: { assignedToId: true, status: true, dueDate: true },
  });
  const now = new Date();
  const map = new Map<
    string,
    { open: number; completed: number; overdue: number }
  >();
  for (const t of tasks) {
    if (!t.assignedToId) continue;
    const bucket = map.get(t.assignedToId) ?? {
      open: 0,
      completed: 0,
      overdue: 0,
    };
    if (t.status === "OPEN" || t.status === "IN_PROGRESS") bucket.open++;
    if (t.status === "COMPLETED") bucket.completed++;
    if (
      (t.status === "OPEN" || t.status === "IN_PROGRESS") &&
      t.dueDate !== null &&
      t.dueDate.getTime() < now.getTime()
    ) {
      bucket.overdue++;
    }
    map.set(t.assignedToId, bucket);
  }
  return map;
}

export type TaskListMeta = {
  members: Array<{ id: string; name: string | null; email: string }>;
};

/** Fetch members of a company for the assignee dropdown. Excludes
 *  viewers (per Spec §18.12 they shouldn't be assignment targets). */
export async function listAssignableMembers(
  companyId: string,
): Promise<TaskListMeta["members"]> {
  const memberships = await prisma.membership.findMany({
    where: {
      companyId,
      role: { in: ["OWNER", "ADMIN", "MEMBER"] },
    },
    orderBy: { user: { name: "asc" } },
    select: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return memberships.map((m) => m.user);
}

// Avoid "unused import" — these symbols round-trip through this module
// for back-compat with the test file and external imports.
void TASK_STATUS_VALUES;
void TASK_PRIORITY_VALUES;
