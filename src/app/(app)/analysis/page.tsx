import { notFound, redirect } from "next/navigation";
import { BarChart3Icon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { flags } from "@/lib/flags";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  if (!flags.analysisEnabled) notFound();

  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/analysis");

  return (
    <>
      <PageHeader title="Analysis" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <BarChart3Icon className="text-muted-foreground/60 size-12" />
        <div>
          <p className="font-medium">Analysis module is in progress</p>
          <p className="text-muted-foreground text-sm">
            Configurable charts, deep carbon/waste breakdowns, CSV + Excel +
            PDF export. Tracking issue: Spec §14.
          </p>
        </div>
      </div>
    </>
  );
}
