import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ElectricityPanel } from "@/components/carbon/electricity-panel";

export default async function ElectricityPage() {
  const ctx = await getCurrentContext();
  if (!ctx) notFound();

  const [entries, sites] = await Promise.all([
    prisma.electricityEntry.findMany({
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
