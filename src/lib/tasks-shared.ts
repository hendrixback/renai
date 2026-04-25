// Pure (non-server-only) constants, types, and helpers for the Tasks
// module — safe to import from client components. Server-side queries
// + actions live in src/lib/tasks.ts and src/app/(app)/tasks/actions.ts.

export const TASK_STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

export const TASK_PRIORITY_VALUES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITY_VALUES)[number];

export const TASK_STATUS_OPTIONS: ReadonlyArray<{
  value: TaskStatusValue;
  label: string;
}> = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const TASK_PRIORITY_OPTIONS: ReadonlyArray<{
  value: TaskPriorityValue;
  label: string;
}> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const TASK_RELATED_MODULES = [
  "waste-flows",
  "scope-1",
  "scope-2",
  "scope-3",
  "production",
  "documentation",
  "regulations",
] as const;
export type TaskRelatedModule = (typeof TASK_RELATED_MODULES)[number];

export type TaskListFilters = {
  status?: TaskStatusValue;
  priority?: TaskPriorityValue;
  assignedToId?: string;
  /** Limit to the current user's tasks (assigned to them). */
  myTasks?: boolean;
  /** Filter to overdue items only — applied in JS post-query. */
  overdueOnly?: boolean;
};

export type TaskListSearchParams = {
  status?: string | null;
  priority?: string | null;
  assignedTo?: string | null;
  scope?: string | null; // "mine" | "all" | null
  view?: string | null; // "overdue" | null
};

/** A task is overdue when the due date is in the past *and* it's still
 *  actionable (Open / In progress). Blocked tasks are excluded — being
 *  blocked is itself the reason they're not progressing. */
export function isOverdue(
  task: { status: TaskStatusValue; dueDate: Date | null },
  now: Date = new Date(),
): boolean {
  if (task.dueDate === null) return false;
  if (task.status !== "OPEN" && task.status !== "IN_PROGRESS") return false;
  return task.dueDate.getTime() < now.getTime();
}

function parseEnum<T extends readonly string[]>(
  raw: string | null | undefined,
  values: T,
): T[number] | undefined {
  if (raw && (values as readonly string[]).includes(raw)) {
    return raw as T[number];
  }
  return undefined;
}

export function parseTaskFilters(
  params: TaskListSearchParams,
  currentUserId: string,
): TaskListFilters {
  return {
    status: parseEnum(params.status, TASK_STATUS_VALUES),
    priority: parseEnum(params.priority, TASK_PRIORITY_VALUES),
    assignedToId: params.assignedTo || undefined,
    myTasks: params.scope === "mine"
      ? true
      : params.assignedTo === currentUserId
        ? true
        : undefined,
    overdueOnly: params.view === "overdue",
  };
}
