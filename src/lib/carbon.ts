import "server-only";

import { prisma } from "@/lib/prisma";

export { FUEL_TYPES, FUEL_UNIT_OPTIONS, REGIONS } from "@/lib/carbon-options";

// ─── Waste category → waste-impact subtype mapping ─────────────────

// Matches category.slug (seeded in waste-categories.ts) to the subtype
// used by the WASTE_LANDFILL / WASTE_RECYCLING / WASTE_INCINERATION
// emission factors (seeded in emission-factors.ts). Fallback is
// "municipal_mixed" when we can't confidently identify the material.
const CATEGORY_TO_SUBTYPE: Record<string, string> = {
  packaging: "packaging",
  "paper-cardboard": "paper_cardboard",
  plastic: "plastic",
  metal: "metal",
  glass: "glass",
  wood: "wood",
  organic: "organic",
  "construction-demolition": "construction_demolition",
  textile: "textile",
  weee: "weee",
  "oil-hydrocarbon": "hazardous",
  "hazardous-chemical": "hazardous",
  healthcare: "hazardous",
  "mineral-extractive": "municipal_mixed",
  "municipal-mixed": "municipal_mixed",
};

// ─── Frequency / unit helpers (shared with dashboard lib) ──────────

const FREQ_ANNUAL: Record<string, number> = {
  DAILY: 365,
  WEEKLY: 52,
  MONTHLY: 12,
  QUARTERLY: 4,
  YEARLY: 1,
  ONE_OFF: 1,
  CONTINUOUS: 12,
};

const UNIT_TO_KG: Record<string, number> = {
  KG: 1,
  TON: 1000,
};

function annualMassKg(
  quantity: number | null,
  unit: string,
  frequency: string,
): number | null {
  const unitKg = UNIT_TO_KG[unit];
  if (unitKg === undefined) return null; // L, m3, UNIT, PIECE not convertible
  if (!quantity) return 0;
  const perEvent = quantity * unitKg;
  const occurrences = FREQ_ANNUAL[frequency] ?? 1;
  return perEvent * occurrences;
}

// ─── Emission factor lookup ────────────────────────────────────────

type FactorWhere = {
  category: string;
  subtype: string;
  region?: string;
  companyId?: string;
};

export async function findEmissionFactor({
  category,
  subtype,
  region,
  companyId,
}: FactorWhere) {
  // Preference order: company-specific > region-specific > GLOBAL > any
  if (companyId) {
    const own = await prisma.emissionFactor.findFirst({
      where: { category: category as never, subtype, companyId },
      orderBy: { year: "desc" },
    });
    if (own) return own;
  }
  if (region) {
    const regional = await prisma.emissionFactor.findFirst({
      where: { category: category as never, subtype, region, companyId: null },
      orderBy: { year: "desc" },
    });
    if (regional) return regional;
  }
  const fallback = await prisma.emissionFactor.findFirst({
    where: { category: category as never, subtype, region: "GLOBAL", companyId: null },
    orderBy: { year: "desc" },
  });
  if (fallback) return fallback;

  return prisma.emissionFactor.findFirst({
    where: { category: category as never, subtype, companyId: null },
    orderBy: { year: "desc" },
  });
}

// ─── Waste impact calculator — per WasteFlow row ───────────────────

export type WasteImpactRow = {
  id: string;
  name: string;
  categoryName: string | null;
  currentDestination: string | null;
  currentDisposalLabel: string;
  annualMassKg: number | null;
  currentKgCo2e: number | null;
  recyclingKgCo2e: number | null;
  savingKgCo2e: number | null; // recycling - current; negative = reduction
  massConvertible: boolean;
};

// R1–R13 = recovery; D1–D15 = disposal
function classifyTreatment(code: string | null): "recovery" | "disposal" | null {
  if (!code) return null;
  if (code.startsWith("R")) return "recovery";
  if (code.startsWith("D")) return "disposal";
  return null;
}

function disposalCategoryFromCode(
  code: string | null,
): "WASTE_LANDFILL" | "WASTE_INCINERATION" | "WASTE_COMPOSTING" {
  // Heuristic map of common D-codes to the closest emission-factor category.
  if (!code) return "WASTE_LANDFILL"; // unknown → landfill worst-case
  if (code === "D10" || code === "D11") return "WASTE_INCINERATION";
  if (code === "D8") return "WASTE_COMPOSTING"; // biological treatment ~ compost
  return "WASTE_LANDFILL";
}

function labelForDestination(
  treatmentCode: string | null,
  currentDestination: string | null,
  treatmentNotes: string | null,
): string {
  if (currentDestination && currentDestination.trim()) return currentDestination;
  if (treatmentCode) {
    if (treatmentCode.startsWith("R"))
      return `Recovery (${treatmentCode})`;
    if (treatmentCode === "D1" || treatmentCode === "D5")
      return "Landfill";
    if (treatmentCode === "D10" || treatmentCode === "D11")
      return "Incineration";
    if (treatmentCode === "D8") return "Biological treatment";
    return `Disposal (${treatmentCode})`;
  }
  if (treatmentNotes && treatmentNotes.trim()) return treatmentNotes;
  return "—";
}

export async function computeWasteImpact(
  companyId: string,
): Promise<WasteImpactRow[]> {
  const flows = await prisma.wasteFlow.findMany({
    where: { companyId },
    orderBy: [{ isPriority: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      estimatedQuantity: true,
      quantityUnit: true,
      frequency: true,
      treatmentCode: true,
      treatmentNotes: true,
      currentDestination: true,
      category: { select: { slug: true, name: true } },
    },
  });

  // Pre-fetch all factors once to avoid N+1.
  const factors = await prisma.emissionFactor.findMany({
    where: {
      companyId: null,
      region: "GLOBAL",
      category: {
        in: [
          "WASTE_LANDFILL",
          "WASTE_INCINERATION",
          "WASTE_RECYCLING",
          "WASTE_COMPOSTING",
        ],
      },
    },
  });
  const factorMap = new Map<string, number>();
  for (const f of factors) {
    factorMap.set(`${f.category}|${f.subtype}`, Number(f.kgCo2ePerUnit));
  }

  const rows: WasteImpactRow[] = flows.map((f) => {
    const subtype =
      (f.category && CATEGORY_TO_SUBTYPE[f.category.slug]) ??
      "municipal_mixed";

    const mass = annualMassKg(
      f.estimatedQuantity ? Number(f.estimatedQuantity) : null,
      f.quantityUnit,
      f.frequency,
    );

    const currentDisposalCategory =
      classifyTreatment(f.treatmentCode) === "recovery"
        ? "WASTE_RECYCLING"
        : disposalCategoryFromCode(f.treatmentCode);

    const currentEf = factorMap.get(`${currentDisposalCategory}|${subtype}`);
    const recyclingEf = factorMap.get(`WASTE_RECYCLING|${subtype}`);

    const massConvertible = mass !== null;

    const currentKgCo2e =
      massConvertible && currentEf !== undefined ? mass! * currentEf : null;
    const recyclingKgCo2e =
      massConvertible && recyclingEf !== undefined ? mass! * recyclingEf : null;

    const saving =
      currentKgCo2e !== null && recyclingKgCo2e !== null
        ? recyclingKgCo2e - currentKgCo2e
        : null;

    return {
      id: f.id,
      name: f.name,
      categoryName: f.category?.name ?? null,
      currentDestination: f.currentDestination,
      currentDisposalLabel: labelForDestination(
        f.treatmentCode,
        f.currentDestination,
        f.treatmentNotes,
      ),
      annualMassKg: mass,
      currentKgCo2e,
      recyclingKgCo2e,
      savingKgCo2e: saving,
      massConvertible,
    };
  });

  return rows;
}

// ─── CO2 computation helpers for the register forms ────────────────

export type ComputedEmission = {
  factorId: string | null;
  factorLabel: string | null;
  kgCo2e: number;
};

export async function computeFuelEmission(opts: {
  fuelType: string;
  quantity: number;
  unit: string;
  companyId: string;
  region?: string;
}): Promise<ComputedEmission> {
  const factor = await findEmissionFactor({
    category: "FUEL",
    subtype: opts.fuelType,
    region: opts.region ?? "GLOBAL",
    companyId: opts.companyId,
  });
  if (!factor) {
    return { factorId: null, factorLabel: null, kgCo2e: 0 };
  }
  // If unit stored on the entry differs from factor unit, skip calc to
  // avoid silent wrong math — future: convert L ↔ m3 ↔ kWh via calorific.
  if (factor.unit !== opts.unit) {
    return {
      factorId: factor.id,
      factorLabel: `${factor.source} — unit mismatch (${factor.unit} vs ${opts.unit})`,
      kgCo2e: 0,
    };
  }
  return {
    factorId: factor.id,
    factorLabel: `${factor.source} (${factor.region})`,
    kgCo2e: Number(factor.kgCo2ePerUnit) * opts.quantity,
  };
}

/**
 * Dual GHG-Protocol Scope 2 emission result (Spec §11.4, Amendment A4).
 *
 * locationBasedKgCo2e — reflects the grid mix where consumption happens.
 *   Formula: kwh × grid_factor, regardless of renewable contracts.
 *
 * marketBasedKgCo2e — reflects contractual instruments (RECs, Guarantees
 *   of Origin, PPAs). In MVP we approximate this as
 *   kwh × grid_factor × (1 - renewable%/100) when no supplier-specific
 *   factor is provided. A proper supplier-factor override lands in a
 *   follow-up once the UI supports entering it.
 */
export type ComputedElectricityEmission = {
  factorId: string | null;
  factorLabel: string | null;
  locationBasedKgCo2e: number;
  marketBasedKgCo2e: number;
};

export async function computeElectricityEmission(opts: {
  kwh: number;
  renewablePercent?: number | null;
  companyId: string;
  region?: string;
}): Promise<ComputedElectricityEmission> {
  const factor = await findEmissionFactor({
    category: "ELECTRICITY",
    subtype: "grid_electricity",
    region: opts.region ?? "EU",
    companyId: opts.companyId,
  });
  if (!factor) {
    return {
      factorId: null,
      factorLabel: null,
      locationBasedKgCo2e: 0,
      marketBasedKgCo2e: 0,
    };
  }

  const factorValue = Number(factor.kgCo2ePerUnit);
  const renewablePct = Math.min(
    100,
    Math.max(0, opts.renewablePercent ?? 0),
  );

  const locationBased = factorValue * opts.kwh;
  const marketBased = factorValue * opts.kwh * (1 - renewablePct / 100);

  return {
    factorId: factor.id,
    factorLabel: `${factor.source} (${factor.region})`,
    locationBasedKgCo2e: locationBased,
    marketBasedKgCo2e: marketBased,
  };
}

// ─── Summary aggregation for the Overview tab ──────────────────────

export async function getCarbonSummary(companyId: string) {
  const [fuelAgg, elecAgg, wasteRows] = await Promise.all([
    prisma.fuelEntry.aggregate({
      where: { companyId },
      _sum: { kgCo2e: true },
      _count: true,
    }),
    prisma.electricityEntry.aggregate({
      where: { companyId },
      _sum: { kgCo2e: true },
      _count: true,
    }),
    computeWasteImpact(companyId),
  ]);

  const scope1 = Number(fuelAgg._sum.kgCo2e ?? 0);
  const scope2 = Number(elecAgg._sum.kgCo2e ?? 0);
  const wasteCurrent = wasteRows.reduce(
    (sum, r) => sum + (r.currentKgCo2e ?? 0),
    0,
  );
  const wasteSavingPotential = wasteRows.reduce(
    (sum, r) =>
      sum + (r.savingKgCo2e !== null && r.savingKgCo2e < 0 ? r.savingKgCo2e : 0),
    0,
  );

  const total = scope1 + scope2 + wasteCurrent;

  return {
    scope1,
    scope2,
    wasteCurrent,
    wasteSavingPotential, // negative number (what could be avoided by switching to recycling)
    total,
    fuelEntryCount: fuelAgg._count,
    electricityEntryCount: elecAgg._count,
    wasteFlowCount: wasteRows.length,
  };
}
