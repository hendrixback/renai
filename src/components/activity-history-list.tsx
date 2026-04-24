import {
  ActivityIcon,
  DownloadIcon,
  FileEditIcon,
  FileOutputIcon,
  FilePlus2Icon,
  FileXIcon,
  HistoryIcon,
  PencilIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  ToggleRightIcon,
  Trash2Icon,
  UploadIcon,
  UserCogIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "lucide-react";

import type { ActivityType } from "@/generated/prisma/enums";
import { getCurrentContext } from "@/lib/auth";
import { listActivityForRecord } from "@/lib/activity/list-activity";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  module: string;
  recordId: string;
  /** Heading shown on the card. Defaults to "Activity history". */
  title?: string;
  /** Hard cap on entries rendered. Defaults to 50 (same as the data loader). */
  limit?: number;
};

const ICON_FOR: Partial<Record<ActivityType, typeof ActivityIcon>> = {
  RECORD_CREATED: PlusCircleIcon,
  RECORD_UPDATED: PencilIcon,
  RECORD_DELETED: Trash2Icon,
  RECORD_STATUS_CHANGED: ToggleRightIcon,
  RECORD_EXPORTED: FileOutputIcon,
  DOCUMENT_UPLOADED: UploadIcon,
  DOCUMENT_DOWNLOADED: DownloadIcon,
  DOCUMENT_DELETED: FileXIcon,
  TASK_CREATED: FilePlus2Icon,
  TASK_ASSIGNED: FileEditIcon,
  TASK_STATUS_CHANGED: FileEditIcon,
  USER_INVITED: UserPlusIcon,
  USER_INVITATION_REVOKED: UserMinusIcon,
  USER_ROLE_CHANGED: UserCogIcon,
  USER_REMOVED: UserMinusIcon,
  USER_LOGIN: UserIcon,
  USER_LOGOUT: UserIcon,
  USER_PASSWORD_CHANGED: ShieldCheckIcon,
};

function fmtWhen(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actorLabel(user: { name: string | null; email: string } | null): string {
  if (!user) return "System";
  return user.name ?? user.email;
}

export async function ActivityHistoryList({
  module,
  recordId,
  title = "Activity history",
  limit,
}: Props) {
  const ctx = await getCurrentContext();
  if (!ctx) return null;

  const entries = await listActivityForRecord(ctx, module, recordId, { limit });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HistoryIcon className="size-4" />
          {title}
          <span className="text-muted-foreground text-sm font-normal">
            ({entries.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ActivityIcon className="text-muted-foreground/60 size-8" />
            <p className="text-muted-foreground text-sm">
              No activity recorded yet.
            </p>
          </div>
        ) : (
          <ol className="relative space-y-0">
            {entries.map((entry, idx) => {
              const Icon = ICON_FOR[entry.activityType] ?? ActivityIcon;
              const isLast = idx === entries.length - 1;
              return (
                <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {!isLast ? (
                    <span
                      aria-hidden
                      className="bg-border absolute top-7 left-[11px] h-full w-px"
                    />
                  ) : null}
                  <div className="bg-muted text-muted-foreground z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 space-y-0.5 pt-0.5">
                    <p className="text-sm leading-snug">{entry.description}</p>
                    <p className="text-muted-foreground text-xs">
                      <span className="text-foreground">
                        {actorLabel(entry.user)}
                      </span>
                      {" · "}
                      {fmtWhen(entry.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
