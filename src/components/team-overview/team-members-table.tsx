import Link from "next/link";

import type { TeamMemberRow } from "@/lib/team";
import { ROLE_LABELS } from "@/lib/team-shared";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const STATUS_VARIANT: Record<
  TeamMemberRow["status"],
  "default" | "outline" | "secondary"
> = {
  ACTIVE: "default",
  INACTIVE: "outline",
  INVITED: "secondary",
};

const ROLE_VARIANT: Record<
  TeamMemberRow["role"],
  "default" | "outline" | "secondary"
> = {
  OWNER: "default",
  ADMIN: "default",
  MEMBER: "secondary",
  VIEWER: "outline",
};

function relativeFromNow(date: Date | null): string {
  if (date === null) return "Never";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function TeamMembersTable({
  members,
}: {
  members: ReadonlyArray<TeamMemberRow>;
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No team members match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last active</TableHead>
            <TableHead className="text-right">Open / Completed</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.membershipId}>
              <TableCell>
                <Link
                  href={`/team-overview/${m.userId}`}
                  className="block hover:underline"
                >
                  <div className="font-medium">{m.name ?? m.email}</div>
                  {m.name ? (
                    <div className="text-xs text-muted-foreground">
                      {m.email}
                    </div>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={ROLE_VARIANT[m.role]}>
                  {ROLE_LABELS[m.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {m.department ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[m.status]}>
                  {m.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {relativeFromNow(m.lastActiveAt)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-sm">
                <span
                  className={m.taskOverdue > 0 ? "text-destructive" : ""}
                >
                  {m.taskOpen}
                </span>
                <span className="text-muted-foreground"> / {m.taskCompleted}</span>
                {m.taskOverdue > 0 ? (
                  <div className="text-xs text-destructive">
                    {m.taskOverdue} overdue
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {dateFormatter.format(m.joinedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
