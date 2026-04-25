"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PencilIcon, PlusIcon } from "lucide-react";

import {
  createTask,
  updateTask,
  type TaskActionState,
} from "@/app/(app)/tasks/actions";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_RELATED_MODULES,
  TASK_STATUS_OPTIONS,
} from "@/lib/tasks-shared";
import type { TaskRow } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Member = { id: string; name: string | null; email: string };

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const empty: TaskActionState = { error: null, fieldErrors: {} };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

function dateToInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

const RELATED_MODULE_OPTIONS = [
  { value: "", label: "(none)" },
  ...TASK_RELATED_MODULES.map((m) => ({
    value: m,
    label: m
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
];

export function TaskFormDialog({
  members,
  task,
  trigger,
}: {
  members: ReadonlyArray<Member>;
  task?: TaskRow | null;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<TaskActionState>(empty);
  const [pending, start] = React.useTransition();
  const isEdit = Boolean(task);

  function handleSubmit(formData: FormData) {
    start(async () => {
      const result = await (isEdit ? updateTask : createTask)(state, formData);
      const ok =
        !result.error && Object.keys(result.fieldErrors).length === 0;
      setState(result);
      if (ok) {
        router.refresh();
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setState(empty);
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              {isEdit ? (
                <PencilIcon className="size-4" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {isEdit ? "Edit task" : "New task"}
            </Button>
          )
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "Create task"}</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {isEdit ? (
            <input type="hidden" name="id" value={task!.id} />
          ) : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                name="title"
                defaultValue={task?.title ?? ""}
                placeholder="What needs to be done?"
                required
              />
              <FieldError errors={state.fieldErrors.title} />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={task?.description ?? ""}
                placeholder="Optional context"
              />
              <FieldError errors={state.fieldErrors.description} />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="priority">Priority</FieldLabel>
                <select
                  id="priority"
                  name="priority"
                  className={selectClass}
                  defaultValue={task?.priority ?? "MEDIUM"}
                >
                  {TASK_PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <select
                  id="status"
                  name="status"
                  className={selectClass}
                  defaultValue={task?.status ?? "OPEN"}
                >
                  {TASK_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="assignedToId">Assigned to</FieldLabel>
              <select
                id="assignedToId"
                name="assignedToId"
                className={selectClass}
                defaultValue={task?.assignedToId ?? ""}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="startDate">Start date</FieldLabel>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={dateToInput(task?.startDate ?? null)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dueDate">Due date</FieldLabel>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={dateToInput(task?.dueDate ?? null)}
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="relatedModule">Related module</FieldLabel>
                <select
                  id="relatedModule"
                  name="relatedModule"
                  className={selectClass}
                  defaultValue={task?.relatedModule ?? ""}
                >
                  {RELATED_MODULE_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="relatedRecordId">Record ID</FieldLabel>
                <Input
                  id="relatedRecordId"
                  name="relatedRecordId"
                  defaultValue={task?.relatedRecordId ?? ""}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={task?.notes ?? ""}
                placeholder="Internal notes"
              />
            </Field>
          </FieldGroup>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
