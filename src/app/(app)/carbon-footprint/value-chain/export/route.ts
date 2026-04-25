import "server-only";

import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/auth";
import {
  buildScope3EntryWhere,
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

function jsonProp(data: unknown, key: string): unknown {
  if (data && typeof data === "object" && key in data) {
    return (data as Record<string, unknown>)[key];
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const qs = request.nextUrl.searchParams;
  const format = parseExportFormat(qs.get("format"));

  const params: CarbonListSearchParams = {
    year: qs.get("year"),
    site: qs.get("site"),
    status: qs.get("status"),
    category: qs.get("category"),
  };

  const where = buildScope3EntryWhere(params, ctx.company.id);

  const [entries, sites] = await Promise.all([
    prisma.scope3Entry.findMany({
      where,
      orderBy: { month: "desc" },
      select: {
        id: true,
        category: true,
        description: true,
        categoryData: true,
        month: true,
        kgCo2e: true,
        factorSnapshot: true,
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
    { key: "month", header: "Month", width: 10, type: "date", value: (r) => r.month },
    { key: "category", header: "Category", width: 22, value: (r) => r.category },
    { key: "description", header: "Description", width: 26, value: (r) => r.description },
    {
      key: "mode",
      header: "Mode / Activity",
      width: 18,
      // Surfaces the most-recognisable per-category sub-field for an audit
      // reader. BUSINESS_TRAVEL has `mode`; generic categories use `unit`.
      value: (r) =>
        (jsonProp(r.categoryData, "mode") as string | undefined) ??
        (jsonProp(r.categoryData, "unit") as string | undefined) ??
        null,
    },
    {
      key: "amount",
      header: "Activity",
      width: 14,
      type: "number",
      align: "right",
      value: (r) => {
        const distance = jsonProp(r.categoryData, "distanceKm");
        if (typeof distance === "number") {
          const passengers = jsonProp(r.categoryData, "passengers");
          return typeof passengers === "number" && passengers !== 1
            ? distance * passengers
            : distance;
        }
        const nights = jsonProp(r.categoryData, "nights");
        if (typeof nights === "number") return nights;
        const amount = jsonProp(r.categoryData, "amount");
        if (typeof amount === "number") return amount;
        return null;
      },
    },
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
      value: (r) =>
        factorSourceFromSnapshot(r.factorSnapshot, r.emissionFactor?.source ?? null),
    },
    { key: "site", header: "Site", width: 16, value: (r) => r.site?.name ?? null },
    { key: "notes", header: "Notes", width: 24, value: (r) => r.notes },
    { key: "status", header: "Status", width: 10, value: (r) => r.recordStatus },
  ];

  const dataset: ExportDataset<Row> = {
    title: "Scope 3 — Value chain",
    subtitle: describeCarbonFilters(params, { sites }),
    generatedAt: new Date(),
    companyName: ctx.company.name,
    rows: entries,
    columns,
  };

  await logActivity(ctx, {
    type: "RECORD_EXPORTED",
    module: "scope-3",
    description: `Exported ${entries.length} Scope 3 entr${entries.length === 1 ? "y" : "ies"} as ${format.toUpperCase()}`,
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
