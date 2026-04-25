"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";

import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/tasks-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full min-w-[140px] rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type Member = { id: string; name: string | null; email: string };

export function TasksFilters({
  members,
  currentUserId,
}: {
  members: ReadonlyArray<Member>;
  currentUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const assignedTo = params.get("assignedTo") ?? "";
  const scope = params.get("scope") ?? "";
  const view = params.get("view") ?? "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const hasFilters = status || priority || assignedTo || scope || view;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">View</Label>
        <select
          className={selectClass}
          value={scope || ""}
          onChange={(e) => setParam("scope", e.target.value)}
        >
          <option value="">All tasks</option>
          <option value="mine">My tasks</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Status</Label>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {TASK_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Priority</Label>
        <select
          className={selectClass}
          value={priority}
          onChange={(e) => setParam("priority", e.target.value)}
        >
          <option value="">Any priority</option>
          {TASK_PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Assignee</Label>
        <select
          className={selectClass}
          value={assignedTo}
          onChange={(e) => setParam("assignedTo", e.target.value)}
        >
          <option value="">Anyone</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.email}
              {m.id === currentUserId ? " (you)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Filter</Label>
        <select
          className={selectClass}
          value={view}
          onChange={(e) => setParam("view", e.target.value)}
        >
          <option value="">All due dates</option>
          <option value="overdue">Overdue only</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5 hidden">
        {/* hidden free-text search slot — search-by-title can land in v2 */}
        <Input className="hidden" />
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <XIcon className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
