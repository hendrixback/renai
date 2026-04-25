import { notFound, redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { flags } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import type {
  BusinessTravelMode,
  EmployeeCommutingMode,
  Scope3CategoryValue,
} from "@/lib/schemas/scope3.schema";
import { PageHeader } from "@/components/page-header";
import {
  EditScope3EntryForm,
  type Scope3EntryInitial,
} from "@/components/carbon/edit-scope3-entry-form";

export const dynamic = "force-dynamic";

function toMonthString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumberString(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

export default async function EditScope3Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!flags.scope3Enabled) notFound();

  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint/value-chain");

  const { id } = await params;

  const [entry, sites] = await Promise.all([
    prisma.scope3Entry.findFirst({
      where: { id, companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!entry) notFound();

  const data = (entry.categoryData ?? {}) as Record<string, unknown>;
  const isTravel = entry.category === "BUSINESS_TRAVEL";
  const isCommuting = entry.category === "EMPLOYEE_COMMUTING";
  const travelMode = isTravel
    ? (asString(data.mode) as BusinessTravelMode)
    : null;
  const commutingMode = isCommuting
    ? (asString(data.mode) as EmployeeCommutingMode)
    : null;

  const initial: Scope3EntryInitial = {
    id: entry.id,
    category: entry.category as Scope3CategoryValue,
    description: entry.description,
    month: toMonthString(entry.month),
    siteId: entry.siteId,
    notes: entry.notes,
    travelMode: travelMode || null,
    distanceKm: asNumberString(data.distanceKm),
    passengers: asNumberString(data.passengers) || "1",
    nights: asNumberString(data.nights),
    region: asString(data.region) || "GLOBAL",
    origin: asString(data.origin),
    destination: asString(data.destination),
    commutingMode: commutingMode || null,
    distancePerDayKm: asNumberString(data.distancePerDayKm),
    daysPerYear: asNumberString(data.daysPerYear) || "220",
    employees: asNumberString(data.employees) || "1",
    amount: asNumberString(data.amount),
    amountUnit: asString(data.unit),
    kgCo2eOverride: asNumberString(data.kgCo2eOverride),
  };

  return (
    <>
      <PageHeader
        title="Edit Scope 3 entry"
        breadcrumbs={[
          { label: "Carbon Footprint", href: "/carbon-footprint" },
          {
            label: "Scope 3 — Value chain",
            href: "/carbon-footprint/value-chain",
          },
          {
            label: entry.description,
            href: `/carbon-footprint/value-chain/${entry.id}`,
          },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <EditScope3EntryForm entry={initial} sites={sites} />
      </div>
    </>
  );
}
