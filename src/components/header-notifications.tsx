"use client";

import Link from "next/link";
import { AlertTriangleIcon, BellIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type HeaderNotificationsData = {
  /** Tasks open OR in-progress assigned to me. */
  myOpen: number;
  /** Tasks in `myOpen` whose dueDate has passed. */
  myOverdue: number;
  /** Whether the Tasks module is enabled — toggles the bell from the
   *  placeholder copy to live counts. */
  tasksEnabled: boolean;
};

const FALLBACK_DATA: HeaderNotificationsData = {
  myOpen: 0,
  myOverdue: 0,
  tasksEnabled: false,
};

/**
 * Header notifications bell. When Tasks is enabled, surfaces the
 * current user's open + overdue assignment counts and links to the
 * task list. When the module is off — or in any case where the data
 * prop is missing (e.g. a stale dev-server bundle calling the old
 * no-prop signature) — falls back to placeholder copy so the chrome
 * stays consistent across deployments.
 */
export function HeaderNotifications({
  data = FALLBACK_DATA,
}: {
  data?: HeaderNotificationsData;
}) {
  const total = data.myOpen;
  const showBadge = data.tasksEnabled && total > 0;
  const isOverdue = data.tasksEnabled && data.myOverdue > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              data.tasksEnabled
                ? `Notifications — ${total} open task${total === 1 ? "" : "s"}`
                : "Notifications"
            }
            className="relative"
          />
        }
      >
        <BellIcon className="size-4" />
        {showBadge ? (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none",
              isOverdue
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!data.tasksEnabled ? (
          <div className="px-3 py-6 text-center">
            <BellIcon className="text-muted-foreground/40 mx-auto size-6" />
            <p className="text-muted-foreground mt-2 text-xs">
              You&apos;re all caught up.
            </p>
            <p className="text-muted-foreground/70 mt-1 text-[10px]">
              Task notifications will appear here once the Tasks module is
              enabled.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="px-3 py-6 text-center">
            <BellIcon className="text-muted-foreground/40 mx-auto size-6" />
            <p className="text-muted-foreground mt-2 text-xs">
              No tasks need your attention.
            </p>
          </div>
        ) : (
          <>
            <DropdownMenuItem render={<Link href="/tasks?scope=mine" />}>
              <BellIcon className="size-4" />
              <span className="flex-1">Open tasks</span>
              <span className="text-xs font-medium">{total}</span>
            </DropdownMenuItem>
            {data.myOverdue > 0 ? (
              <DropdownMenuItem
                render={<Link href="/tasks?scope=mine&view=overdue" />}
              >
                <AlertTriangleIcon className="size-4 text-destructive" />
                <span className="flex-1">Overdue tasks</span>
                <span className="text-xs font-medium text-destructive">
                  {data.myOverdue}
                </span>
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
