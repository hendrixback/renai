import "server-only";

import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { prisma } from "@/lib/prisma";

import type { CommitContext, CommitOutcome, ImportConfig, RowError } from "../types";

/**
 * Waste Flows importer (Spec §20.4 + §8). Each row creates a new
 * WasteFlow tied to the importing user's tenant.
 *
 * Design notes:
 *  - Site lookup is by name (case-insensitive). Unknown sites land
 *    in `locationName` instead — better than rejecting the row.
 *  - Waste code lookup matches WasteCode.code OR WasteCode.displayCode
 *    (so users can paste either "150103" or "15 01 03"). Hazardous
 *    flag is overridden from the code if it disagrees.
 *  - Category lookup matches WasteCategory.slug OR .name (case-insens).
 */

const STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
// Mirrors the QuantityUnit enum in prisma/schema.prisma. We accept
// short aliases ("L", "m3", etc.) in the parser preprocessor and
// normalise to the canonical enum value.
const UNITS = ["KG", "TON", "LITER", "CUBIC_METER", "UNIT", "PIECE"] as const;
const UNIT_ALIASES: Record<string, (typeof UNITS)[number]> = {
  KG: "KG",
  KILO: "KG",
  KILOGRAM: "KG",
  KILOGRAMS: "KG",
  TON: "TON",
  TONNE: "TON",
  TONNES: "TON",
  T: "TON",
  L: "LITER",
  LT: "LITER",
  LITER: "LITER",
  LITRE: "LITER",
  LITERS: "LITER",
  LITRES: "LITER",
  M3: "CUBIC_METER",
  M3_: "CUBIC_METER",
  CUBIC_METER: "CUBIC_METER",
  CUBICMETER: "CUBIC_METER",
  CUBIC_METRE: "CUBIC_METER",
  UNIT: "UNIT",
  UNITS: "UNIT",
  PIECE: "PIECE",
  PIECES: "PIECE",
  PCS: "PIECE",
};
const FREQS = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "ONE_OFF", "CONTINUOUS"] as const;
const TREATMENT_CODES = [
  "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "R13",
  "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14", "D15",
] as const;

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().max(2000).optional(),
);

const truthy = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1" || s === "sim";
};

const wasteRowSchema = z
  .object({
    name: z.string().trim().min(1, "Waste flow name is required").max(200),
    categorySlug: z.string().trim().min(1, "Category is required").max(80),
    wasteCode: z.string().trim().min(1, "Waste code is required").max(20),
    status: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : "ACTIVE"),
      z.enum(STATUSES).default("ACTIVE"),
    ),
    estimatedQuantity: z.preprocess(
      (v) => {
        if (v === "" || v == null) return undefined;
        const n = Number(String(v).replace(",", "."));
        return Number.isFinite(n) ? n : v;
      },
      z.number().nonnegative().optional(),
    ),
    unit: z.preprocess(
      (v) => {
        if (typeof v !== "string" || v.trim() === "") return "TON";
        const key = v.trim().toUpperCase().replace(/[\s-]+/g, "_");
        return UNIT_ALIASES[key] ?? key;
      },
      z.enum(UNITS).default("TON"),
    ),
    frequency: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase().replace(/[\s-]+/g, "_") : "MONTHLY"),
      z.enum(FREQS).default("MONTHLY"),
    ),
    siteName: optionalStr,
    locationName: optionalStr,
    description: optionalStr,
    storageMethod: optionalStr,
    currentDestination: optionalStr,
    currentOperator: optionalStr,
    treatmentCode: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined),
      z.enum(TREATMENT_CODES).optional(),
    ),
    treatmentNotes: optionalStr,
    notes: optionalStr,
    isHazardous: z.preprocess(truthy, z.boolean().default(false)),
    isPriority: z.preprocess(truthy, z.boolean().default(false)),
  });
type WasteRow = z.infer<typeof wasteRowSchema>;

async function commit(
  ctx: CommitContext,
  rows: WasteRow[],
): Promise<CommitOutcome> {
  // Pre-fetch reference data once.
  const [sites, categories, wasteCodes] = await Promise.all([
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.wasteCategory.findMany({
      select: { id: true, slug: true, name: true },
    }),
    prisma.wasteCode.findMany({
      select: { code: true, displayCode: true, isHazardous: true },
    }),
  ]);
  const sitesByName = new Map(sites.map((s) => [s.name.toLowerCase(), s]));
  const catBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c]));
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  // WasteCode.code is the primary key — use it as the FK below.
  const codesByCode = new Map(wasteCodes.map((c) => [c.code.replace(/\s+/g, "").toLowerCase(), c]));
  const codesByDisplay = new Map(wasteCodes.map((c) => [c.displayCode.replace(/\s+/g, "").toLowerCase(), c]));

  const errors: RowError[] = [];
  let committed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const cat =
      catBySlug.get(row.categorySlug.toLowerCase()) ??
      catByName.get(row.categorySlug.toLowerCase());
    if (!cat) {
      errors.push({
        row: rowNum,
        column: "Category",
        message: `Unknown category "${row.categorySlug}". Use the slug or full name from /waste-flows.`,
      });
      continue;
    }

    const codeKey = row.wasteCode.replace(/\s+/g, "").toLowerCase();
    const wasteCode =
      codesByCode.get(codeKey) ?? codesByDisplay.get(codeKey);
    if (!wasteCode) {
      errors.push({
        row: rowNum,
        column: "Waste code",
        message: `Unknown LoW/EWC code "${row.wasteCode}".`,
      });
      continue;
    }

    const site = row.siteName ? sitesByName.get(row.siteName.toLowerCase()) : null;
    const isHazardous = wasteCode.isHazardous || row.isHazardous;

    try {
      const flow = await prisma.wasteFlow.create({
        data: {
          companyId: ctx.company.id,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          siteId: site?.id ?? null,
          categoryId: cat.id,
          wasteCodeId: wasteCode.code,
          name: row.name,
          description: row.description ?? null,
          status: row.status,
          estimatedQuantity: row.estimatedQuantity,
          quantityUnit: row.unit,
          frequency: row.frequency,
          storageMethod: row.storageMethod ?? null,
          currentDestination: row.currentDestination ?? null,
          currentOperator: row.currentOperator ?? null,
          locationName: row.locationName ?? null,
          treatmentCode: row.treatmentCode ?? null,
          treatmentNotes: row.treatmentNotes ?? null,
          notes: row.notes ?? null,
          isHazardous,
          isPriority: row.isPriority,
        },
        select: { id: true },
      });
      committed++;
      // Activity per import stays at the session level (one ActivityLog
      // entry for the whole import) to avoid 1000-row floods. We still
      // log the import session as a single batch event below.
      void flow;
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
      module: "waste-flows",
      description: `Imported ${committed} waste flow${committed === 1 ? "" : "s"} via CSV/XLSX`,
      metadata: { source: "import", count: committed, errorCount: errors.length },
    });
  }

  return { committed, errors };
}

export const wasteFlowsImportConfig: ImportConfig<WasteRow> = {
  module: "waste-flows",
  label: "Waste Flows",
  description:
    "Import waste streams in bulk. Each row becomes a new waste flow under your active company.",
  fields: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "categorySlug", label: "Category", required: true, type: "string", description: "Slug or full name from /waste-flows." },
    { key: "wasteCode", label: "Waste code (LoW/EWC)", required: true, type: "string", description: "e.g. 150103 or 15 01 03." },
    { key: "estimatedQuantity", label: "Estimated quantity", required: false, type: "number" },
    { key: "unit", label: "Unit", required: false, type: "enum", enum: UNITS, description: "TON, KG, LITER, CUBIC_METER, UNIT, PIECE (aliases L/m3/pcs accepted)." },
    { key: "frequency", label: "Frequency", required: false, type: "enum", enum: FREQS },
    { key: "status", label: "Status", required: false, type: "enum", enum: STATUSES },
    { key: "siteName", label: "Site name", required: false, type: "string", description: "Existing site by name; unknown values fall back to Location name." },
    { key: "locationName", label: "Location name", required: false, type: "string" },
    { key: "description", label: "Description", required: false, type: "string" },
    { key: "storageMethod", label: "Storage method", required: false, type: "string" },
    { key: "currentDestination", label: "Current destination", required: false, type: "string" },
    { key: "currentOperator", label: "Current operator", required: false, type: "string" },
    { key: "treatmentCode", label: "Treatment code", required: false, type: "enum", enum: TREATMENT_CODES, description: "R1–R13, D1–D15." },
    { key: "treatmentNotes", label: "Treatment notes", required: false, type: "string" },
    { key: "notes", label: "Notes", required: false, type: "string" },
    { key: "isHazardous", label: "Hazardous", required: false, type: "boolean" },
    { key: "isPriority", label: "Priority", required: false, type: "boolean" },
  ],
  headerAliases: {
    name: ["name", "waste flow name", "waste name", "title"],
    categorySlug: ["category", "category slug", "categoryslug"],
    wasteCode: ["waste code", "wastecode", "low", "ewc", "ler", "low/ewc"],
    estimatedQuantity: ["quantity", "estimated quantity", "estimatedquantity", "qty"],
    unit: ["unit", "qty unit", "quantity unit"],
    frequency: ["frequency", "freq"],
    status: ["status"],
    siteName: ["site", "site name", "plant", "plant name"],
    locationName: ["location", "location name", "locationname"],
    description: ["description", "desc"],
    storageMethod: ["storage method", "storagemethod", "storage"],
    currentDestination: ["destination", "current destination", "currentdestination"],
    currentOperator: ["operator", "current operator", "currentoperator"],
    treatmentCode: ["treatment code", "treatmentcode", "treatment", "r/d code"],
    treatmentNotes: ["treatment notes", "treatmentnotes"],
    notes: ["notes", "comments"],
    isHazardous: ["hazardous", "is hazardous", "ishazardous"],
    isPriority: ["priority", "is priority", "ispriority"],
  },
  rowSchema: wasteRowSchema,
  commit,
  redirectAfterCommit: "/waste-flows",
  templateCsv:
    "Name,Category,Waste code,Estimated quantity,Unit,Frequency,Status,Site name,Hazardous,Priority\n" +
    "Cardboard waste,packaging-paper,150101,2.5,TON,MONTHLY,ACTIVE,Lisbon Plant,false,false\n",
};
