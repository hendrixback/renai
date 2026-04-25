import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  BusinessTravelData,
  EmployeeCommutingData,
  FreightData,
  Scope3CategoryValue,
} from "@/lib/schemas/scope3.schema";

/**
 * Resolves the emission factor for a Scope 3 entry and returns the
 * computed kgCO₂e + a JSON snapshot of the factor for audit traceability.
 * Returns nulls when no factor matches — the entry is still persisted
 * but its kgCo2e column stays NULL until a factor is added.
 */
export type Scope3Computation = {
  factorId: string | null;
  kgCo2e: number | null;
  factorSnapshot: Record<string, unknown> | null;
};

const ZERO: Scope3Computation = {
  factorId: null,
  kgCo2e: null,
  factorSnapshot: null,
};

type FactorCategory =
  | "BUSINESS_TRAVEL"
  | "EMPLOYEE_COMMUTING"
  | "PURCHASED_GOODS"
  | "TRANSPORT";

async function findFactor(opts: {
  category: FactorCategory;
  subtype: string;
  region: string;
  companyId: string;
}) {
  // Mirrors findEmissionFactor() in lib/carbon.ts: company override → region
  // → GLOBAL fallback → any.
  const own = await prisma.emissionFactor.findFirst({
    where: {
      category: opts.category,
      subtype: opts.subtype,
      companyId: opts.companyId,
    },
    orderBy: { year: "desc" },
  });
  if (own) return own;

  const regional = await prisma.emissionFactor.findFirst({
    where: {
      category: opts.category,
      subtype: opts.subtype,
      region: opts.region,
      companyId: null,
    },
    orderBy: { year: "desc" },
  });
  if (regional) return regional;

  const global = await prisma.emissionFactor.findFirst({
    where: {
      category: opts.category,
      subtype: opts.subtype,
      region: "GLOBAL",
      companyId: null,
    },
    orderBy: { year: "desc" },
  });
  if (global) return global;

  return prisma.emissionFactor.findFirst({
    where: {
      category: opts.category,
      subtype: opts.subtype,
      companyId: null,
    },
    orderBy: { year: "desc" },
  });
}

function snapshot(factor: Awaited<ReturnType<typeof findFactor>>) {
  if (!factor) return null;
  return {
    value: Number(factor.kgCo2ePerUnit),
    unit: factor.unit,
    source: factor.source,
    region: factor.region,
    year: factor.year,
    type: factor.subtype,
    id: factor.id,
  };
}

export async function computeBusinessTravelEmission(
  companyId: string,
  data: BusinessTravelData,
): Promise<Scope3Computation> {
  const factor = await findFactor({
    category: "BUSINESS_TRAVEL",
    subtype: data.mode,
    region: data.region,
    companyId,
  });
  if (!factor) return ZERO;

  let activity: number;
  if (data.mode === "hotel_night") {
    activity = data.nights ?? 0;
  } else if (data.mode.startsWith("car_")) {
    activity = data.distanceKm ?? 0; // per vehicle.km — passengers ignored
  } else {
    activity = (data.distanceKm ?? 0) * (data.passengers ?? 1);
  }

  const kgCo2e = Number(factor.kgCo2ePerUnit) * activity;

  return {
    factorId: factor.id,
    kgCo2e,
    factorSnapshot: snapshot(factor),
  };
}

export async function computeEmployeeCommutingEmission(
  companyId: string,
  data: EmployeeCommutingData,
): Promise<Scope3Computation> {
  // Walk + bicycle have no factor row in the seed (kgCo2e/unit = 0). We
  // still want the entry to record cleanly, so short-circuit to zero.
  if (data.mode === "walk" || data.mode === "bicycle") {
    return { factorId: null, kgCo2e: 0, factorSnapshot: null };
  }

  const factor = await findFactor({
    category: "EMPLOYEE_COMMUTING",
    subtype: data.mode,
    region: data.region,
    companyId,
  });
  if (!factor) return ZERO;

  // Annual activity: per-employee km × days × employees. Per-vehicle factors
  // (car_*) ignore passenger count — but for commuting we assume the
  // employee is the lone occupant since it's their commute. So vehicle km
  // = passenger km here.
  const annualActivity =
    data.distancePerDayKm * data.daysPerYear * data.employees;
  const kgCo2e = Number(factor.kgCo2ePerUnit) * annualActivity;

  return {
    factorId: factor.id,
    kgCo2e,
    factorSnapshot: snapshot(factor),
  };
}

export async function computeFreightEmission(
  companyId: string,
  data: FreightData,
): Promise<Scope3Computation> {
  // Factors live under EmissionCategory=TRANSPORT (the existing enum
  // value). Same physics for upstream + downstream — the parent
  // Scope3Category captures direction.
  const factor = await findFactor({
    category: "TRANSPORT",
    subtype: data.mode,
    region: data.region,
    companyId,
  });
  if (!factor) return ZERO;

  // Activity is t.km. DEFRA quotes their freight factors per ton.km.
  const kgCo2e = Number(factor.kgCo2ePerUnit) * data.tonnes * data.distanceKm;

  return {
    factorId: factor.id,
    kgCo2e,
    factorSnapshot: snapshot(factor),
  };
}

/**
 * Dispatch on category — BUSINESS_TRAVEL, EMPLOYEE_COMMUTING, and the
 * two freight categories run the full calc; the remaining 3 accept a
 * kgCo2eOverride via the generic form. When neither is available the
 * entry is persisted with NULL emissions.
 */
export async function computeScope3Emission(opts: {
  companyId: string;
  category: Scope3CategoryValue;
  data: unknown;
}): Promise<Scope3Computation> {
  if (opts.category === "BUSINESS_TRAVEL") {
    return computeBusinessTravelEmission(
      opts.companyId,
      opts.data as BusinessTravelData,
    );
  }
  if (opts.category === "EMPLOYEE_COMMUTING") {
    return computeEmployeeCommutingEmission(
      opts.companyId,
      opts.data as EmployeeCommutingData,
    );
  }
  if (
    opts.category === "UPSTREAM_TRANSPORT" ||
    opts.category === "DOWNSTREAM_TRANSPORT"
  ) {
    return computeFreightEmission(opts.companyId, opts.data as FreightData);
  }

  const generic = opts.data as { kgCo2eOverride?: number } | null;
  if (generic && typeof generic.kgCo2eOverride === "number") {
    return { factorId: null, kgCo2e: generic.kgCo2eOverride, factorSnapshot: null };
  }
  return ZERO;
}
