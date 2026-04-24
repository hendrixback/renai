import "server-only";

import { prisma } from "@/lib/prisma";

const FREQ_TO_MONTHLY: Record<string, number> = {
  DAILY: 30,
  WEEKLY: 4.3333,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
  ONE_OFF: 1,
  CONTINUOUS: 1,
};

// Convertible to TON — others skip the throughput sum.
const UNIT_TO_TON: Record<string, number> = {
  KG: 0.001,
  TON: 1,
};

const RECOVERY_CODES = new Set([
  "R1","R2","R3","R4","R5","R6","R7","R8","R9","R10","R11","R12","R13",
]);
const DISPOSAL_CODES = new Set([
  "D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15",
]);

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(companyId: string) {
  const [flows, categoryGroups, siteCount] = await Promise.all([
    prisma.wasteFlow.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        status: true,
        estimatedQuantity: true,
        quantityUnit: true,
        frequency: true,
        isHazardous: true,
        isPriority: true,
        treatmentCode: true,
        createdAt: true,
        wasteCodeId: true,
        siteId: true,
        locationName: true,
        category: { select: { id: true, name: true, slug: true } },
        wasteCode: { select: { displayCode: true, isHazardous: true } },
        site: { select: { name: true } },
      },
      orderBy: [{ isPriority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.wasteCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.site.count({ where: { companyId } }),
  ]);

  const total = flows.length;
  const active = flows.filter((f) => f.status === "ACTIVE").length;
  const inactive = flows.filter((f) => f.status === "INACTIVE").length;
  const archived = flows.filter((f) => f.status === "ARCHIVED").length;
  const hazardous = flows.filter((f) => f.isHazardous).length;
  const priority = flows.filter((f) => f.isPriority).length;

  // Monthly throughput (tons) — only flows whose unit is KG/TON.
  let monthlyTons = 0;
  let nonConvertible = 0;
  for (const f of flows) {
    const unitMultiplier = UNIT_TO_TON[f.quantityUnit];
    if (unitMultiplier === undefined) {
      if (f.estimatedQuantity) nonConvertible++;
      continue;
    }
    const qty = f.estimatedQuantity ? Number(f.estimatedQuantity) : 0;
    const freqMultiplier = FREQ_TO_MONTHLY[f.frequency] ?? 1;
    monthlyTons += qty * unitMultiplier * freqMultiplier;
  }

  // Treatment breakdown
  let recoveryCount = 0;
  let disposalCount = 0;
  let untreatedCount = 0;
  for (const f of flows) {
    if (!f.treatmentCode) untreatedCount++;
    else if (RECOVERY_CODES.has(f.treatmentCode)) recoveryCount++;
    else if (DISPOSAL_CODES.has(f.treatmentCode)) disposalCount++;
  }
  const recoveryRate =
    total > 0 ? Math.round((recoveryCount / total) * 100) : 0;

  // By category — count + monthly tons per category
  const byCategory = categoryGroups
    .map((c) => {
      const list = flows.filter((f) => f.category?.id === c.id);
      let tons = 0;
      for (const f of list) {
        const unitMultiplier = UNIT_TO_TON[f.quantityUnit];
        if (unitMultiplier === undefined) continue;
        const qty = f.estimatedQuantity ? Number(f.estimatedQuantity) : 0;
        const freqMultiplier = FREQ_TO_MONTHLY[f.frequency] ?? 1;
        tons += qty * unitMultiplier * freqMultiplier;
      }
      return { id: c.id, name: c.name, slug: c.slug, count: list.length, tons };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const uncategorized = flows.filter((f) => !f.category).length;
  if (uncategorized > 0) {
    byCategory.push({
      id: "__uncategorized__",
      name: "Uncategorized",
      slug: "uncategorized",
      count: uncategorized,
      tons: 0,
    });
  }

  // Alerts (actionable data quality / compliance signals)
  const alerts: Array<{
    severity: "info" | "warning" | "critical";
    message: string;
  }> = [];

  const missingCode = flows.filter((f) => !f.wasteCodeId).length;
  if (missingCode > 0) {
    alerts.push({
      severity: "warning",
      message: `${missingCode} waste flow${missingCode === 1 ? "" : "s"} missing LoW / EWC code`,
    });
  }
  if (untreatedCount > 0) {
    alerts.push({
      severity: "warning",
      message: `${untreatedCount} waste flow${untreatedCount === 1 ? "" : "s"} without a treatment pathway (R/D code)`,
    });
  }
  const haznoCode = flows.filter(
    (f) => f.isHazardous && !f.treatmentCode,
  ).length;
  if (haznoCode > 0) {
    alerts.push({
      severity: "critical",
      message: `${haznoCode} hazardous flow${haznoCode === 1 ? "" : "s"} without treatment code — compliance risk`,
    });
  }
  const noSite = flows.filter((f) => !f.siteId && !f.locationName).length;
  if (noSite > 0) {
    alerts.push({
      severity: "info",
      message: `${noSite} waste flow${noSite === 1 ? "" : "s"} without a site assigned`,
    });
  }

  // Data-completeness signals — fuel the expanded Compliance Snapshot
  // widget on the dashboard so operators can see where their dataset is
  // thinnest before reporting season.
  const withSite = flows.filter((f) => f.siteId || f.locationName).length;
  const withQuantity = flows.filter((f) => f.estimatedQuantity != null).length;
  const withCategory = flows.filter((f) => f.category != null).length;

  return {
    kpi: {
      total,
      active,
      inactive,
      archived,
      hazardous,
      priority,
      monthlyTons,
      nonConvertible,
      recoveryRate,
      recoveryCount,
      disposalCount,
      untreatedCount,
      withSite,
      withQuantity,
      withCategory,
    },
    byCategory,
    byStatus: [
      { key: "ACTIVE", label: "Active", count: active },
      { key: "INACTIVE", label: "Inactive", count: inactive },
      { key: "ARCHIVED", label: "Archived", count: archived },
    ].filter((s) => s.count > 0),
    byTreatment: [
      { key: "recovery", label: "Recovery", count: recoveryCount },
      { key: "disposal", label: "Disposal", count: disposalCount },
      { key: "untreated", label: "Not assigned", count: untreatedCount },
    ].filter((t) => t.count > 0),
    recentFlows: flows.slice(0, 5).map((f) => ({
      id: f.id,
      name: f.name,
      status: f.status,
      estimatedQuantity: f.estimatedQuantity
        ? Number(f.estimatedQuantity)
        : null,
      quantityUnit: f.quantityUnit,
      frequency: f.frequency,
      isHazardous: f.isHazardous,
      isPriority: f.isPriority,
      categoryName: f.category?.name ?? null,
      wasteCodeDisplay: f.wasteCode?.displayCode ?? null,
    })),
    alerts,
    meta: {
      siteCount,
    },
  };
}
