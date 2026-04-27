import "server-only";

import { prisma } from "@/lib/prisma";

import type {
  Insight,
  InsightGenerator,
} from "../types";

/**
 * Data-quality + compliance signals from Waste Flows + Documents.
 * These are actionable: every alert links to the page where the user
 * can fix it.
 */
export const dataQualityGenerator: InsightGenerator = async (ctx) => {
  const insights: Insight[] = [];

  const flows = await prisma.wasteFlow.findMany({
    where: {
      companyId: ctx.companyId,
      deletedAt: null,
      ...(ctx.siteId ? { siteId: ctx.siteId } : {}),
    },
    select: {
      id: true,
      isHazardous: true,
      treatmentCode: true,
      wasteCodeId: true,
      siteId: true,
      locationName: true,
      estimatedQuantity: true,
      categoryId: true,
    },
  });

  // Hazardous without treatment — compliance critical (Spec §22.5).
  const hazNoTreatment = flows.filter(
    (f) => f.isHazardous && !f.treatmentCode,
  ).length;
  if (hazNoTreatment > 0) {
    insights.push({
      id: "wf-haz-no-treatment",
      severity: "critical",
      category: "compliance",
      title: "Hazardous flows without treatment code",
      message: `${hazNoTreatment} hazardous waste flow${hazNoTreatment === 1 ? "" : "s"} ${hazNoTreatment === 1 ? "is" : "are"} missing an R/D treatment code. Required for audit + reporting.`,
      href: "/waste-flows?hazardous=true",
      ctaLabel: "Review",
      metadata: { count: hazNoTreatment },
    });
  }

  const noWasteCode = flows.filter((f) => !f.wasteCodeId).length;
  if (noWasteCode > 0) {
    insights.push({
      id: "wf-missing-low-code",
      severity: "warning",
      category: "data-quality",
      title: "Waste flows missing LoW / EWC code",
      message: `${noWasteCode} flow${noWasteCode === 1 ? "" : "s"} ${noWasteCode === 1 ? "has" : "have"} no LoW code — hazardous classification can't be derived without one.`,
      href: "/waste-flows",
      ctaLabel: "Classify",
      metadata: { count: noWasteCode },
    });
  }

  const noSite = flows.filter(
    (f) => !f.siteId && !f.locationName,
  ).length;
  if (noSite > 0) {
    insights.push({
      id: "wf-no-site",
      severity: "info",
      category: "data-quality",
      title: "Waste flows without site",
      message: `${noSite} flow${noSite === 1 ? "" : "s"} ${noSite === 1 ? "has" : "have"} no plant/site assigned — multi-site reporting will under-represent these.`,
      href: "/waste-flows",
      ctaLabel: "Assign sites",
      metadata: { count: noSite },
    });
  }

  const noQty = flows.filter((f) => f.estimatedQuantity == null).length;
  // Only nag once they have ≥ 5 flows so a brand-new tenant doesn't get spammed.
  if (noQty > 0 && flows.length >= 5) {
    insights.push({
      id: "wf-no-quantity",
      severity: "info",
      category: "data-quality",
      title: "Waste flows without estimated quantity",
      message: `${noQty} flow${noQty === 1 ? "" : "s"} ${noQty === 1 ? "is" : "are"} missing estimated quantity — KPIs won't include them in volume totals.`,
      href: "/waste-flows",
      ctaLabel: "Update",
      metadata: { count: noQty },
    });
  }

  // Documents — flag emission entries that lack any attached evidence.
  // The DocumentLink polymorphic pattern means we can count by module.
  const [s1Total, s1WithDocs, s2Total, s2WithDocs] = await Promise.all([
    prisma.fuelEntry.count({
      where: { companyId: ctx.companyId, deletedAt: null },
    }),
    prisma.documentLink.count({
      where: {
        module: "scope-1",
        document: { companyId: ctx.companyId, deletedAt: null },
      },
    }),
    prisma.electricityEntry.count({
      where: { companyId: ctx.companyId, deletedAt: null },
    }),
    prisma.documentLink.count({
      where: {
        module: "scope-2",
        document: { companyId: ctx.companyId, deletedAt: null },
      },
    }),
  ]);

  // Only flag once there's enough volume to matter (≥ 3 entries).
  if (s1Total >= 3 && s1WithDocs === 0) {
    insights.push({
      id: "scope1-no-docs",
      severity: "warning",
      category: "compliance",
      title: "Scope 1 entries lack supporting documents",
      message: `${s1Total} Scope 1 fuel entries are missing fuel invoices or meter readings. Auditors will ask for these.`,
      href: "/carbon-footprint/fuel",
      ctaLabel: "Attach evidence",
      metadata: { entries: s1Total, withDocs: s1WithDocs },
    });
  }
  if (s2Total >= 3 && s2WithDocs === 0) {
    insights.push({
      id: "scope2-no-docs",
      severity: "warning",
      category: "compliance",
      title: "Scope 2 entries lack supporting documents",
      message: `${s2Total} Scope 2 electricity entries are missing utility bills or supplier statements.`,
      href: "/carbon-footprint/electricity",
      ctaLabel: "Attach evidence",
      metadata: { entries: s2Total, withDocs: s2WithDocs },
    });
  }

  return insights;
};
