"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";

import { USER_STATUS_OPTIONS } from "@/lib/team-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full min-w-[160px] rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const ROLE_OPTIONS = [
  { value: "", label: "Any role" },
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "VIEWER", label: "Viewer" },
];

export function TeamOverviewFilters({
  departments,
}: {
  departments: ReadonlyArray<string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const role = params.get("role") ?? "";
  const department = params.get("department") ?? "";
  const status = params.get("status") ?? "";
  const q = params.get("q") ?? "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const hasFilters = role || department || status || q;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Search</Label>
        <Input
          className="h-9 min-w-[200px]"
          placeholder="Name, email, department"
          defaultValue={q}
          onChange={(e) => setParam("q", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Role</Label>
        <select
          className={selectClass}
          value={role}
          onChange={(e) => setParam("role", e.target.value)}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {departments.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Department</Label>
          <select
            className={selectClass}
            value={department}
            onChange={(e) => setParam("department", e.target.value)}
          >
            <option value="">Any department</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Status</Label>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">Any status</option>
          {USER_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
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
