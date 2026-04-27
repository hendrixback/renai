import "server-only";

import { prisma } from "@/lib/prisma";

import type {
  Insight,
  InsightGenerator,
} from "../types";

/**
 * Surface the single highest-impact contributor when one source
 * dominates the company's footprint. Three angles:
 *
 *  - Top fuel type by kgCO₂e (Scope 1)
 *  - Top site by total emissions (Scope 1 + 2 + 3)
 *  - Top Scope 3 category
 *
 * Threshold: a contributor is only "dominant" enough to flag when it
 * accounts for ≥ 50% of its bucket *and* there are ≥ 3 entries to
 * compare against (otherwise the insight is trivially true and adds
 * no value).
 */

const DOMINANCE_PCT = 0.5; // 50%

export const topContributorsGenerator: InsightGenerator = async (ctx) => {
  const insights: Insight[] = [];
  const where = {
    companyId: ctx.companyId,
    deletedAt: null,
    ...(ctx.siteId ? { siteId: ctx.siteId } : {}),
    ...(ctx.year ? { reportingYear: ctx.year } : {}),
  };

  // ── Top fuel type ────────────────────────────────────────────────
  const fuel = await prisma.fuelEntry.findMany({
    where,
    select: { fuelType: true, kgCo2e: true },
  });
  if (fuel.length >= 3) {
    const byType = new Map<string, number>();
    let total = 0;
    for (const f of fuel) {
      const kg = Number(f.kgCo2e ?? 0);
      if (!Number.isFinite(kg) || kg <= 0) continue;
      byType.set(f.fuelType, (byType.get(f.fuelType) ?? 0) + kg);
      total += kg;
    }
    if (total > 0 && byType.size >= 2) {
      let topType = "";
      let topKg = 0;
      for (const [k, v] of byType) {
        if (v > topKg) {
          topType = k;
          topKg = v;
        }
      }
      const pct = topKg / total;
      if (pct >= DOMINANCE_PCT) {
        insights.push({
          id: "top-fuel-type",
          severity: "info",
          category: "emissions",
          title: "One fuel type dominates Scope 1",
          message: `${humanFuel(topType)} accounts for ${(pct * 100).toFixed(0)}% of Scope 1 emissions. Reduction effort here has the highest impact.`,
          href: "/carbon-footprint/fuel",
          ctaLabel: "Review",
          metadata: { fuelType: topType, pct, kg: topKg, total },
        });
      }
    }
  }

  // ── Top site ─────────────────────────────────────────────────────
  // Only relevant when the user has more than one site with data.
  const [sFuel, sElec, sScope3] = await Promise.all([
    prisma.fuelEntry.findMany({
      where: {
        companyId: ctx.companyId,
        deletedAt: null,
        ...(ctx.year ? { reportingYear: ctx.year } : {}),
      },
      select: { siteId: true, kgCo2e: true },
    }),
    prisma.electricityEntry.findMany({
      where: {
        companyId: ctx.companyId,
        deletedAt: null,
        ...(ctx.year ? { reportingYear: ctx.year } : {}),
      },
      select: { siteId: true, marketBasedKgCo2e: true, kgCo2e: true },
    }),
    prisma.scope3Entry.findMany({
      where: {
        companyId: ctx.companyId,
        deletedAt: null,
        ...(ctx.year ? { reportingYear: ctx.year } : {}),
      },
      select: { siteId: true, kgCo2e: true },
    }),
  ]);

  const bySite = new Map<string, number>();
  let totalSites = 0;
  const tally = (siteId: string | null, kg: number) => {
    if (!Number.isFinite(kg) || kg <= 0) return;
    const key = siteId ?? "__unassigned__";
    bySite.set(key, (bySite.get(key) ?? 0) + kg);
    totalSites += kg;
  };
  for (const e of sFuel) tally(e.siteId, Number(e.kgCo2e ?? 0));
  for (const e of sElec) {
    const kg = Number(e.marketBasedKgCo2e ?? e.kgCo2e ?? 0);
    tally(e.siteId, kg);
  }
  for (const e of sScope3) tally(e.siteId, Number(e.kgCo2e ?? 0));

  if (bySite.size >= 2 && totalSites > 0) {
    let topId: string | null = null;
    let topKg = 0;
    for (const [k, v] of bySite) {
      if (v > topKg) {
        topId = k === "__unassigned__" ? null : k;
        topKg = v;
      }
    }
    const pct = topKg / totalSites;
    if (pct >= DOMINANCE_PCT) {
      let label = "Unassigned site";
      if (topId) {
        const site = await prisma.site.findFirst({
          where: { id: topId, companyId: ctx.companyId },
          select: { name: true },
        });
        label = site?.name ?? "Unnamed site";
      }
      insights.push({
        id: "top-site",
        severity: "info",
        category: "emissions",
        title: "One site dominates the company footprint",
        message: `${label} accounts for ${(pct * 100).toFixed(0)}% of total emissions. Consider focusing reduction work + data quality there first.`,
        href: topId ? `/analysis?site=${topId}` : "/analysis",
        ctaLabel: "Drill down",
        metadata: { siteId: topId, pct, kg: topKg, total: totalSites },
      });
    }
  }

  // ── Top Scope 3 category ─────────────────────────────────────────
  const scope3 = await prisma.scope3Entry.findMany({
    where,
    select: { category: true, kgCo2e: true },
  });
  if (scope3.length >= 3) {
    const byCat = new Map<string, number>();
    let total = 0;
    for (const e of scope3) {
      const kg = Number(e.kgCo2e ?? 0);
      if (!Number.isFinite(kg) || kg <= 0) continue;
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + kg);
      total += kg;
    }
    if (total > 0 && byCat.size >= 2) {
      let topCat = "";
      let topKg = 0;
      for (const [k, v] of byCat) {
        if (v > topKg) {
          topCat = k;
          topKg = v;
        }
      }
      const pct = topKg / total;
      if (pct >= DOMINANCE_PCT) {
        insights.push({
          id: "top-scope3-category",
          severity: "info",
          category: "emissions",
          title: "One Scope 3 category dominates",
          message: `${humanScope3(topCat)} accounts for ${(pct * 100).toFixed(0)}% of Scope 3 emissions. Engagement with suppliers in this category is the highest-leverage action.`,
          href: "/carbon-footprint/value-chain",
          ctaLabel: "Review",
          metadata: { category: topCat, pct, kg: topKg, total },
        });
      }
    }
  }

  return insights;
};

function humanFuel(v: string): string {
  const map: Record<string, string> = {
    diesel: "Diesel",
    petrol: "Petrol / Gasoline",
    natural_gas: "Natural gas",
    natural_gas_kwh: "Natural gas (kWh)",
    lpg: "LPG",
    heating_oil: "Heating oil",
    coal: "Coal",
    biodiesel: "Biodiesel",
    wood_pellets: "Wood pellets",
  };
  return map[v] ?? v;
}

function humanScope3(v: string): string {
  const map: Record<string, string> = {
    PURCHASED_GOODS_SERVICES: "Purchased goods & services",
    FUEL_ENERGY_RELATED: "Fuel & energy-related (WTT)",
    UPSTREAM_TRANSPORT: "Upstream transport",
    WASTE_GENERATED: "Waste generated in operations",
    BUSINESS_TRAVEL: "Business travel",
    EMPLOYEE_COMMUTING: "Employee commuting",
    DOWNSTREAM_TRANSPORT: "Downstream transport",
  };
  return map[v] ?? v;
}
