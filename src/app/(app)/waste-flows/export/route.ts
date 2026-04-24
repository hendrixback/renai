import "server-only";

import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/auth";
import {
  buildWasteFlowsWhere,
  describeWasteFlowFilters,
  type WasteFlowListSearchParams,
} from "@/lib/waste-flows";
import {
  exportResponse,
  parseExportFormat,
  type ExportColumn,
  type ExportDataset,
} from "@/lib/export";
import { logActivity } from "@/lib/activity/log-activity";

// pdfkit / exceljs rely on Node APIs.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await getCurrentContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const qs = request.nextUrl.searchParams;
  const format = parseExportFormat(qs.get("format"));

  const params: WasteFlowListSearchParams = {
    q: qs.get("q"),
    category: qs.get("category"),
    status: qs.get("status"),
    site: qs.get("site"),
    hazardous: qs.get("hazardous"),
    priority: qs.get("priority"),
  };

  const where = buildWasteFlowsWhere(params, ctx.company.id);

  const [flows, categories, sites] = await Promise.all([
    prisma.wasteFlow.findMany({
      where,
      orderBy: [{ isPriority: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        estimatedQuantity: true,
        quantityUnit: true,
        frequency: true,
        treatmentCode: true,
        isHazardous: true,
        isPriority: true,
        locationName: true,
        internalCode: true,
        createdAt: true,
        category: { select: { name: true } },
        wasteCode: { select: { displayCode: true } },
        site: { select: { name: true } },
      },
    }),
    prisma.wasteCategory.findMany({ select: { slug: true, name: true } }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id },
      select: { id: true, name: true },
    }),
  ]);

  type Row = (typeof flows)[number];
  const columns: ExportColumn<Row>[] = [
    { key: "name", header: "Name", width: 26, value: (r) => r.name },
    { key: "category", header: "Category", width: 18, value: (r) => r.category?.name ?? null },
    { key: "wasteCode", header: "LoW Code", width: 10, value: (r) => r.wasteCode?.displayCode ?? null },
    { key: "site", header: "Site", width: 16, value: (r) => r.site?.name ?? null },
    { key: "location", header: "Location", width: 16, value: (r) => r.locationName },
    { key: "internalCode", header: "Internal Code", width: 12, value: (r) => r.internalCode },
    {
      key: "quantity",
      header: "Est. Quantity",
      width: 13,
      type: "number",
      align: "right",
      value: (r) => (r.estimatedQuantity ? Number(r.estimatedQuantity) : null),
    },
    { key: "unit", header: "Unit", width: 8, value: (r) => r.quantityUnit },
    { key: "frequency", header: "Frequency", width: 12, value: (r) => r.frequency },
    { key: "treatment", header: "Treatment", width: 10, value: (r) => r.treatmentCode },
    { key: "hazardous", header: "Hazardous", width: 10, type: "boolean", value: (r) => r.isHazardous },
    { key: "priority", header: "Priority", width: 10, type: "boolean", value: (r) => r.isPriority },
    { key: "status", header: "Status", width: 10, value: (r) => r.status },
    { key: "createdAt", header: "Created", width: 12, type: "date", value: (r) => r.createdAt },
  ];

  const dataset: ExportDataset<Row> = {
    title: "Waste Flows",
    subtitle: describeWasteFlowFilters(params, { categories, sites }),
    generatedAt: new Date(),
    companyName: ctx.company.name,
    rows: flows,
    columns,
  };

  await logActivity(ctx, {
    type: "RECORD_EXPORTED",
    module: "waste-flows",
    description: `Exported ${flows.length} waste flow${flows.length === 1 ? "" : "s"} as ${format.toUpperCase()}`,
    metadata: {
      format,
      filters: Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== ""),
      ),
      rowCount: flows.length,
    },
  });

  return exportResponse(dataset, format);
}
