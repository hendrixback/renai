import "server-only";

import { prisma } from "@/lib/prisma";

import type {
  Insight,
  InsightGenerator,
} from "../types";

/**
 * Operational hygiene signals — gaps in the *use* of the platform
 * itself, distinct from data quality on records the user has already
 * created.
 *
 * These are gentle (info-only) — they prod the user toward filling
 * the platform out without nagging on every dashboard render.
 */

export const operationsGenerator: InsightGenerator = async (ctx) => {
  const insights: Insight[] = [];
  const targetYear = ctx.year ?? new Date().getUTCFullYear();
  const currentMonth = new Date().getUTCMonth() + 1; // 1–12

  // ── Recent reporting gap ────────────────────────────────────────
  // If they have a baseline (≥ 3 prior months of any emission entry)
  // but the most recent month has zero entries across all scopes,
  // surface a "you usually report ___ but haven't this month" nudge.
  const [fuel, elec, scope3] = await Promise.all([
    prisma.fuelEntry.findMany({
      where: { companyId: ctx.companyId, deletedAt: null },
      select: { reportingYear: true, reportingMonth: true },
    }),
    prisma.electricityEntry.findMany({
      where: { companyId: ctx.companyId, deletedAt: null },
      select: { reportingYear: true, reportingMonth: true },
    }),
    prisma.scope3Entry.findMany({
      where: { companyId: ctx.companyId, deletedAt: null },
      select: { reportingYear: true, reportingMonth: true },
    }),
  ]);

  const monthsWithData = new Set<string>();
  const all = [...fuel, ...elec, ...scope3];
  for (const e of all) {
    if (e.reportingYear && e.reportingMonth) {
      monthsWithData.add(`${e.reportingYear}-${String(e.reportingMonth).padStart(2, "0")}`);
    }
  }
  // Only nag once they have 3+ months of historical data so a brand-
  // new tenant doesn't get pestered.
  if (monthsWithData.size >= 3) {
    const lastMonthDate = new Date();
    lastMonthDate.setUTCDate(1);
    lastMonthDate.setUTCMonth(lastMonthDate.getUTCMonth() - 1);
    const lastY = lastMonthDate.getUTCFullYear();
    const lastM = lastMonthDate.getUTCMonth() + 1;
    const lastKey = `${lastY}-${String(lastM).padStart(2, "0")}`;
    if (!monthsWithData.has(lastKey)) {
      insights.push({
        id: "operations-recent-gap",
        severity: "info",
        category: "operations",
        title: "Last month is missing emission entries",
        message: `No Scope 1, 2, or 3 entries recorded for ${lastMonthDate.toLocaleString("en", { month: "long", year: "numeric" })}. Reporting cadence has been broken — add the missing entries before the next monthly review.`,
        href: "/carbon-footprint",
        ctaLabel: "Add entries",
        metadata: { gapMonth: lastKey },
      });
    }
  }

  // ── Sites without any data ──────────────────────────────────────
  const sites = await prisma.site.findMany({
    where: { companyId: ctx.companyId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (sites.length >= 2) {
    const sitesWithEntries = new Set<string>();
    for (const e of [...fuel, ...elec, ...scope3]) {
      const eAny = e as { siteId?: string | null };
      if (eAny.siteId) sitesWithEntries.add(eAny.siteId);
    }
    const orphans = sites.filter((s) => !sitesWithEntries.has(s.id));
    if (orphans.length > 0 && orphans.length < sites.length) {
      const names = orphans.map((s) => s.name).slice(0, 3).join(", ");
      const more =
        orphans.length > 3 ? ` (+${orphans.length - 3} more)` : "";
      insights.push({
        id: "operations-orphan-sites",
        severity: "info",
        category: "operations",
        title: "Sites without any emission data",
        message: `${orphans.length} site${orphans.length === 1 ? "" : "s"} (${names}${more}) have no Scope 1/2/3 entries. Either add data or archive the site so KPIs don't under-represent multi-site reporting.`,
        href: "/settings/sites",
        ctaLabel: "Open sites",
        metadata: { siteIds: orphans.map((s) => s.id) },
      });
    }
  }

  // ── Production volume missing for current year (PEF blocker) ────
  const productionCount = await prisma.productionVolume.count({
    where: {
      companyId: ctx.companyId,
      deletedAt: null,
      reportingYear: targetYear,
    },
  });
  // Only flag once we're a few months into the year and there's still nothing.
  if (productionCount === 0 && currentMonth >= 3 && all.length > 0) {
    insights.push({
      id: "operations-no-production-volume",
      severity: "info",
      category: "operations",
      title: "Production Emission Factor needs production volume",
      message: `No production volume recorded for ${targetYear}. PEF (kgCO₂e per unit produced) can't be computed without it.`,
      href: "/carbon-footprint/production",
      ctaLabel: "Add volume",
      metadata: { year: targetYear },
    });
  }

  return insights;
};
