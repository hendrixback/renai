import "server-only";

import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/auth";
import { documentTypeSchema } from "@/lib/schemas/document.schema";
import {
  exportResponse,
  parseExportFormat,
  type ExportColumn,
  type ExportDataset,
} from "@/lib/export";
import { logActivity } from "@/lib/activity/log-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPeriod(year: number | null, month: number | null): string | null {
  if (year == null) return null;
  if (month == null) return String(year);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const qs = request.nextUrl.searchParams;
  const format = parseExportFormat(qs.get("format"));

  const q = qs.get("q")?.trim();
  const typeParsed = qs.get("type")
    ? documentTypeSchema.safeParse(qs.get("type"))
    : null;
  const plant = qs.get("plant");
  const yearRaw = qs.get("year");
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;

  const filters: Record<string, unknown> = {};
  if (q) filters.q = q;
  if (typeParsed?.success) filters.type = typeParsed.data;
  if (plant) filters.plant = plant;
  if (year && Number.isFinite(year)) filters.year = year;

  const documents = await prisma.document.findMany({
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      ...(typeParsed?.success ? { documentType: typeParsed.data } : {}),
      ...(plant ? { plantId: plant } : {}),
      ...(year && Number.isFinite(year) ? { reportingYear: year } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { originalFilename: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      originalFilename: true,
      documentType: true,
      description: true,
      tags: true,
      department: true,
      reportingYear: true,
      reportingMonth: true,
      size: true,
      version: true,
      createdAt: true,
      recordStatus: true,
      plant: { select: { name: true } },
      uploadedBy: { select: { name: true, email: true } },
    },
  });

  type Row = (typeof documents)[number];
  const columns: ExportColumn<Row>[] = [
    { key: "title", header: "Title", width: 26, value: (r) => r.title ?? r.originalFilename },
    { key: "filename", header: "Filename", width: 24, value: (r) => r.originalFilename },
    { key: "type", header: "Type", width: 14, value: (r) => r.documentType },
    { key: "tags", header: "Tags", width: 18, value: (r) => (r.tags.length ? r.tags.join(", ") : null) },
    { key: "department", header: "Department", width: 14, value: (r) => r.department },
    {
      key: "period",
      header: "Period",
      width: 10,
      value: (r) => formatPeriod(r.reportingYear, r.reportingMonth),
    },
    { key: "plant", header: "Plant / Site", width: 16, value: (r) => r.plant?.name ?? null },
    {
      key: "uploader",
      header: "Uploader",
      width: 20,
      value: (r) => r.uploadedBy?.name ?? r.uploadedBy?.email ?? null,
    },
    { key: "size", header: "Size", width: 10, align: "right", value: (r) => formatSize(r.size) },
    {
      key: "version",
      header: "Version",
      width: 8,
      type: "number",
      align: "right",
      value: (r) => r.version,
    },
    { key: "uploaded", header: "Uploaded", width: 12, type: "date", value: (r) => r.createdAt },
    { key: "status", header: "Status", width: 10, value: (r) => r.recordStatus },
  ];

  const dataset: ExportDataset<Row> = {
    title: "Documentation",
    subtitle: Object.keys(filters).length
      ? `Filters — ${Object.entries(filters)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ")}`
      : undefined,
    generatedAt: new Date(),
    companyName: ctx.company.name,
    rows: documents,
    columns,
  };

  await logActivity(ctx, {
    type: "RECORD_EXPORTED",
    module: "documentation",
    description: `Exported ${documents.length} document${documents.length === 1 ? "" : "s"} (metadata) as ${format.toUpperCase()}`,
    metadata: { format, filters, rowCount: documents.length },
  });

  return exportResponse(dataset, format);
}
