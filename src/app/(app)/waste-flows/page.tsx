import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildWasteFlowsWhere, type WasteFlowListSearchParams } from "@/lib/waste-flows";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ExportMenu } from "@/components/export-menu";
import { serializeSearchParams } from "@/lib/url";
import { WasteFlowsFilters } from "@/components/waste-flows-filters";
import { WasteFlowsTable } from "@/components/waste-flows-table";

export const dynamic = "force-dynamic";

export default async function WasteFlowsPage({
  searchParams,
}: {
  searchParams: Promise<WasteFlowListSearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/waste-flows");

  const params = await searchParams;
  const where = buildWasteFlowsWhere(params, ctx.company.id);

  const [flows, categories, sites, totalCount] = await Promise.all([
    prisma.wasteFlow.findMany({
      where,
      orderBy: [{ isPriority: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        status: true,
        estimatedQuantity: true,
        quantityUnit: true,
        frequency: true,
        isHazardous: true,
        isPriority: true,
        createdAt: true,
        locationName: true,
        category: { select: { name: true } },
        wasteCode: { select: { displayCode: true, isHazardous: true } },
        site: { select: { name: true } },
      },
    }),
    prisma.wasteCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.wasteFlow.count({ where: { companyId: ctx.company.id } }),
  ]);

  const rows = flows.map((f) => ({
    ...f,
    estimatedQuantity: f.estimatedQuantity ? f.estimatedQuantity.toString() : null,
  }));

  return (
    <>
      <PageHeader
        title="Waste Flows"
        actions={
          <>
            <ExportMenu
              basePath="/waste-flows/export"
              searchString={serializeSearchParams(params)}
            />
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href="/waste-flows/new">
                  <PlusIcon className="size-4" />
                  New Waste Flow
                </Link>
              }
            />
          </>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <WasteFlowsFilters categories={categories} sites={sites} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {flows.length} shown {flows.length !== totalCount
              ? `of ${totalCount}`
              : ""}
          </p>
        </div>
        <WasteFlowsTable rows={rows} />
      </div>
    </>
  );
}
