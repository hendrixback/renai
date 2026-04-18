import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { computeWasteImpact } from "@/lib/carbon";
import { WasteImpactPanel } from "@/components/carbon/waste-impact-panel";

export default async function WasteImpactPage() {
  const ctx = await getCurrentContext();
  if (!ctx) notFound();

  const rows = await computeWasteImpact(ctx.company.id);
  return <WasteImpactPanel rows={rows} />;
}
