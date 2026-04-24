import { notFound, redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import {
  EditFuelEntryForm,
  type FuelEntryInitial,
} from "@/components/carbon/edit-fuel-entry-form";

export const dynamic = "force-dynamic";

function toMonthString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Best-effort region recovery from a legacy factor snapshot. Defaults to
 * "GLOBAL" if we can't determine what region was used at write time.
 */
function regionFromSnapshot(snapshot: unknown): string {
  if (snapshot && typeof snapshot === "object" && "region" in snapshot) {
    const r = (snapshot as { region: unknown }).region;
    if (typeof r === "string" && r.length > 0) return r;
  }
  return "GLOBAL";
}

export default async function EditFuelEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint/fuel");

  const { id } = await params;

  const [entry, sites] = await Promise.all([
    prisma.fuelEntry.findFirst({
      where: { id, companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!entry) notFound();

  const initial: FuelEntryInitial = {
    id: entry.id,
    fuelType: entry.fuelType,
    emissionSourceType: entry.emissionSourceType,
    unit: entry.unit,
    quantity: entry.quantity.toString(),
    month: toMonthString(entry.month),
    region: regionFromSnapshot(entry.factorSnapshot),
    siteId: entry.siteId,
    locationName: entry.locationName,
    notes: entry.notes,
  };

  return (
    <>
      <PageHeader
        title="Edit Scope 1 entry"
        breadcrumbs={[
          { label: "Carbon Footprint", href: "/carbon-footprint" },
          { label: "Scope 1 — Fuel", href: "/carbon-footprint/fuel" },
          {
            label: entry.fuelType,
            href: `/carbon-footprint/fuel/${entry.id}`,
          },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <EditFuelEntryForm entry={initial} sites={sites} />
      </div>
    </>
  );
}
