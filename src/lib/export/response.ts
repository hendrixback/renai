import "server-only";

import { renderCsv } from "./csv";
import { renderPdf } from "./pdf";
import { renderXlsx } from "./xlsx";
import type { ExportDataset, ExportFormat } from "./types";

const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const EXTENSION: Record<ExportFormat, string> = {
  csv: "csv",
  xlsx: "xlsx",
  pdf: "pdf",
};

function buildFilename<Row>(dataset: ExportDataset<Row>, format: ExportFormat): string {
  const slug = dataset.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "export";
  const stamp = dataset.generatedAt.toISOString().slice(0, 10);
  return `${slug}-${stamp}.${EXTENSION[format]}`;
}

/**
 * Render the dataset in the requested format and wrap it in a Response
 * with download headers. Caller is a Next.js route handler.
 */
export async function exportResponse<Row>(
  dataset: ExportDataset<Row>,
  format: ExportFormat,
): Promise<Response> {
  let body: Buffer;
  if (format === "csv") body = renderCsv(dataset);
  else if (format === "xlsx") body = await renderXlsx(dataset);
  else body = await renderPdf(dataset);

  const headers = new Headers();
  headers.set("Content-Type", CONTENT_TYPE[format]);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${buildFilename(dataset, format)}"`,
  );
  headers.set("Content-Length", String(body.byteLength));
  headers.set("Cache-Control", "private, no-store");

  return new Response(new Uint8Array(body), { status: 200, headers });
}
