import Link from "next/link";
import { ActivityIcon } from "lucide-react";

import type { ActivityType } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TeamActionEntry = {
  id: string;
  activityType: ActivityType;
  module: string;
  recordId: string | null;
  description: string;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
};

const MODULE_HREFS: Record<string, (recordId: string | null) => string | null> = {
  "waste-flows": (id) => (id ? `/waste-flows/${id}` : "/waste-flows"),
  "scope-1": (id) =>
    id ? `/carbon-footprint/fuel/${id}` : "/carbon-footprint/fuel",
  "scope-2": (id) =>
    id ? `/carbon-footprint/electricity/${id}` : "/carbon-footprint/electricity",
  "scope-3": () => "/carbon-footprint/value-chain",
  documentation: (id) => (id ? `/documentation/${id}` : "/documentation"),
  sites: () => "/settings/sites",
  team: () => "/settings/team",
  account: () => "/settings/account",
  regulation: () => "/regulations",
  admin: () => "/admin",
};

function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * "Latest Team Actions" block for the Dashboard (Spec §7.7).
 *
 * Server-rendered — receives already-fetched `activities` from the page.
 * Links to the related record where a sensible route exists for the
 * module, otherwise renders as plain text.
 */
export function LatestTeamActions({
  activities,
}: {
  activities: TeamActionEntry[];
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="size-4" />
          Latest team actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No activity yet. Create a record or invite a teammate to get started.
          </p>
        ) : (
          <ul className="divide-y">
            {activities.map((a) => {
              const href = MODULE_HREFS[a.module]?.(a.recordId) ?? null;
              const actor = a.userName ?? a.userEmail ?? "System";
              return (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {a.description}
                      </Link>
                    ) : (
                      <span>{a.description}</span>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {actor} · {a.module}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {relativeTime(a.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
