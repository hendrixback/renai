import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { WasteFlowForm } from "@/components/waste-flow-form";

export const dynamic = "force-dynamic";

export default async function NewWasteFlowPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/waste-flows/new");

  const [categories, wasteCodes, sites] = await Promise.all([
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
      where: { companyId: ctx.company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="New Waste Flow"
        breadcrumbs={[{ label: "Waste Flows", href: "/waste-flows" }]}
      />
      <WasteFlowForm
        categories={categories}
        wasteCodes={wasteCodes.map((c) => ({
          code: c.code,
          displayCode: c.displayCode,
          description: c.description,
          chapterCode: c.chapterCode,
          isHazardous: c.isHazardous,
        }))}
        sites={sites}
      />
    </>
  );
}
