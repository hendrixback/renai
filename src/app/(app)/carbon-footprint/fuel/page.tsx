import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FuelPanel } from "@/components/carbon/fuel-panel";

export default async function FuelPage() {
  const ctx = await getCurrentContext();
  if (!ctx) notFound();

  const [entries, sites] = await Promise.all([
    prisma.fuelEntry.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { month: "desc" },
      include: { site: { select: { name: true } } },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id },
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
