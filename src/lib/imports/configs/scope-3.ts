import "server-only";

import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { prisma } from "@/lib/prisma";

import type { CommitContext, CommitOutcome, ImportConfig, RowError } from "../types";

/**
 * Scope 3 importer — generic-payload only for MVP.
 *
 * Scope 3 is polymorphic (7 categories with different field shapes —
 * see scope3.schema.ts). Forcing all 7 into one CSV would either lose
 * fidelity or explode column count. So the importer accepts the
 * shared core (category, description, month, kgCo2eOverride) and
 * stores any extra per-category fields as freeform under
 * `categoryData.extra`. Customers wanting full freight-mode /
 * business-travel imports can do so via the form for now; a follow-up
 * sprint can add per-category importers.
 */

const SCOPE3_CATEGORIES = [
  "PURCHASED_GOODS_SERVICES",
  "FUEL_ENERGY_RELATED",
  "UPSTREAM_TRANSPORT",
  "WASTE_GENERATED",
  "BUSINESS_TRAVEL",
  "EMPLOYEE_COMMUTING",
  "DOWNSTREAM_TRANSPORT",
] as const;

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().max(2000).optional(),
);

const monthSchema = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const m = v.trim().match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : v.trim();
}, z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM."));

const scope3RowSchema = z.object({
  category: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase().replace(/[\s-]+/g, "_") : v),
    z.enum(SCOPE3_CATEGORIES),
  ),
  description: z.string().trim().min(1, "Description is required").max(200),
  month: monthSchema,
  amount: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : v;
    },
    z.number().positive().optional(),
  ),
  unit: optionalStr,
  kgCo2e: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : v;
    },
    z.number().nonnegative("kgCO₂e must be ≥ 0"),
  ),
  siteName: optionalStr,
  notes: optionalStr,
});
type Scope3Row = z.infer<typeof scope3RowSchema>;

async function commit(
  ctx: CommitContext,
  rows: Scope3Row[],
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
      await prisma.scope3Entry.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          siteId: site?.id ?? null,
          category: row.category,
          description: row.description,
          month: new Date(Date.UTC(year, month - 1, 1)),
          reportingYear: year,
          reportingMonth: month,
          kgCo2e: row.kgCo2e,
          // Generic payload shape — preserves per-category data the
          // user provided in the import without forcing a schema.
          categoryData: {
            amount: row.amount,
            unit: row.unit ?? null,
            kgCo2eOverride: row.kgCo2e,
          } as object,
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
      module: "scope-3",
      description: `Imported ${committed} Scope 3 entr${committed === 1 ? "y" : "ies"} via CSV/XLSX`,
      metadata: { source: "import", count: committed, errorCount: errors.length },
    });
  }

  return { committed, errors };
}

export const scope3ImportConfig: ImportConfig<Scope3Row> = {
  module: "scope-3",
  label: "Scope 3 (Value Chain)",
  description:
    "Import Scope 3 value-chain entries. The importer accepts the shared core fields; per-category granular imports come in a later sprint.",
  fields: [
    { key: "category", label: "Category", required: true, type: "enum", enum: SCOPE3_CATEGORIES },
    { key: "description", label: "Description", required: true, type: "string" },
    { key: "month", label: "Month", required: true, type: "month" },
    { key: "kgCo2e", label: "kgCO₂e", required: true, type: "number", description: "Pre-computed emissions for the row." },
    { key: "amount", label: "Activity amount", required: false, type: "number" },
    { key: "unit", label: "Activity unit", required: false, type: "string" },
    { key: "siteName", label: "Site name", required: false, type: "string" },
    { key: "notes", label: "Notes", required: false, type: "string" },
  ],
  headerAliases: {
    category: ["category", "scope 3 category", "scope3category"],
    description: ["description", "title", "name"],
    month: ["month", "period"],
    kgCo2e: ["kgco2e", "kg co2e", "emissions", "co2e"],
    amount: ["amount", "quantity", "qty"],
    unit: ["unit"],
    siteName: ["site", "site name", "plant", "business unit"],
    notes: ["notes", "comments"],
  },
  rowSchema: scope3RowSchema,
  commit,
  redirectAfterCommit: "/carbon-footprint/value-chain",
  templateCsv:
    "Category,Description,Month,kgCO2e,Amount,Unit,Site name,Notes\n" +
    "BUSINESS_TRAVEL,Lisbon → Madrid round-trip,2026-03,180,1,trip,,\n",
};
