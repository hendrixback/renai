import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { getCarbonSummary } from "@/lib/carbon";
import { OverviewPanel } from "@/components/carbon/overview-panel";

export default async function OverviewPage() {
  const ctx = await getCurrentContext();
  if (!ctx) notFound();

  const summary = await getCarbonSummary(ctx.company.id);
  return <OverviewPanel summary={summary} companyName={ctx.company.name} />;
}
