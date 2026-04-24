import "server-only";

import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/auth";
import {
  exportResponse,
  parseExportFormat,
  type ExportColumn,
  type ExportDataset,
} from "@/lib/export";
import { logActivity } from "@/lib/activity/log-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function factorSource(snapshot: unknown, fallback: string | null): string | null {
  if (snapshot && typeof snapshot === "object" && "source" in snapshot) {
    const src = (snapshot as { source?: unknown }).source;
    if (typeof src === "string" && src.length > 0) return src;
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const qs = request.nextUrl.searchParams;
  const format = parseExportFormat(qs.get("format"));

  const entries = await prisma.electricityEntry.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    orderBy: { month: "desc" },
    select: {
      id: true,
      kwh: true,
      month: true,
      renewablePercent: true,
      energyProvider: true,
      locationBasedKgCo2e: true,
      marketBasedKgCo2e: true,
      kgCo2e: true,
      factorSnapshot: true,
      locationName: true,
      notes: true,
      recordStatus: true,
      site: { select: { name: true } },
      emissionFactor: { select: { source: true } },
    },
  });

  type Row = (typeof entries)[number];
  const columns: ExportColumn<Row>[] = [
    { key: "month", header: "Month", width: 10, type: "date", value: (r) => r.month },
    {
      key: "kwh",
      header: "kWh",
      width: 12,
      type: "number",
      align: "right",
      value: (r) => Number(r.kwh),
    },
    {
      key: "renewablePct",
      header: "Renewable %",
      width: 12,
      type: "number",
      align: "right",
      value: (r) => (r.renewablePercent ? Number(r.renewablePercent) : null),
    },
    { key: "provider", header: "Provider", width: 18, value: (r) => r.energyProvider },
    {
      key: "locCo2e",
      header: "Location-based kg CO₂e",
      width: 18,
      type: "number",
      align: "right",
      value: (r) => (r.locationBasedKgCo2e ? Number(r.locationBasedKgCo2e) : null),
    },
    {
      key: "mktCo2e",
      header: "Market-based kg CO₂e",
      width: 18,
      type: "number",
      align: "right",
      // Legacy rows written before migration 0004 only have `kgCo2e` — fall
      // back so historical data still shows in exports.
      value: (r) =>
        r.marketBasedKgCo2e
          ? Number(r.marketBasedKgCo2e)
          : r.kgCo2e
            ? Number(r.kgCo2e)
            : null,
    },
    {
      key: "factorSource",
      header: "Factor Source",
      width: 18,
      value: (r) => factorSource(r.factorSnapshot, r.emissionFactor?.source ?? null),
    },
    { key: "site", header: "Site", width: 16, value: (r) => r.site?.name ?? null },
    { key: "location", header: "Location", width: 16, value: (r) => r.locationName },
    { key: "notes", header: "Notes", width: 24, value: (r) => r.notes },
    { key: "status", header: "Status", width: 10, value: (r) => r.recordStatus },
  ];

  const dataset: ExportDataset<Row> = {
    title: "Scope 2 — Electricity",
    generatedAt: new Date(),
    companyName: ctx.company.name,
    rows: entries,
    columns,
  };

  await logActivity(ctx, {
    type: "RECORD_EXPORTED",
    module: "scope-2",
    description: `Exported ${entries.length} Scope 2 entr${entries.length === 1 ? "y" : "ies"} as ${format.toUpperCase()}`,
    metadata: { format, rowCount: entries.length },
  });

  return exportResponse(dataset, format);
}
