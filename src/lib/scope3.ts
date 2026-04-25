import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  BusinessTravelData,
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

async function findFactor(opts: {
  category: "BUSINESS_TRAVEL" | "EMPLOYEE_COMMUTING" | "PURCHASED_GOODS";
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

/**
 * Dispatch on category — for BUSINESS_TRAVEL we run the full calc; for
 * other categories we accept a kgCo2eOverride from the form (interim
 * until the dedicated forms ship). When neither is available the entry
 * is persisted with NULL emissions.
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

  const generic = opts.data as { kgCo2eOverride?: number } | null;
  if (generic && typeof generic.kgCo2eOverride === "number") {
    return { factorId: null, kgCo2e: generic.kgCo2eOverride, factorSnapshot: null };
  }
  return ZERO;
}
