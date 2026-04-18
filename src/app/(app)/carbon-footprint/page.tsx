import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircleIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import {
  computeWasteImpact,
  getCarbonSummary,
} from "@/lib/carbon";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CarbonTabsNav } from "@/components/carbon/carbon-tabs-nav";
import { ComingSoonPanel } from "@/components/carbon/coming-soon-panel";
import { ElectricityPanel } from "@/components/carbon/electricity-panel";
import { FuelPanel } from "@/components/carbon/fuel-panel";
import { OverviewPanel } from "@/components/carbon/overview-panel";
import { WasteImpactPanel } from "@/components/carbon/waste-impact-panel";

export const dynamic = "force-dynamic";

type TabKey =
  | "overview"
  | "fuel"
  | "electricity"
  | "production"
  | "value-chain"
  | "waste-impact";

const VALID_TABS: TabKey[] = [
  "overview",
  "fuel",
  "electricity",
  "production",
  "value-chain",
  "waste-impact",
];

export default async function CarbonFootprintPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint");

  const { tab } = await searchParams;
  const activeTab: TabKey = (VALID_TABS as string[]).includes(tab ?? "")
    ? (tab as TabKey)
    : "overview";

  return (
    <>
      <PageHeader
        title="Carbon Footprint"
        actions={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href="mailto:support@renai.pt?subject=RenAI — Carbon footprint question">
                <MessageCircleIcon className="size-4" />
                Contact RenAI
              </Link>
            }
          />
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Estimated emissions tracking for your operations.
          </p>
        </div>

        <CarbonTabsNav active={activeTab} />

        <div className="mt-2">
          <TabContent tab={activeTab} companyId={ctx.company.id} companyName={ctx.company.name} />
        </div>
      </div>
    </>
  );
}

async function TabContent({
  tab,
  companyId,
  companyName,
}: {
  tab: TabKey;
  companyId: string;
  companyName: string;
}) {
  if (tab === "overview") {
    const summary = await getCarbonSummary(companyId);
    return <OverviewPanel summary={summary} companyName={companyName} />;
  }

  if (tab === "fuel") {
    const [entries, sites] = await Promise.all([
      prisma.fuelEntry.findMany({
        where: { companyId },
        orderBy: { month: "desc" },
        include: { site: { select: { name: true } } },
      }),
      prisma.site.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    return (
      <FuelPanel
        sites={sites}
        entries={entries.map((e) => ({
          id: e.id,
          fuelType: e.fuelType,
          quantity: e.quantity.toString(),
          unit: e.unit,
          month: e.month,
          kgCo2e: e.kgCo2e ? e.kgCo2e.toString() : null,
          siteName: e.site?.name ?? null,
          locationName: e.locationName,
          notes: e.notes,
        }))}
      />
    );
  }

  if (tab === "electricity") {
    const [entries, sites] = await Promise.all([
      prisma.electricityEntry.findMany({
        where: { companyId },
        orderBy: { month: "desc" },
        include: { site: { select: { name: true } } },
      }),
      prisma.site.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    return (
      <ElectricityPanel
        sites={sites}
        entries={entries.map((e) => ({
          id: e.id,
          kwh: e.kwh.toString(),
          month: e.month,
          renewablePercent: e.renewablePercent
            ? e.renewablePercent.toString()
            : null,
          energyProvider: e.energyProvider,
          kgCo2e: e.kgCo2e ? e.kgCo2e.toString() : null,
          siteName: e.site?.name ?? null,
          locationName: e.locationName,
          notes: e.notes,
        }))}
      />
    );
  }

  if (tab === "waste-impact") {
    const rows = await computeWasteImpact(companyId);
    return <WasteImpactPanel rows={rows} />;
  }

  if (tab === "production") {
    return (
      <ComingSoonPanel
        title="Production emissions"
        description="Track per-product CO₂ intensity — inputs (raw materials, energy per unit) and allocated emissions across your output volume."
        examples={[
          "Product-level emission factors (kgCO₂e per unit produced)",
          "Link production volume to your Scope 1 + 2 consumption",
          "Allocate site emissions across product lines",
          "Calculate carbon intensity per ton of output for ESG reporting",
        ]}
      />
    );
  }

  if (tab === "value-chain") {
    return (
      <ComingSoonPanel
        title="Scope 3 — Value chain"
        description="Upstream and downstream emissions outside your direct operations. This is often the largest portion of a company's footprint."
        examples={[
          "Purchased goods & services (from suppliers)",
          "Upstream & downstream transportation / distribution",
          "Employee commuting and business travel",
          "Use of sold products; end-of-life treatment",
          "Leased assets, investments, franchises",
        ]}
      />
    );
  }

  return null;
}
