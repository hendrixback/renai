import { MailIcon } from "lucide-react";

import type { PendingInvitation } from "@/lib/team";
import { ROLE_LABELS } from "@/lib/team-shared";
import { Badge } from "@/components/ui/badge";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function PendingInvitationsList({
  invitations,
}: {
  invitations: ReadonlyArray<PendingInvitation>;
}) {
  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending invitations.</p>
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {invitations.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
        >
          <MailIcon className="size-4 text-muted-foreground" />
          <span className="font-medium">{inv.email}</span>
          <Badge variant="outline">{ROLE_LABELS[inv.role]}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            invited {dateFormatter.format(inv.invitedAt)} ·{" "}
            {inv.invitedByName ? `by ${inv.invitedByName}` : "—"} · expires{" "}
            {dateFormatter.format(inv.expiresAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
