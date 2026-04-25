import "server-only";

import { getCarbonSummary } from "@/lib/carbon";
import { prisma } from "@/lib/prisma";

export type ScopeMask = {
  s1: boolean;
  s2: boolean;
  s3: boolean;
};

export type PefResult = {
  /** Total kgCO₂e from the selected scopes for the period × site. */
  numeratorKg: number;
  /** Sum of ProductionVolume.volume for the period × site. */
  denominatorVolume: number;
  /** Unit of the denominator. Empty string when no rows. */
  denominatorUnit: string;
  /** PEF in kgCO₂e per `denominatorUnit`. Null when denominator is 0 or
   *  multiple incompatible units exist. */
  pef: number | null;
  /** Per-scope breakdown of the numerator. */
  byScope: { s1: number; s2: number; s3: number };
  /** Number of ProductionVolume rows aggregated. */
  rowCount: number;
  /** When multiple units coexist in the period, the per-unit volumes —
   *  surfaces the data-quality issue rather than silently summing apples
   *  + oranges. */
  unitMix: Record<string, number>;
};

const ZERO: PefResult = {
  numeratorKg: 0,
  denominatorVolume: 0,
  denominatorUnit: "",
  pef: null,
  byScope: { s1: 0, s2: 0, s3: 0 },
  rowCount: 0,
  unitMix: {},
};

/**
 * Computes the Production Emission Factor (PEF) for a (companyId, year,
 * scopes, site?) slice. Per Amendment A2 the factor is never persisted —
 * always recomputed from live Scope 1/2/3 totals + the corresponding
 * ProductionVolume rows so a late-landing emission entry can never make
 * a saved PEF stale.
 */
export async function computePef(opts: {
  companyId: string;
  year: number;
  scopes: ScopeMask;
  siteId?: string;
}): Promise<PefResult> {
  const [carbon, volumes] = await Promise.all([
    getCarbonSummary(opts.companyId, {
      year: opts.year,
      siteId: opts.siteId,
    }),
    prisma.productionVolume.findMany({
      where: {
        companyId: opts.companyId,
        deletedAt: null,
        recordStatus: "ACTIVE",
        reportingYear: opts.year,
        ...(opts.siteId ? { siteId: opts.siteId } : {}),
      },
      select: { volume: true, unit: true },
    }),
  ]);

  const numeratorKg =
    (opts.scopes.s1 ? carbon.scope1 : 0) +
    (opts.scopes.s2 ? carbon.scope2 : 0) +
    (opts.scopes.s3 ? carbon.scope3 : 0);

  const unitMix: Record<string, number> = {};
  let totalVolume = 0;
  for (const v of volumes) {
    const n = Number(v.volume);
    totalVolume += n;
    unitMix[v.unit] = (unitMix[v.unit] ?? 0) + n;
  }

  const distinctUnits = Object.keys(unitMix);

  if (volumes.length === 0 || distinctUnits.length === 0) {
    return {
      ...ZERO,
      numeratorKg,
      byScope: {
        s1: opts.scopes.s1 ? carbon.scope1 : 0,
        s2: opts.scopes.s2 ? carbon.scope2 : 0,
        s3: opts.scopes.s3 ? carbon.scope3 : 0,
      },
    };
  }

  // When multiple units exist for the same period we refuse to compute a
  // PEF — summing tonnes + pieces is meaningless. The UI surfaces the
  // unitMix so the operator can fix the data.
  if (distinctUnits.length > 1) {
    return {
      numeratorKg,
      denominatorVolume: totalVolume,
      denominatorUnit: distinctUnits.join(" + "),
      pef: null,
      byScope: {
        s1: opts.scopes.s1 ? carbon.scope1 : 0,
        s2: opts.scopes.s2 ? carbon.scope2 : 0,
        s3: opts.scopes.s3 ? carbon.scope3 : 0,
      },
      rowCount: volumes.length,
      unitMix,
    };
  }

  const unit = distinctUnits[0];
  const denominator = unitMix[unit];

  return {
    numeratorKg,
    denominatorVolume: denominator,
    denominatorUnit: unit,
    pef: denominator > 0 ? numeratorKg / denominator : null,
    byScope: {
      s1: opts.scopes.s1 ? carbon.scope1 : 0,
      s2: opts.scopes.s2 ? carbon.scope2 : 0,
      s3: opts.scopes.s3 ? carbon.scope3 : 0,
    },
    rowCount: volumes.length,
    unitMix,
  };
}
