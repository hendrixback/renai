"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  AlertTriangleIcon,
  ChevronRightIcon,
  Trash2Icon,
} from "lucide-react";

import {
  changeTaskStatus,
  deleteTask,
} from "@/app/(app)/tasks/actions";
import {
  TASK_STATUS_OPTIONS,
  isOverdue,
  type TaskStatusValue,
  type TaskPriorityValue,
} from "@/lib/tasks-shared";
import type { TaskRow } from "@/lib/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskFormDialog } from "./task-form-dialog";

type Member = { id: string; name: string | null; email: string };

const statusSelectClass =
  "h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const PRIORITY_VARIANTS: Record<
  TaskPriorityValue,
  "default" | "secondary" | "outline" | "destructive"
> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  CRITICAL: "destructive",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function StatusSelect({
  taskId,
  current,
  disabled,
}: {
  taskId: string;
  current: TaskStatusValue;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      className={statusSelectClass}
      value={current}
      disabled={pending || disabled}
      onChange={(e) => {
        const next = e.target.value as TaskStatusValue;
        if (next === current) return;
        start(async () => {
          const fd = new FormData();
          fd.set("id", taskId);
          fd.set("status", next);
          await changeTaskStatus(fd);
          router.refresh();
        });
      }}
    >
      {TASK_STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

function DeleteButton({
  taskId,
  onDeleted,
}: {
  taskId: string;
  onDeleted: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Delete this task? It will be removed from all task lists. This is reversible only via the database.",
          )
        ) {
          return;
        }
        start(async () => {
          const fd = new FormData();
          fd.set("id", taskId);
          await deleteTask(fd);
          onDeleted();
        });
      }}
      aria-label="Delete task"
    >
      <Trash2Icon className="size-4" />
    </Button>
  );
}

export function TasksTable({
  tasks,
  members,
  currentUserId,
  isAdmin,
}: {
  tasks: ReadonlyArray<TaskRow>;
  members: ReadonlyArray<Member>;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No tasks match the current filters.
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Related</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const overdue = isOverdue(task, now);
            const canEdit =
              isAdmin || task.assignedToId === currentUserId;
            return (
              <TableRow key={task.id}>
                <TableCell className="max-w-[280px]">
                  <div className="flex items-center gap-2">
                    {overdue ? (
                      <AlertTriangleIcon
                        className="size-4 shrink-0 text-destructive"
                        aria-label="Overdue"
                      />
                    ) : null}
                    <span className="truncate font-medium">{task.title}</span>
                  </div>
                  {task.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={PRIORITY_VARIANTS[task.priority]}>
                    {task.priority.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusSelect
                    taskId={task.id}
                    current={task.status}
                    disabled={!canEdit}
                  />
                </TableCell>
                <TableCell className="text-sm">
                  {task.assignedTo ? (
                    <span title={task.assignedTo.email}>
                      {task.assignedTo.name ?? task.assignedTo.email}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {task.dueDate ? (
                    <span
                      className={overdue ? "text-destructive font-medium" : ""}
                    >
                      {dateFormatter.format(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.relatedModule ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="capitalize">
                        {task.relatedModule.replace(/-/g, " ")}
                      </span>
                      {task.relatedRecordId ? (
                        <>
                          <ChevronRightIcon className="size-3" />
                          <span className="font-mono text-xs">
                            {task.relatedRecordId.slice(0, 8)}
                          </span>
                        </>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit ? (
                      <TaskFormDialog
                        members={members}
                        task={task}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Edit task"
                          >
                            Edit
                          </Button>
                        }
                      />
                    ) : null}
                    {isAdmin ? (
                      <DeleteButton
                        taskId={task.id}
                        onDeleted={() => router.refresh()}
                      />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
