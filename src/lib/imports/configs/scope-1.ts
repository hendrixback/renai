import "server-only";

import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { computeFuelEmission } from "@/lib/carbon";
import { prisma } from "@/lib/prisma";

import type { CommitContext, CommitOutcome, ImportConfig, RowError } from "../types";

/**
 * Scope 1 (Fuel) importer. Each row becomes a FuelEntry. Reuses
 * computeFuelEmission so the imported rows get the same factor
 * resolution + kgCO₂e calc as form-entered rows.
 *
 * "Site name" is resolved against the company's existing sites by
 * exact (case-insensitive) name — unknown sites fall back to
 * `locationName`.
 */

const FUEL_TYPES = [
  "diesel",
  "petrol",
  "natural_gas",
  "natural_gas_kwh",
  "lpg",
  "heating_oil",
  "coal",
  "biodiesel",
  "wood_pellets",
] as const;

const UNITS = ["L", "m3", "kg", "kWh"] as const;

const REGIONS = ["PT", "ES", "FR", "DE", "UK", "US", "EU", "GLOBAL"] as const;

const SOURCE_TYPES = [
  "STATIONARY_COMBUSTION",
  "MOBILE_COMBUSTION",
  "COMPANY_VEHICLES",
  "BOILERS",
  "GENERATORS",
  "NATURAL_GAS_USE",
  "DIESEL_USE",
  "LPG_USE",
  "GASOLINE_USE",
  "PROCESS_EMISSIONS",
  "FUGITIVE_EMISSIONS",
] as const;

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().max(500).optional(),
);

const monthSchema = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  // Accept "YYYY-MM", "YYYY-MM-DD", or any ISO datetime (Excel often
  // returns full ISO strings for date cells).
  const m = trimmed.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  return trimmed;
}, z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM (e.g. 2026-03)."));

const fuelRowSchema = z.object({
  title: z.string().trim().min(1, "Entry title is required").max(200),
  fuelType: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(FUEL_TYPES),
  ),
  quantity: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : v;
    },
    z.number().positive("Quantity must be > 0"),
  ),
  unit: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.enum(UNITS),
  ),
  month: monthSchema,
  emissionSourceType: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase().replace(/[\s-]+/g, "_") : undefined),
    z.enum(SOURCE_TYPES).optional(),
  ),
  region: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : "GLOBAL"),
    z.enum(REGIONS).default("GLOBAL"),
  ),
  sourceReference: optionalStr,
  siteName: optionalStr,
  locationName: optionalStr,
  notes: optionalStr,
});
type FuelRow = z.infer<typeof fuelRowSchema>;

async function commit(
  ctx: CommitContext,
  rows: FuelRow[],
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
      const emission = await computeFuelEmission({
        fuelType: row.fuelType,
        quantity: row.quantity,
        unit: row.unit,
        companyId: ctx.company.id,
        region: row.region,
      });

      const site = row.siteName ? sitesByName.get(row.siteName.toLowerCase()) : null;

      await prisma.fuelEntry.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          siteId: site?.id ?? null,
          title: row.title,
          sourceReference: row.sourceReference ?? null,
          fuelType: row.fuelType,
          emissionSourceType: row.emissionSourceType ?? null,
          unit: row.unit,
          quantity: row.quantity,
          month: new Date(Date.UTC(year, month - 1, 1)),
          reportingYear: year,
          reportingMonth: month,
          locationName: row.locationName ?? null,
          emissionFactorId: emission.factorId,
          kgCo2e: emission.kgCo2e,
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
      module: "scope-1",
      description: `Imported ${committed} Scope 1 entr${committed === 1 ? "y" : "ies"} via CSV/XLSX`,
      metadata: { source: "import", count: committed, errorCount: errors.length },
    });
  }

  return { committed, errors };
}

export const scope1ImportConfig: ImportConfig<FuelRow> = {
  module: "scope-1",
  label: "Scope 1 (Fuel)",
  description:
    "Import Scope 1 fuel-combustion entries. Emissions are computed automatically using the same factor table as the form.",
  fields: [
    { key: "title", label: "Entry title", required: true, type: "string" },
    { key: "fuelType", label: "Fuel type", required: true, type: "enum", enum: FUEL_TYPES },
    { key: "quantity", label: "Quantity", required: true, type: "number" },
    { key: "unit", label: "Unit", required: true, type: "enum", enum: UNITS },
    { key: "month", label: "Month", required: true, type: "month", description: "YYYY-MM (e.g. 2026-03)." },
    { key: "emissionSourceType", label: "Source type", required: false, type: "enum", enum: SOURCE_TYPES },
    { key: "region", label: "Region", required: false, type: "enum", enum: REGIONS },
    { key: "sourceReference", label: "Source reference", required: false, type: "string" },
    { key: "siteName", label: "Site name", required: false, type: "string" },
    { key: "locationName", label: "Location name", required: false, type: "string" },
    { key: "notes", label: "Notes", required: false, type: "string" },
  ],
  headerAliases: {
    title: ["title", "entry title", "name"],
    fuelType: ["fuel type", "fueltype", "fuel"],
    quantity: ["quantity", "qty", "amount"],
    unit: ["unit"],
    month: ["month", "period", "reporting period"],
    emissionSourceType: ["source type", "emission source type", "emissionsourcetype"],
    region: ["region", "factor region"],
    sourceReference: ["source reference", "sourcereference", "invoice", "reference"],
    siteName: ["site", "site name", "plant", "plant name"],
    locationName: ["location", "location name"],
    notes: ["notes", "comments"],
  },
  rowSchema: fuelRowSchema,
  commit,
  redirectAfterCommit: "/carbon-footprint/fuel",
  templateCsv:
    "Title,Fuel type,Quantity,Unit,Month,Region,Source type,Site name,Source reference,Notes\n" +
    "Lisbon Plant — Diesel — Mar 2026,diesel,1250.5,L,2026-03,PT,STATIONARY_COMBUSTION,Lisbon Plant,INV-2026-0312,\n",
};
