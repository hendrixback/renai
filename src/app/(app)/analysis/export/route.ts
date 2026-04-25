import "server-only";

import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/auth";
import { getAnalysisData } from "@/lib/analysis";
import {
  parseAnalysisFilters,
  describeAnalysisFilters,
} from "@/lib/analysis-filters";
import {
  exportResponse,
  parseExportFormat,
  type ExportColumn,
  type ExportDataset,
} from "@/lib/export";
import { logActivity } from "@/lib/activity/log-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Row = {
  monthIndex: number;
  monthLabel: string;
  s1: number;
  s2: number;
  s3: number;
  waste: number;
  total: number;
  priorTotal: number | null;
};

export async function GET(request: NextRequest) {
  const ctx = await getCurrentContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const qs = request.nextUrl.searchParams;
  const format = parseExportFormat(qs.get("format"));

  const filters = parseAnalysisFilters({
    year: qs.get("year"),
    site: qs.get("site"),
    scopes: qs.get("scopes"),
    yoy: qs.get("yoy"),
  });

  const [data, sites] = await Promise.all([
    getAnalysisData(ctx.company.id, filters),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Convert kgCO₂e → tCO₂e in the output. Audit-friendly: file size stays
  // small (12 rows + a totals row) and matches the units shown in the UI.
  const rows: Row[] = data.monthly.map((m, i) => ({
    monthIndex: i + 1,
    monthLabel: MONTH_LABELS[i],
    s1: m.s1 / 1000,
    s2: m.s2 / 1000,
    s3: m.s3 / 1000,
    waste: m.waste / 1000,
    total: m.total / 1000,
    priorTotal:
      filters.yoy && data.monthlyPrior
        ? data.monthlyPrior[i].total / 1000
        : null,
  }));

  rows.push({
    monthIndex: 13,
    monthLabel: "Total",
    s1: data.current.s1 / 1000,
    s2: data.current.s2 / 1000,
    s3: data.current.s3 / 1000,
    waste: data.current.waste / 1000,
    total: data.current.total / 1000,
    priorTotal:
      filters.yoy && data.prior ? data.prior.total / 1000 : null,
  });

  const columns: ExportColumn<Row>[] = [
    {
      key: "month",
      header: "Month",
      width: 14,
      value: (r) => r.monthLabel,
    },
    {
      key: "s1",
      header: "Scope 1 (tCO₂e)",
      width: 14,
      type: "number",
      align: "right",
      value: (r) => r.s1,
    },
    {
      key: "s2",
      header: "Scope 2 (tCO₂e)",
      width: 14,
      type: "number",
      align: "right",
      value: (r) => r.s2,
    },
    {
      key: "s3",
      header: "Scope 3 (tCO₂e)",
      width: 14,
      type: "number",
      align: "right",
      value: (r) => r.s3,
    },
    {
      key: "waste",
      header: "Waste (tCO₂e)",
      width: 14,
      type: "number",
      align: "right",
      value: (r) => r.waste,
    },
    {
      key: "total",
      header: "Total (tCO₂e)",
      width: 14,
      type: "number",
      align: "right",
      value: (r) => r.total,
    },
  ];

  if (filters.yoy) {
    columns.push({
      key: "priorTotal",
      header: `Prior ${filters.priorYear} (tCO₂e)`,
      width: 18,
      type: "number",
      align: "right",
      value: (r) => r.priorTotal,
    });
  }

  const dataset: ExportDataset<Row> = {
    title: `Analysis ${filters.year}`,
    subtitle: describeAnalysisFilters(filters, { sites }),
    generatedAt: new Date(),
    companyName: ctx.company.name,
    rows,
    columns,
  };

  await logActivity(ctx, {
    type: "RECORD_EXPORTED",
    module: "analysis",
    description: `Exported analysis view (${filters.year}) as ${format.toUpperCase()}`,
    metadata: {
      format,
      year: filters.year,
      siteId: filters.siteId ?? null,
      scopes: Array.from(filters.scopes),
      yoy: filters.yoy,
    },
  });

  return exportResponse(dataset, format);
}
