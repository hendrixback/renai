import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildFuelEntryWhere,
  factorSourceFromSnapshot,
  type CarbonListSearchParams,
} from "@/lib/carbon-filters";
import { FuelPanel } from "@/components/carbon/fuel-panel";
import { serializeSearchParams } from "@/components/export-menu";

export const dynamic = "force-dynamic";

export default async function FuelPage({
  searchParams,
}: {
  searchParams: Promise<CarbonListSearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) notFound();

  const params = await searchParams;
  const where = buildFuelEntryWhere(params, ctx.company.id);

  const [entries, sites] = await Promise.all([
    prisma.fuelEntry.findMany({
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
    params.year || params.site || params.sourceType || params.status,
  );

  return (
    <FuelPanel
      sites={sites}
      searchString={serializeSearchParams(params)}
      hasActiveFilters={hasActiveFilters}
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
        recordStatus: e.recordStatus,
        factorSource: factorSourceFromSnapshot(
          e.factorSnapshot,
          e.emissionFactor?.source ?? null,
        ),
      }))}
    />
  );
}
