import { notFound, redirect } from "next/navigation";
import { UsersIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { flags } from "@/lib/flags";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function TeamOverviewPage() {
  if (!flags.teamOverviewEnabled) notFound();

  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/team-overview");

  return (
    <>
      <PageHeader title="Team Overview" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <UsersIcon className="text-muted-foreground/60 size-12" />
        <div>
          <p className="font-medium">Team Overview module is in progress</p>
          <p className="text-muted-foreground text-sm">
            Top-level view of team members, roles, activity, and tasks. Spec
            §17. Team management lives in Settings → Team until the migration
            is complete.
          </p>
        </div>
      </div>
    </>
  );
}
