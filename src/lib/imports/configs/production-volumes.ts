import "server-only";

import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { prisma } from "@/lib/prisma";

import type { CommitContext, CommitOutcome, ImportConfig, RowError } from "../types";

/**
 * Production Volume importer (Spec Amendment A2). Each row is one
 * monthly production-volume entry per (site × product). PEF gets
 * recomputed live on the dashboard from these rows.
 */

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().max(500).optional(),
);

const monthSchema = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const m = v.trim().match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : v.trim();
}, z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM."));

const prodRowSchema = z.object({
  productLabel: z.string().trim().min(1, "Product label is required").max(200),
  month: monthSchema,
  volume: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : v;
    },
    z.number().positive("Volume must be > 0"),
  ),
  unit: z.string().trim().min(1, "Unit is required").max(20),
  siteName: optionalStr,
  notes: optionalStr,
});
type ProdRow = z.infer<typeof prodRowSchema>;

async function commit(
  ctx: CommitContext,
  rows: ProdRow[],
): Promise<CommitOutcome> {
  const sites = await prisma.site.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    select: { id: true, name: true },
  });
  const sitesByName = new Map(sites.map((s) => [s.name.toLowerCase(), s]));

  const errors: RowError[] = [];
  let committed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const [year, month] = row.month.split("-").map(Number);
    const site = row.siteName ? sitesByName.get(row.siteName.toLowerCase()) : null;

    try {
      await prisma.productionVolume.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          siteId: site?.id ?? null,
          productLabel: row.productLabel,
          month: new Date(Date.UTC(year, month - 1, 1)),
          reportingYear: year,
          reportingMonth: month,
          volume: row.volume,
          unit: row.unit,
          notes: row.notes ?? null,
        },
      });
      committed++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Database write failed: ${err instanceof Error ? err.message : "unknown error"}`,
      });
    }
  }

  if (committed > 0) {
    await logActivity(ctx, {
      type: "RECORD_CREATED",
      module: "production",
      description: `Imported ${committed} production-volume row${committed === 1 ? "" : "s"} via CSV/XLSX`,
      metadata: { source: "import", count: committed, errorCount: errors.length },
    });
  }

  return { committed, errors };
}

export const productionImportConfig: ImportConfig<ProdRow> = {
  module: "production-volumes",
  label: "Production Volumes",
  description:
    "Import monthly production volumes per product / plant. The Production Emission Factor recomputes automatically on the dashboard.",
  fields: [
    { key: "productLabel", label: "Product label", required: true, type: "string", description: "e.g. \"Standard textile bolt\"." },
    { key: "month", label: "Month", required: true, type: "month" },
    { key: "volume", label: "Volume", required: true, type: "number" },
    { key: "unit", label: "Unit", required: true, type: "string", description: "Free-text: ton, piece, m³, m, etc." },
    { key: "siteName", label: "Site name", required: false, type: "string" },
    { key: "notes", label: "Notes", required: false, type: "string" },
  ],
  headerAliases: {
    productLabel: ["product", "product label", "productlabel", "name"],
    month: ["month", "period"],
    volume: ["volume", "quantity", "qty"],
    unit: ["unit"],
    siteName: ["site", "site name", "plant"],
    notes: ["notes", "comments"],
  },
  rowSchema: prodRowSchema,
  commit,
  redirectAfterCommit: "/carbon-footprint/production",
  templateCsv:
    "Product,Month,Volume,Unit,Site name,Notes\n" +
    "Standard textile bolt,2026-03,1250,m,Lisbon Plant,\n",
};
