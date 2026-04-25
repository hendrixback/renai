import "server-only";

import { prisma } from "@/lib/prisma";
import { computeWasteImpact } from "@/lib/carbon";
import type { AnalysisFilters, AnalysisScope } from "@/lib/analysis-filters";

// Spec §14, Phase 4b. Aggregations for the Analysis page.
// Unit convention: emissions are stored as kgCO₂e in the database; this
// module returns kgCO₂e everywhere and lets the UI divide by 1000 for
// the tCO₂e display. Keeps math precise across stacked charts.

const RECOVERY_CODES = new Set([
  "R1","R2","R3","R4","R5","R6","R7","R8","R9","R10","R11","R12","R13",
]);
const DISPOSAL_CODES = new Set([
  "D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15",
]);

const FREQ_TO_MONTHLY: Record<string, number> = {
  DAILY: 30,
  WEEKLY: 4.3333,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
  ONE_OFF: 1,
  CONTINUOUS: 1,
};
const UNIT_TO_TON: Record<string, number> = { KG: 0.001, TON: 1 };

const SCOPE3_LABELS: Record<string, string> = {
  PURCHASED_GOODS_SERVICES: "Purchased goods",
  FUEL_ENERGY_RELATED: "Fuel & energy",
  UPSTREAM_TRANSPORT: "Upstream transport",
  WASTE_GENERATED: "Waste generated",
  BUSINESS_TRAVEL: "Business travel",
  EMPLOYEE_COMMUTING: "Commuting",
  DOWNSTREAM_TRANSPORT: "Downstream transport",
};

export type MonthlyEmissionsRow = {
  month: number; // 1..12
  s1: number;
  s2: number;
  s3: number;
  waste: number;
  total: number;
};

export type ScopeBreakdown = {
  scope: AnalysisScope;
  label: string;
  kgCo2e: number;
};

export type SiteBreakdown = {
  siteId: string | null;
  name: string;
  s1: number;
  s2: number;
  s3: number;
  waste: number;
  total: number;
};

export type LabeledBreakdown = {
  key: string;
  label: string;
  value: number;
};

export type TopSourceRow = {
  scope: AnalysisScope;
  scopeLabel: string;
  description: string;
  kgCo2e: number;
  siteName: string | null;
  month: Date;
};

export type DataQuality = {
  totalRecords: number;
  recordsMissingFactor: number;
  wasteFlowsMissingCode: number;
  wasteFlowsMissingTreatment: number;
  wasteFlowsHazardousNoCode: number;
  scope1MissingSourceType: number;
};

export type WasteSummary = {
  totalFlows: number;
  monthlyTons: number;
  hazardousCount: number;
  nonHazardousCount: number;
  recoveryCount: number;
  disposalCount: number;
  untreatedCount: number;
};

export type AnalysisYearTotals = {
  year: number;
  s1: number;
  s2: number;
  s3: number;
  waste: number;
  total: number;
  s1EntryCount: number;
  s2EntryCount: number;
  s3EntryCount: number;
};

export type AnalysisResult = {
  current: AnalysisYearTotals;
  prior: AnalysisYearTotals | null;
  monthly: MonthlyEmissionsRow[];
  monthlyPrior: MonthlyEmissionsRow[] | null;
  byScope: ScopeBreakdown[];
  bySite: SiteBreakdown[];
  byFuel: LabeledBreakdown[];
  byScope3Category: LabeledBreakdown[];
  wasteByCategory: LabeledBreakdown[];
  wasteSummary: WasteSummary;
  topSources: TopSourceRow[];
  dataQuality: DataQuality;
};

function emptyMonthlyTable(): MonthlyEmissionsRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    s1: 0,
    s2: 0,
    s3: 0,
    waste: 0,
    total: 0,
  }));
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v && "toString" in v) {
    const n = Number((v as { toString(): string }).toString());
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function loadYearAggregations(
  companyId: string,
  year: number,
  siteId: string | undefined,
  scopes: ReadonlySet<AnalysisScope>,
) {
  const wantS1 = scopes.has("s1");
  const wantS2 = scopes.has("s2");
  const wantS3 = scopes.has("s3");
  const wantWaste = scopes.has("waste");

  const baseWhere = {
    companyId,
    deletedAt: null,
    reportingYear: year,
    ...(siteId ? { siteId } : {}),
  };

  const [fuel, electricity, scope3, wasteRows] = await Promise.all([
    wantS1
      ? prisma.fuelEntry.findMany({
          where: baseWhere,
          select: {
            id: true,
            fuelType: true,
            emissionSourceType: true,
            kgCo2e: true,
            reportingMonth: true,
            month: true,
            siteId: true,
            site: { select: { name: true } },
            emissionFactorId: true,
            notes: true,
          },
        })
      : Promise.resolve([]),
    wantS2
      ? prisma.electricityEntry.findMany({
          where: baseWhere,
          select: {
            id: true,
            kgCo2e: true,
            marketBasedKgCo2e: true,
            reportingMonth: true,
            month: true,
            siteId: true,
            site: { select: { name: true } },
            energyProvider: true,
            emissionFactorId: true,
          },
        })
      : Promise.resolve([]),
    wantS3
      ? prisma.scope3Entry.findMany({
          where: baseWhere,
          select: {
            id: true,
            category: true,
            description: true,
            kgCo2e: true,
            reportingMonth: true,
            month: true,
            siteId: true,
            site: { select: { name: true } },
            emissionFactorId: true,
          },
        })
      : Promise.resolve([]),
    wantWaste
      ? computeWasteImpact(companyId, { year, siteId })
      : Promise.resolve([]),
  ]);

  return { fuel, electricity, scope3, wasteRows };
}

async function loadWasteFlowsForYear(
  companyId: string,
  year: number,
  siteId: string | undefined,
) {
  return prisma.wasteFlow.findMany({
    where: {
      companyId,
      deletedAt: null,
      reportingYear: year,
      ...(siteId ? { siteId } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      estimatedQuantity: true,
      quantityUnit: true,
      frequency: true,
      isHazardous: true,
      treatmentCode: true,
      wasteCodeId: true,
      siteId: true,
      site: { select: { name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
}

function aggregateYear(args: {
  year: number;
  fuel: Array<{
    kgCo2e: unknown;
    reportingMonth: number | null;
    month: Date;
    siteId: string | null;
    fuelType: string;
    site: { name: string } | null;
    emissionFactorId: string | null;
    emissionSourceType: string | null;
    description?: string;
    notes: string | null;
    id: string;
  }>;
  electricity: Array<{
    kgCo2e: unknown;
    marketBasedKgCo2e: unknown;
    reportingMonth: number | null;
    month: Date;
    siteId: string | null;
    site: { name: string } | null;
    energyProvider: string | null;
    emissionFactorId: string | null;
    id: string;
  }>;
  scope3: Array<{
    kgCo2e: unknown;
    reportingMonth: number | null;
    month: Date;
    siteId: string | null;
    site: { name: string } | null;
    category: string;
    description: string;
    emissionFactorId: string | null;
    id: string;
  }>;
  wasteRows: Array<{
    id: string;
    name: string;
    currentKgCo2e: number | null;
  }>;
}): {
  totals: AnalysisYearTotals;
  monthly: MonthlyEmissionsRow[];
  byFuel: LabeledBreakdown[];
  byScope3Category: LabeledBreakdown[];
} {
  const monthly = emptyMonthlyTable();
  const byFuel = new Map<string, number>();
  const byScope3Category = new Map<string, number>();

  let s1 = 0;
  let s2 = 0;
  let s3 = 0;

  for (const f of args.fuel) {
    const v = num(f.kgCo2e);
    s1 += v;
    const m = f.reportingMonth ?? f.month.getUTCMonth() + 1;
    if (m >= 1 && m <= 12) monthly[m - 1].s1 += v;
    byFuel.set(f.fuelType, (byFuel.get(f.fuelType) ?? 0) + v);
  }
  for (const e of args.electricity) {
    // Prefer market-based for analysis (matches GHG Protocol reporting
    // when contractual instruments are claimed). Falls back to legacy
    // single kgCo2e for rows written before the dual-value migration.
    const v = num(e.marketBasedKgCo2e ?? e.kgCo2e);
    s2 += v;
    const m = e.reportingMonth ?? e.month.getUTCMonth() + 1;
    if (m >= 1 && m <= 12) monthly[m - 1].s2 += v;
  }
  for (const x of args.scope3) {
    const v = num(x.kgCo2e);
    s3 += v;
    const m = x.reportingMonth ?? x.month.getUTCMonth() + 1;
    if (m >= 1 && m <= 12) monthly[m - 1].s3 += v;
    byScope3Category.set(
      x.category,
      (byScope3Category.get(x.category) ?? 0) + v,
    );
  }

  // Waste impact is annual (no per-month split available), so allocate
  // to month 12 of the reporting year for the trend chart. Better than
  // dropping it entirely and matches how many sustainability reports
  // present it (annualised line).
  let wasteTotal = 0;
  for (const w of args.wasteRows) {
    if (w.currentKgCo2e !== null) wasteTotal += w.currentKgCo2e;
  }
  // Spread waste evenly across 12 months — gives a flat horizontal
  // band on the trend chart, which is more honest than spiking one
  // month and matches "annualised" framing.
  const wastePerMonth = wasteTotal / 12;
  for (const row of monthly) row.waste = wastePerMonth;
  for (const row of monthly) row.total = row.s1 + row.s2 + row.s3 + row.waste;

  return {
    totals: {
      year: args.year,
      s1,
      s2,
      s3,
      waste: wasteTotal,
      total: s1 + s2 + s3 + wasteTotal,
      s1EntryCount: args.fuel.length,
      s2EntryCount: args.electricity.length,
      s3EntryCount: args.scope3.length,
    },
    monthly,
    byFuel: Array.from(byFuel.entries())
      .map(([key, value]) => ({
        key,
        label: humanizeFuelType(key),
        value,
      }))
      .sort((a, b) => b.value - a.value),
    byScope3Category: Array.from(byScope3Category.entries())
      .map(([key, value]) => ({
        key,
        label: SCOPE3_LABELS[key] ?? key,
        value,
      }))
      .sort((a, b) => b.value - a.value),
  };
}

function humanizeFuelType(t: string): string {
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getAnalysisData(
  companyId: string,
  filters: AnalysisFilters,
): Promise<AnalysisResult> {
  const { year, priorYear, siteId, scopes, yoy } = filters;

  const [current, prior, currentWasteFlows] = await Promise.all([
    loadYearAggregations(companyId, year, siteId, scopes),
    yoy
      ? loadYearAggregations(companyId, priorYear, siteId, scopes)
      : Promise.resolve(null),
    scopes.has("waste")
      ? loadWasteFlowsForYear(companyId, year, siteId)
      : Promise.resolve([]),
  ]);

  const aggCurrent = aggregateYear({ year, ...current });
  const aggPrior = prior
    ? aggregateYear({ year: priorYear, ...prior })
    : null;

  // ── By-scope breakdown (current year, donut/bar)
  const byScope: ScopeBreakdown[] = [];
  if (scopes.has("s1"))
    byScope.push({ scope: "s1", label: "Scope 1", kgCo2e: aggCurrent.totals.s1 });
  if (scopes.has("s2"))
    byScope.push({ scope: "s2", label: "Scope 2", kgCo2e: aggCurrent.totals.s2 });
  if (scopes.has("s3"))
    byScope.push({ scope: "s3", label: "Scope 3", kgCo2e: aggCurrent.totals.s3 });
  if (scopes.has("waste"))
    byScope.push({
      scope: "waste",
      label: "Waste impact",
      kgCo2e: aggCurrent.totals.waste,
    });

  // ── By-site breakdown (current year)
  const siteMap = new Map<string, SiteBreakdown>();
  function bumpSite(
    siteId: string | null,
    siteName: string | null,
    key: "s1" | "s2" | "s3" | "waste",
    value: number,
  ) {
    const id = siteId ?? "__unassigned__";
    const existing = siteMap.get(id) ?? {
      siteId,
      name: siteName ?? "Unassigned",
      s1: 0,
      s2: 0,
      s3: 0,
      waste: 0,
      total: 0,
    };
    existing[key] += value;
    existing.total += value;
    siteMap.set(id, existing);
  }
  for (const f of current.fuel) {
    bumpSite(f.siteId ?? null, f.site?.name ?? null, "s1", num(f.kgCo2e));
  }
  for (const e of current.electricity) {
    bumpSite(
      e.siteId ?? null,
      e.site?.name ?? null,
      "s2",
      num(e.marketBasedKgCo2e ?? e.kgCo2e),
    );
  }
  for (const x of current.scope3) {
    bumpSite(x.siteId ?? null, x.site?.name ?? null, "s3", num(x.kgCo2e));
  }
  // Waste impact rows don't carry siteId, so they go to the unassigned
  // bucket. Honest: we don't have per-site waste impact resolution today.
  if (scopes.has("waste") && aggCurrent.totals.waste > 0) {
    bumpSite(null, null, "waste", aggCurrent.totals.waste);
  }
  const bySite = Array.from(siteMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // ── Top sources table (current year, all scopes shown)
  type CombinedSource = TopSourceRow;
  const sources: CombinedSource[] = [];
  for (const f of current.fuel) {
    sources.push({
      scope: "s1",
      scopeLabel: "Scope 1",
      description: `${humanizeFuelType(f.fuelType)}${f.notes ? ` — ${f.notes}` : ""}`,
      kgCo2e: num(f.kgCo2e),
      siteName: f.site?.name ?? null,
      month: f.month,
    });
  }
  for (const e of current.electricity) {
    sources.push({
      scope: "s2",
      scopeLabel: "Scope 2",
      description: `Electricity${e.energyProvider ? ` — ${e.energyProvider}` : ""}`,
      kgCo2e: num(e.marketBasedKgCo2e ?? e.kgCo2e),
      siteName: e.site?.name ?? null,
      month: e.month,
    });
  }
  for (const x of current.scope3) {
    sources.push({
      scope: "s3",
      scopeLabel: "Scope 3",
      description: `${SCOPE3_LABELS[x.category] ?? x.category}: ${x.description}`,
      kgCo2e: num(x.kgCo2e),
      siteName: x.site?.name ?? null,
      month: x.month,
    });
  }
  const topSources = sources
    .filter((s) => s.kgCo2e > 0)
    .sort((a, b) => b.kgCo2e - a.kgCo2e)
    .slice(0, 10);

  // ── Waste-side breakdowns
  const wasteByCategoryMap = new Map<string, number>();
  let wasteHazardousCount = 0;
  let wasteNonHazardousCount = 0;
  let wasteRecoveryCount = 0;
  let wasteDisposalCount = 0;
  let wasteUntreatedCount = 0;
  let monthlyTons = 0;
  let wasteFlowsMissingCode = 0;
  let wasteFlowsMissingTreatment = 0;
  let wasteFlowsHazardousNoCode = 0;
  for (const flow of currentWasteFlows) {
    const cat = flow.category?.name ?? "Uncategorized";
    const unitMul = UNIT_TO_TON[flow.quantityUnit];
    if (unitMul !== undefined) {
      const qty = flow.estimatedQuantity ? Number(flow.estimatedQuantity) : 0;
      const freqMul = FREQ_TO_MONTHLY[flow.frequency] ?? 1;
      const tons = qty * unitMul * freqMul;
      monthlyTons += tons;
      wasteByCategoryMap.set(
        cat,
        (wasteByCategoryMap.get(cat) ?? 0) + tons,
      );
    } else if (!wasteByCategoryMap.has(cat)) {
      wasteByCategoryMap.set(cat, 0);
    }
    if (flow.isHazardous) wasteHazardousCount++;
    else wasteNonHazardousCount++;
    if (!flow.treatmentCode) wasteUntreatedCount++;
    else if (RECOVERY_CODES.has(flow.treatmentCode)) wasteRecoveryCount++;
    else if (DISPOSAL_CODES.has(flow.treatmentCode)) wasteDisposalCount++;
    if (!flow.wasteCodeId) wasteFlowsMissingCode++;
    if (!flow.treatmentCode) wasteFlowsMissingTreatment++;
    if (flow.isHazardous && !flow.treatmentCode) wasteFlowsHazardousNoCode++;
  }
  const wasteByCategory: LabeledBreakdown[] = Array.from(
    wasteByCategoryMap.entries(),
  )
    .map(([label, value]) => ({ key: label, label, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  // ── Data quality across the year
  const recordsMissingFactor =
    current.fuel.filter((f) => !f.emissionFactorId).length +
    current.electricity.filter((e) => !e.emissionFactorId).length +
    current.scope3.filter((x) => !x.emissionFactorId).length;
  const scope1MissingSourceType = current.fuel.filter(
    (f) => !f.emissionSourceType,
  ).length;

  const dataQuality: DataQuality = {
    totalRecords:
      current.fuel.length +
      current.electricity.length +
      current.scope3.length +
      currentWasteFlows.length,
    recordsMissingFactor,
    wasteFlowsMissingCode,
    wasteFlowsMissingTreatment,
    wasteFlowsHazardousNoCode,
    scope1MissingSourceType,
  };

  const wasteSummary: WasteSummary = {
    totalFlows: currentWasteFlows.length,
    monthlyTons,
    hazardousCount: wasteHazardousCount,
    nonHazardousCount: wasteNonHazardousCount,
    recoveryCount: wasteRecoveryCount,
    disposalCount: wasteDisposalCount,
    untreatedCount: wasteUntreatedCount,
  };

  return {
    current: aggCurrent.totals,
    prior: aggPrior?.totals ?? null,
    monthly: aggCurrent.monthly,
    monthlyPrior: aggPrior?.monthly ?? null,
    byScope,
    bySite,
    byFuel: aggCurrent.byFuel,
    byScope3Category: aggCurrent.byScope3Category,
    wasteByCategory,
    wasteSummary,
    topSources,
    dataQuality,
  };
}
