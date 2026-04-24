import { notFound, redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import {
  WasteFlowForm,
  type WasteFlowFormInitial,
} from "@/components/waste-flow-form";

export const dynamic = "force-dynamic";

export default async function EditWasteFlowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/waste-flows");

  const { id } = await params;

  const [flow, categories, wasteCodes, sites] = await Promise.all([
    prisma.wasteFlow.findFirst({
      where: { id, companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.wasteCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    prisma.wasteCode.findMany({
      orderBy: { code: "asc" },
      select: {
        code: true,
        displayCode: true,
        description: true,
        chapterCode: true,
        isHazardous: true,
      },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!flow) notFound();

  const initialValues: WasteFlowFormInitial = {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    materialComposition: flow.materialComposition,
    categoryId: flow.categoryId,
    wasteCodeId: flow.wasteCodeId,
    status: flow.status,
    estimatedQuantity: flow.estimatedQuantity?.toString() ?? null,
    quantityUnit: flow.quantityUnit,
    frequency: flow.frequency,
    siteId: flow.siteId,
    locationName: flow.locationName,
    storageMethod: flow.storageMethod,
    currentDestination: flow.currentDestination,
    currentOperator: flow.currentOperator,
    internalCode: flow.internalCode,
    treatmentCode: flow.treatmentCode,
    treatmentNotes: flow.treatmentNotes,
    recoveryNotes: flow.recoveryNotes,
    notes: flow.notes,
    isHazardous: flow.isHazardous,
    isPriority: flow.isPriority,
  };

  return (
    <>
      <PageHeader
        title={`Edit "${flow.name}"`}
        breadcrumbs={[
          { label: "Waste Flows", href: "/waste-flows" },
          { label: flow.name, href: `/waste-flows/${flow.id}` },
        ]}
      />
      <WasteFlowForm
        categories={categories}
        wasteCodes={wasteCodes}
        sites={sites}
        initialValues={initialValues}
      />
    </>
  );
}
