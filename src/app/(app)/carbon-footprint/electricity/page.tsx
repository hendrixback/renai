import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildElectricityEntryWhere,
  factorSourceFromSnapshot,
  type CarbonListSearchParams,
} from "@/lib/carbon-filters";
import { ElectricityPanel } from "@/components/carbon/electricity-panel";
import { serializeSearchParams } from "@/components/export-menu";

export const dynamic = "force-dynamic";

export default async function ElectricityPage({
  searchParams,
}: {
  searchParams: Promise<CarbonListSearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) notFound();

  const params = await searchParams;
  const where = buildElectricityEntryWhere(params, ctx.company.id);

  const [entries, sites] = await Promise.all([
    prisma.electricityEntry.findMany({
      where,
      orderBy: { month: "desc" },
      include: {
        site: { select: { name: true } },
        emissionFactor: { select: { source: true } },
      },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const hasActiveFilters = Boolean(
    params.year || params.site || params.status,
  );

  return (
    <ElectricityPanel
      sites={sites}
      searchString={serializeSearchParams(params)}
      hasActiveFilters={hasActiveFilters}
      entries={entries.map((e) => ({
        id: e.id,
        kwh: e.kwh.toString(),
        month: e.month,
        renewablePercent: e.renewablePercent
          ? e.renewablePercent.toString()
          : null,
        energyProvider: e.energyProvider,
        // Dual GHG-Protocol values (Spec §11.4, Amendment A4). Legacy rows
        // written before migration 0004 only have kgCo2e; fall back to
        // that for the market-based figure so historical data still shows.
        locationBasedKgCo2e: e.locationBasedKgCo2e
          ? e.locationBasedKgCo2e.toString()
          : null,
        marketBasedKgCo2e: e.marketBasedKgCo2e
          ? e.marketBasedKgCo2e.toString()
          : e.kgCo2e
            ? e.kgCo2e.toString()
            : null,
        siteName: e.site?.name ?? null,
        locationName: e.locationName,
        notes: e.notes,
        recordStatus: e.recordStatus,
        factorSource: factorSourceFromSnapshot(
          e.factorSnapshot,
          e.emissionFactor?.source ?? null,
        ),
      }))}
    />
  );
}
