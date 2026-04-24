import { notFound, redirect } from "next/navigation";
import { BookOpenIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { flags } from "@/lib/flags";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function RegulationsPage() {
  if (!flags.regulationsEnabled) notFound();

  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/regulations");

  return (
    <>
      <PageHeader title="Regulations" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <BookOpenIcon className="text-muted-foreground/60 size-12" />
        <div>
          <p className="font-medium">Regulations module is in progress</p>
          <p className="text-muted-foreground text-sm">
            Admin-curated EU + national regulation register with document
            linkage. Tracking issue: Spec §16. Per Amendment A5, no
            AI-generated regulatory content ships in MVP.
          </p>
        </div>
      </div>
    </>
  );
}
