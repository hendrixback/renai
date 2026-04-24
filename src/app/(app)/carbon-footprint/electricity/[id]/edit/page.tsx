import { notFound, redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import {
  EditElectricityEntryForm,
  type ElectricityEntryInitial,
} from "@/components/carbon/edit-electricity-entry-form";

export const dynamic = "force-dynamic";

function toMonthString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function regionFromSnapshot(snapshot: unknown): string {
  if (snapshot && typeof snapshot === "object" && "region" in snapshot) {
    const r = (snapshot as { region: unknown }).region;
    if (typeof r === "string" && r.length > 0) return r;
  }
  return "EU";
}

export default async function EditElectricityEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint/electricity");

  const { id } = await params;

  const [entry, sites] = await Promise.all([
    prisma.electricityEntry.findFirst({
      where: { id, companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!entry) notFound();

  const initial: ElectricityEntryInitial = {
    id: entry.id,
    kwh: entry.kwh.toString(),
    month: toMonthString(entry.month),
    renewablePercent: entry.renewablePercent
      ? entry.renewablePercent.toString()
      : null,
    energyProvider: entry.energyProvider,
    region: regionFromSnapshot(entry.factorSnapshot),
    siteId: entry.siteId,
    locationName: entry.locationName,
    notes: entry.notes,
  };

  return (
    <>
      <PageHeader
        title="Edit Scope 2 entry"
        breadcrumbs={[
          { label: "Carbon Footprint", href: "/carbon-footprint" },
          {
            label: "Scope 2 — Electricity",
            href: "/carbon-footprint/electricity",
          },
          {
            label: entry.month.toISOString().slice(0, 7),
            href: `/carbon-footprint/electricity/${entry.id}`,
          },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <EditElectricityEntryForm entry={initial} sites={sites} />
      </div>
    </>
  );
}
