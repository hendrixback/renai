// Shared enum <-> label maps for WasteFlow fields. Kept in one place so the
// filter bar, table, and form all stay in sync.

import type { Prisma } from "@/generated/prisma/client";

export type WasteFlowListSearchParams = {
  q?: string | null;
  category?: string | null;
  status?: string | null;
  site?: string | null;
  hazardous?: string | null;
  priority?: string | null;
  frequency?: string | null;
  treatment?: string | null;
  code?: string | null;
};

const VALID_STATUS = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
const VALID_FREQUENCY = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "ONE_OFF",
  "CONTINUOUS",
] as const;
const VALID_TREATMENT = [
  "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "R13",
  "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14", "D15",
] as const;

/**
 * Builds the Prisma where-clause used by both the list page and the
 * export route so filters stay symmetric.
 */
export function buildWasteFlowsWhere(
  params: WasteFlowListSearchParams,
  companyId: string,
): Prisma.WasteFlowWhereInput {
  const where: Prisma.WasteFlowWhereInput = { companyId };

  if (params.category) {
    where.category = { slug: params.category };
  }
  if (params.status && (VALID_STATUS as readonly string[]).includes(params.status)) {
    where.status = params.status as (typeof VALID_STATUS)[number];
  }
  if (params.site) {
    where.siteId = params.site;
  }
  if (params.hazardous === "true") {
    where.isHazardous = true;
  }
  if (params.priority === "true") {
    where.isPriority = true;
  }
  if (
    params.frequency &&
    (VALID_FREQUENCY as readonly string[]).includes(params.frequency)
  ) {
    where.frequency = params.frequency as (typeof VALID_FREQUENCY)[number];
  }
  if (
    params.treatment &&
    (VALID_TREATMENT as readonly string[]).includes(params.treatment)
  ) {
    where.treatmentCode = params.treatment as (typeof VALID_TREATMENT)[number];
  }
  if (params.code) {
    const code = params.code.trim();
    if (code.length > 0) {
      where.wasteCode = {
        is: { displayCode: { contains: code, mode: "insensitive" } },
      };
    }
  }
  if (params.q) {
    const q = params.q.trim();
    if (q.length > 0) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { materialComposition: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  return where;
}

/**
 * Describes the filter set, useful as export subtitle so an audit reader
 * knows which data slice a given file corresponds to.
 */
export function describeWasteFlowFilters(
  params: WasteFlowListSearchParams,
  lookups: {
    categories: ReadonlyArray<{ slug: string; name: string }>;
    sites: ReadonlyArray<{ id: string; name: string }>;
  },
): string | undefined {
  const parts: string[] = [];
  if (params.q) parts.push(`Search: "${params.q.trim()}"`);
  if (params.category) {
    const match = lookups.categories.find((c) => c.slug === params.category);
    parts.push(`Category: ${match?.name ?? params.category}`);
  }
  if (params.status && (VALID_STATUS as readonly string[]).includes(params.status)) {
    parts.push(`Status: ${params.status}`);
  }
  if (params.site) {
    const match = lookups.sites.find((s) => s.id === params.site);
    parts.push(`Site: ${match?.name ?? params.site}`);
  }
  if (params.hazardous === "true") parts.push("Hazardous only");
  if (params.priority === "true") parts.push("Priority only");
  if (params.frequency && (VALID_FREQUENCY as readonly string[]).includes(params.frequency)) {
    parts.push(`Frequency: ${params.frequency}`);
  }
  if (params.treatment && (VALID_TREATMENT as readonly string[]).includes(params.treatment)) {
    parts.push(`Treatment: ${params.treatment}`);
  }
  if (params.code) parts.push(`LoW code contains: "${params.code.trim()}"`);
  return parts.length ? `Filters — ${parts.join(" · ")}` : undefined;
}

export const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export const UNIT_OPTIONS = [
  { value: "KG", label: "kg" },
  { value: "TON", label: "ton" },
  { value: "LITER", label: "liter" },
  { value: "CUBIC_METER", label: "m³" },
  { value: "UNIT", label: "unit" },
  { value: "PIECE", label: "piece" },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "ONE_OFF", label: "One-off" },
  { value: "CONTINUOUS", label: "Continuous" },
] as const;

export const TREATMENT_OPTIONS = [
  { value: "R1", label: "R1 — Energy recovery" },
  { value: "R2", label: "R2 — Solvent reclamation" },
  { value: "R3", label: "R3 — Recycling organics" },
  { value: "R4", label: "R4 — Recycling metals" },
  { value: "R5", label: "R5 — Recycling inorganics" },
  { value: "R6", label: "R6 — Regeneration of acids/bases" },
  { value: "R7", label: "R7 — Pollution abatement recovery" },
  { value: "R8", label: "R8 — Recovery from catalysts" },
  { value: "R9", label: "R9 — Oil re-refining" },
  { value: "R10", label: "R10 — Land treatment (agri)" },
  { value: "R11", label: "R11 — Use of residual wastes" },
  { value: "R12", label: "R12 — Waste exchange for R1–R11" },
  { value: "R13", label: "R13 — Storage pending recovery" },
  { value: "D1", label: "D1 — Landfill" },
  { value: "D2", label: "D2 — Land treatment" },
  { value: "D3", label: "D3 — Deep injection" },
  { value: "D4", label: "D4 — Surface impoundment" },
  { value: "D5", label: "D5 — Engineered landfill" },
  { value: "D6", label: "D6 — Release to water body" },
  { value: "D7", label: "D7 — Release to sea" },
  { value: "D8", label: "D8 — Biological treatment" },
  { value: "D9", label: "D9 — Physico-chemical treatment" },
  { value: "D10", label: "D10 — Incineration on land" },
  { value: "D11", label: "D11 — Incineration at sea" },
  { value: "D12", label: "D12 — Permanent storage" },
  { value: "D13", label: "D13 — Blending prior to D1–D12" },
  { value: "D14", label: "D14 — Repackaging prior to D1–D13" },
  { value: "D15", label: "D15 — Storage pending disposal" },
] as const;

// UI hint: which LoW chapter(s) a given category tends to map to. Used to
// pre-filter the LoW code combobox when the user picks a category.
export const CATEGORY_CHAPTERS: Record<string, string[]> = {
  packaging: ["15"],
  "paper-cardboard": ["03", "15", "20"],
  plastic: ["07", "12", "15", "17", "20"],
  metal: ["12", "16", "17", "19", "20"],
  glass: ["15", "17", "19", "20"],
  wood: ["03", "15", "17", "20"],
  organic: ["02", "19", "20"],
  "construction-demolition": ["17"],
  textile: ["04", "15", "19", "20"],
  weee: ["16", "20"],
  "oil-hydrocarbon": ["13", "19"],
  "hazardous-chemical": ["06", "07", "08", "14", "16", "18"],
  healthcare: ["18"],
  "mineral-extractive": ["01", "10"],
  "municipal-mixed": ["19", "20"],
};

// LoW chapter labels (for grouping in the combobox).
export const CHAPTER_LABELS: Record<string, string> = {
  "01": "01 — Mining & mineral processing",
  "02": "02 — Agriculture, food, forestry",
  "03": "03 — Wood, pulp, paper",
  "04": "04 — Leather, fur, textile",
  "05": "05 — Petroleum refining",
  "06": "06 — Inorganic chemicals",
  "07": "07 — Organic chemicals",
  "08": "08 — Coatings, adhesives, inks",
  "09": "09 — Photographic industry",
  "10": "10 — Thermal processes",
  "11": "11 — Metal surface treatment",
  "12": "12 — Shaping of metals & plastics",
  "13": "13 — Oil wastes",
  "14": "14 — Organic solvents",
  "15": "15 — Packaging, absorbents, rags",
  "16": "16 — Not otherwise specified (WEEE, ELV, batteries)",
  "17": "17 — Construction & demolition",
  "18": "18 — Healthcare",
  "19": "19 — Waste management facilities",
  "20": "20 — Municipal wastes",
};
