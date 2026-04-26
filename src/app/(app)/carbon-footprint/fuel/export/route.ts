import "server-only";

import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/auth";
import {
  buildFuelEntryWhere,
  describeCarbonFilters,
  factorSourceFromSnapshot,
  type CarbonListSearchParams,
} from "@/lib/carbon-filters";
import {
  exportResponse,
  parseExportFormat,
  type ExportColumn,
  type ExportDataset,
} from "@/lib/export";
import { logActivity } from "@/lib/activity/log-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await getCurrentContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const qs = request.nextUrl.searchParams;
  const format = parseExportFormat(qs.get("format"));

  const params: CarbonListSearchParams = {
    year: qs.get("year"),
    site: qs.get("site"),
    sourceType: qs.get("sourceType"),
    status: qs.get("status"),
  };

  const where = buildFuelEntryWhere(params, ctx.company.id);

  const [entries, sites] = await Promise.all([
    prisma.fuelEntry.findMany({
      where,
      orderBy: { month: "desc" },
      select: {
        id: true,
        title: true,
        sourceReference: true,
        fuelType: true,
        emissionSourceType: true,
        quantity: true,
        unit: true,
        month: true,
        kgCo2e: true,
        factorSnapshot: true,
        locationName: true,
        notes: true,
        recordStatus: true,
        site: { select: { name: true } },
        emissionFactor: { select: { source: true } },
      },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id },
      select: { id: true, name: true },
    }),
  ]);

  type Row = (typeof entries)[number];
  const columns: ExportColumn<Row>[] = [
    { key: "title", header: "Title", width: 28, value: (r) => r.title },
    { key: "month", header: "Month", width: 10, type: "date", value: (r) => r.month },
    { key: "fuelType", header: "Fuel Type", width: 16, value: (r) => r.fuelType },
    {
      key: "sourceType",
      header: "Source Type",
      width: 20,
      value: (r) => r.emissionSourceType,
    },
    {
      key: "sourceReference",
      header: "Source Reference",
      width: 22,
      value: (r) => r.sourceReference,
    },
    {
      key: "quantity",
      header: "Quantity",
      width: 12,
      type: "number",
      align: "right",
      value: (r) => Number(r.quantity),
    },
    { key: "unit", header: "Unit", width: 8, value: (r) => r.unit },
    {
      key: "kgCo2e",
      header: "kg CO₂e",
      width: 12,
      type: "number",
      align: "right",
      value: (r) => (r.kgCo2e ? Number(r.kgCo2e) : null),
    },
    {
      key: "factorSource",
      header: "Factor Source",
      width: 18,
      value: (r) => factorSourceFromSnapshot(r.factorSnapshot, r.emissionFactor?.source ?? null),
    },
    { key: "site", header: "Site", width: 16, value: (r) => r.site?.name ?? null },
    { key: "location", header: "Location", width: 16, value: (r) => r.locationName },
    { key: "notes", header: "Notes", width: 24, value: (r) => r.notes },
    { key: "status", header: "Status", width: 10, value: (r) => r.recordStatus },
  ];

  const dataset: ExportDataset<Row> = {
    title: "Scope 1 — Fuel & Direct Emissions",
    subtitle: describeCarbonFilters(params, { sites }),
    generatedAt: new Date(),
    companyName: ctx.company.name,
    rows: entries,
    columns,
  };

  await logActivity(ctx, {
    type: "RECORD_EXPORTED",
    module: "scope-1",
    description: `Exported ${entries.length} Scope 1 entr${entries.length === 1 ? "y" : "ies"} as ${format.toUpperCase()}`,
    metadata: {
      format,
      filters: Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== ""),
      ),
      rowCount: entries.length,
    },
  });

  return exportResponse(dataset, format);
}
