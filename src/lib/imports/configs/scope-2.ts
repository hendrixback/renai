import "server-only";

import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { computeElectricityEmission } from "@/lib/carbon";
import { prisma } from "@/lib/prisma";

import type { CommitContext, CommitOutcome, ImportConfig, RowError } from "../types";

/**
 * Scope 2 (Electricity) importer. Each row becomes an ElectricityEntry.
 * Reuses computeElectricityEmission so the dual location-based +
 * market-based calc (Spec §11 + Amendment A4) runs the same as the
 * form path.
 */

const REGIONS = ["PT", "ES", "FR", "DE", "UK", "US", "EU", "GLOBAL"] as const;

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().max(500).optional(),
);

const monthSchema = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const m = v.trim().match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : v.trim();
}, z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM (e.g. 2026-03)."));

const elecRowSchema = z.object({
  kwh: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : v;
    },
    z.number().positive("kWh must be > 0"),
  ),
  month: monthSchema,
  region: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : "EU"),
    z.enum(REGIONS).default("EU"),
  ),
  renewablePercent: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(",", ".").replace("%", ""));
      return Number.isFinite(n) ? n : v;
    },
    z.number().min(0).max(100).optional(),
  ),
  energyProvider: optionalStr,
  siteName: optionalStr,
  locationName: optionalStr,
  notes: optionalStr,
});
type ElecRow = z.infer<typeof elecRowSchema>;

async function commit(
  ctx: CommitContext,
  rows: ElecRow[],
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

    try {
      const emission = await computeElectricityEmission({
        kwh: row.kwh,
        renewablePercent: row.renewablePercent ?? null,
        companyId: ctx.company.id,
        region: row.region,
      });
      const site = row.siteName ? sitesByName.get(row.siteName.toLowerCase()) : null;

      await prisma.electricityEntry.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          siteId: site?.id ?? null,
          kwh: row.kwh,
          month: new Date(Date.UTC(year, month - 1, 1)),
          reportingYear: year,
          reportingMonth: month,
          renewablePercent: row.renewablePercent ?? null,
          energyProvider: row.energyProvider ?? null,
          locationName: row.locationName ?? null,
          emissionFactorId: emission.factorId,
          locationBasedKgCo2e: emission.locationBasedKgCo2e,
          marketBasedKgCo2e: emission.marketBasedKgCo2e,
          kgCo2e: emission.marketBasedKgCo2e, // legacy column mirrors market-based
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
      module: "scope-2",
      description: `Imported ${committed} Scope 2 entr${committed === 1 ? "y" : "ies"} via CSV/XLSX`,
      metadata: { source: "import", count: committed, errorCount: errors.length },
    });
  }

  return { committed, errors };
}

export const scope2ImportConfig: ImportConfig<ElecRow> = {
  module: "scope-2",
  label: "Scope 2 (Electricity)",
  description:
    "Import Scope 2 electricity-consumption entries. Both location-based and market-based emissions are calculated per Spec §11.4.",
  fields: [
    { key: "kwh", label: "Quantity (kWh)", required: true, type: "number" },
    { key: "month", label: "Month", required: true, type: "month", description: "YYYY-MM." },
    { key: "region", label: "Grid region", required: false, type: "enum", enum: REGIONS },
    { key: "renewablePercent", label: "% Renewable", required: false, type: "number", description: "0–100." },
    { key: "energyProvider", label: "Energy provider", required: false, type: "string" },
    { key: "siteName", label: "Site name", required: false, type: "string" },
    { key: "locationName", label: "Location name", required: false, type: "string" },
    { key: "notes", label: "Notes", required: false, type: "string" },
  ],
  headerAliases: {
    kwh: ["kwh", "quantity", "consumption", "energy"],
    month: ["month", "period"],
    region: ["region", "grid region", "grid"],
    renewablePercent: ["% renewable", "renewable", "renewable %", "renewablepercent"],
    energyProvider: ["provider", "energy provider", "supplier"],
    siteName: ["site", "site name", "plant"],
    locationName: ["location", "location name"],
    notes: ["notes", "comments"],
  },
  rowSchema: elecRowSchema,
  commit,
  redirectAfterCommit: "/carbon-footprint/electricity",
  templateCsv:
    "kWh,Month,Region,% Renewable,Provider,Site name,Notes\n" +
    "12500,2026-03,PT,30,EDP Comercial,Lisbon Plant,\n",
};
