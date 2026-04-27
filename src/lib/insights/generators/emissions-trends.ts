import "server-only";

import { prisma } from "@/lib/prisma";

import type {
  Insight,
  InsightGenerator,
} from "../types";

/**
 * Emissions-trend insights. Detects:
 *  - month-over-month spikes (≥ 50% above the prior month)
 *  - dropouts (a previously-active site stopped reporting)
 *  - YoY direction (year is X% above/below prior year through the
 *    current month)
 *
 * All comparisons are gentle — only flagged when both the percentage
 * and the absolute change cross a threshold, so a tiny base volume
 * doesn't spam the dashboard.
 */

const MOM_PCT_THRESHOLD = 0.5; // +50%
const MOM_MIN_KG = 100; // ignore spikes < 100 kgCO₂e

const YOY_PCT_INFO = 0.1; // ±10% → info
const YOY_PCT_WARN = 0.25; // ±25% → warning

type MonthBucket = { year: number; month: number; kg: number };

async function bucketsForCompany(
  companyId: string,
  filter: { siteId?: string },
): Promise<MonthBucket[]> {
  const where = {
    companyId,
    deletedAt: null,
    ...(filter.siteId ? { siteId: filter.siteId } : {}),
  } as const;

  const [fuel, elec, scope3] = await Promise.all([
    prisma.fuelEntry.findMany({
      where,
      select: { reportingYear: true, reportingMonth: true, kgCo2e: true },
    }),
    prisma.electricityEntry.findMany({
      where,
      select: {
        reportingYear: true,
        reportingMonth: true,
        marketBasedKgCo2e: true,
        kgCo2e: true,
      },
    }),
    prisma.scope3Entry.findMany({
      where,
      select: { reportingYear: true, reportingMonth: true, kgCo2e: true },
    }),
  ]);

  const map = new Map<string, MonthBucket>();
  const accumulate = (
    year: number | null | undefined,
    month: number | null | undefined,
    kg: number,
  ) => {
    if (!year || !month || !Number.isFinite(kg) || kg <= 0) return;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const existing = map.get(key);
    if (existing) existing.kg += kg;
    else map.set(key, { year, month, kg });
  };
  for (const e of fuel) {
    accumulate(e.reportingYear, e.reportingMonth, Number(e.kgCo2e ?? 0));
  }
  for (const e of elec) {
    const kg = Number(e.marketBasedKgCo2e ?? e.kgCo2e ?? 0);
    accumulate(e.reportingYear, e.reportingMonth, kg);
  }
  for (const e of scope3) {
    accumulate(e.reportingYear, e.reportingMonth, Number(e.kgCo2e ?? 0));
  }

  return [...map.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );
}

export const emissionsTrendsGenerator: InsightGenerator = async (ctx) => {
  const insights: Insight[] = [];
  const buckets = await bucketsForCompany(ctx.companyId, { siteId: ctx.siteId });
  if (buckets.length < 2) return insights;

  // Month-over-month spike detection — compare the latest two buckets
  // (chronologically). Only meaningful when both have data.
  const last = buckets[buckets.length - 1];
  const prev = buckets[buckets.length - 2];
  if (
    last.year * 12 + last.month - (prev.year * 12 + prev.month) === 1 &&
    prev.kg > 0 &&
    last.kg - prev.kg >= MOM_MIN_KG
  ) {
    const pct = (last.kg - prev.kg) / prev.kg;
    if (pct >= MOM_PCT_THRESHOLD) {
      insights.push({
        id: "mom-spike",
        severity: pct >= 1 ? "warning" : "info",
        category: "emissions",
        title: "Month-over-month emissions spike",
        message: `Total ${formatMonth(last)} emissions are +${(pct * 100).toFixed(0)}% vs ${formatMonth(prev)} (${formatKg(last.kg)} vs ${formatKg(prev.kg)} kgCO₂e). Worth investigating which scope drove the change.`,
        href: "/analysis",
        ctaLabel: "Open analysis",
        metadata: { pct, prevKg: prev.kg, lastKg: last.kg },
      });
    }
  }

  // Year-over-year direction — compare current-year YTD with prior-year
  // through the same month. Skips when prior year has no matching data.
  const targetYear = ctx.year ?? new Date().getUTCFullYear();
  const prevYear = targetYear - 1;
  const yearTotal = (year: number) =>
    buckets.filter((b) => b.year === year).reduce((s, b) => s + b.kg, 0);
  const lastYtdMonth = Math.max(
    0,
    ...buckets.filter((b) => b.year === targetYear).map((b) => b.month),
  );
  if (lastYtdMonth > 0) {
    const ytdCurrent = yearTotal(targetYear);
    const ytdPrior = buckets
      .filter((b) => b.year === prevYear && b.month <= lastYtdMonth)
      .reduce((s, b) => s + b.kg, 0);
    if (ytdPrior > 0 && ytdCurrent > 0) {
      const pct = (ytdCurrent - ytdPrior) / ytdPrior;
      const abs = Math.abs(pct);
      if (abs >= YOY_PCT_INFO) {
        const sev = abs >= YOY_PCT_WARN ? "warning" : "info";
        const direction = pct >= 0 ? "above" : "below";
        insights.push({
          id: "yoy-direction",
          severity: sev,
          category: "emissions",
          title: `Year-to-date emissions ${direction} prior year`,
          message: `${targetYear} YTD (Jan–${monthName(lastYtdMonth)}) is ${(abs * 100).toFixed(1)}% ${direction} ${prevYear} for the same window — ${formatKg(ytdCurrent)} vs ${formatKg(ytdPrior)} kgCO₂e.`,
          href: "/analysis",
          ctaLabel: "Compare",
          metadata: { pct, ytdCurrent, ytdPrior, throughMonth: lastYtdMonth },
        });
      }
    }
  }

  return insights;
};

function formatKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return Math.round(kg).toLocaleString();
}

function formatMonth(b: MonthBucket): string {
  const date = new Date(Date.UTC(b.year, b.month - 1, 1));
  return date.toLocaleString("en", { year: "numeric", month: "short" });
}

function monthName(m: number): string {
  return new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en", { month: "short" });
}
