// Filter contract for the Scope 1 (fuel) and Scope 2 (electricity) list
// pages. Reused by the page server components, the shared filter bar
// client component, and the export route handlers — single source of
// truth for what each query param means.

import type { Prisma } from "@/generated/prisma/client";

export type CarbonListSearchParams = {
  year?: string | null;
  site?: string | null;
  sourceType?: string | null;
  status?: string | null;
  /** Scope 3 only — Scope3Category enum value. */
  category?: string | null;
};

const VALID_SCOPE3_CATEGORY = [
  "PURCHASED_GOODS_SERVICES",
  "FUEL_ENERGY_RELATED",
  "UPSTREAM_TRANSPORT",
  "WASTE_GENERATED",
  "BUSINESS_TRAVEL",
  "EMPLOYEE_COMMUTING",
  "DOWNSTREAM_TRANSPORT",
] as const;

export const SCOPE3_CATEGORY_OPTIONS = [
  { value: "PURCHASED_GOODS_SERVICES", label: "Purchased goods" },
  { value: "FUEL_ENERGY_RELATED", label: "Fuel & energy" },
  { value: "UPSTREAM_TRANSPORT", label: "Upstream transport" },
  { value: "WASTE_GENERATED", label: "Waste generated" },
  { value: "BUSINESS_TRAVEL", label: "Business travel" },
  { value: "EMPLOYEE_COMMUTING", label: "Commuting" },
  { value: "DOWNSTREAM_TRANSPORT", label: "Downstream transport" },
] as const;

const VALID_STATUS = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

const VALID_SOURCE_TYPE = [
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

export const CARBON_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export const EMISSION_SOURCE_TYPE_OPTIONS = [
  { value: "STATIONARY_COMBUSTION", label: "Stationary combustion" },
  { value: "MOBILE_COMBUSTION", label: "Mobile combustion" },
  { value: "COMPANY_VEHICLES", label: "Company vehicles" },
  { value: "BOILERS", label: "Boilers" },
  { value: "GENERATORS", label: "Generators" },
  { value: "NATURAL_GAS_USE", label: "Natural gas use" },
  { value: "DIESEL_USE", label: "Diesel use" },
  { value: "LPG_USE", label: "LPG use" },
  { value: "GASOLINE_USE", label: "Gasoline use" },
  { value: "PROCESS_EMISSIONS", label: "Process emissions" },
  { value: "FUGITIVE_EMISSIONS", label: "Fugitive emissions" },
] as const;

function parsedYear(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 2000 && n <= 2100 ? n : undefined;
}

/**
 * Builds the where-clause for Scope 1 (fuel) entries — used by both the
 * list page query and the export route so the two stay symmetric.
 */
export function buildFuelEntryWhere(
  params: CarbonListSearchParams,
  companyId: string,
): Prisma.FuelEntryWhereInput {
  const where: Prisma.FuelEntryWhereInput = {
    companyId,
    deletedAt: null,
  };

  const year = parsedYear(params.year);
  if (year !== undefined) where.reportingYear = year;
  if (params.site) where.siteId = params.site;
  if (
    params.sourceType &&
    (VALID_SOURCE_TYPE as readonly string[]).includes(params.sourceType)
  ) {
    where.emissionSourceType = params.sourceType as (typeof VALID_SOURCE_TYPE)[number];
  }
  if (params.status && (VALID_STATUS as readonly string[]).includes(params.status)) {
    where.recordStatus = params.status as (typeof VALID_STATUS)[number];
  }

  return where;
}

/**
 * Builds the where-clause for Scope 2 (electricity) entries.
 */
export function buildElectricityEntryWhere(
  params: CarbonListSearchParams,
  companyId: string,
): Prisma.ElectricityEntryWhereInput {
  const where: Prisma.ElectricityEntryWhereInput = {
    companyId,
    deletedAt: null,
  };

  const year = parsedYear(params.year);
  if (year !== undefined) where.reportingYear = year;
  if (params.site) where.siteId = params.site;
  if (params.status && (VALID_STATUS as readonly string[]).includes(params.status)) {
    where.recordStatus = params.status as (typeof VALID_STATUS)[number];
  }

  return where;
}

/**
 * Builds the where-clause for Scope 3 entries. Adds `category` to the
 * shared filter set (Scope 3 has 7 categories — most material driver of
 * how users want to slice these records).
 */
export function buildScope3EntryWhere(
  params: CarbonListSearchParams,
  companyId: string,
): Prisma.Scope3EntryWhereInput {
  const where: Prisma.Scope3EntryWhereInput = {
    companyId,
    deletedAt: null,
  };

  const year = parsedYear(params.year);
  if (year !== undefined) where.reportingYear = year;
  if (params.site) where.siteId = params.site;
  if (
    params.status &&
    (VALID_STATUS as readonly string[]).includes(params.status)
  ) {
    where.recordStatus = params.status as (typeof VALID_STATUS)[number];
  }
  if (
    params.category &&
    (VALID_SCOPE3_CATEGORY as readonly string[]).includes(params.category)
  ) {
    where.category =
      params.category as (typeof VALID_SCOPE3_CATEGORY)[number];
  }

  return where;
}

/**
 * Human-readable summary of the active filters — used as the export
 * subtitle so an audit reader knows which slice the file represents.
 */
export function describeCarbonFilters(
  params: CarbonListSearchParams,
  lookups: { sites: ReadonlyArray<{ id: string; name: string }> },
): string | undefined {
  const parts: string[] = [];
  const year = parsedYear(params.year);
  if (year !== undefined) parts.push(`Year: ${year}`);
  if (params.site) {
    const m = lookups.sites.find((s) => s.id === params.site);
    parts.push(`Site: ${m?.name ?? params.site}`);
  }
  if (
    params.sourceType &&
    (VALID_SOURCE_TYPE as readonly string[]).includes(params.sourceType)
  ) {
    const label = EMISSION_SOURCE_TYPE_OPTIONS.find(
      (o) => o.value === params.sourceType,
    )?.label;
    parts.push(`Source: ${label ?? params.sourceType}`);
  }
  if (params.status && (VALID_STATUS as readonly string[]).includes(params.status)) {
    parts.push(`Status: ${params.status}`);
  }
  if (
    params.category &&
    (VALID_SCOPE3_CATEGORY as readonly string[]).includes(params.category)
  ) {
    const label = SCOPE3_CATEGORY_OPTIONS.find(
      (o) => o.value === params.category,
    )?.label;
    parts.push(`Category: ${label ?? params.category}`);
  }
  return parts.length ? `Filters — ${parts.join(" · ")}` : undefined;
}

/**
 * Pulls the factor source label out of the frozen factorSnapshot JSON,
 * falling back to the joined EmissionFactor.source if no snapshot exists
 * (legacy rows from before factorSnapshot was wired).
 */
export function factorSourceFromSnapshot(
  snapshot: unknown,
  fallback: string | null,
): string | null {
  if (snapshot && typeof snapshot === "object" && "source" in snapshot) {
    const src = (snapshot as { source?: unknown }).source;
    if (typeof src === "string" && src.length > 0) return src;
  }
  return fallback;
}

/** Years to offer in the filter dropdown — current ± 4 + an 'All' option. */
export function carbonYearOptions(now = new Date()): number[] {
  const y = now.getUTCFullYear();
  return [y, y - 1, y - 2, y - 3, y - 4];
}
