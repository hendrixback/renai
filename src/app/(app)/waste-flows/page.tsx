import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { WasteFlowsFilters } from "@/components/waste-flows-filters";
import { WasteFlowsTable } from "@/components/waste-flows-table";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  category?: string;
  status?: string;
  site?: string;
  hazardous?: string;
  priority?: string;
};

const VALID_STATUS = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

export default async function WasteFlowsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/waste-flows");

  const params = await searchParams;

  const where: Prisma.WasteFlowWhereInput = {
    companyId: ctx.company.id,
  };

  if (params.category) {
    where.category = { slug: params.category };
  }
  if (
    params.status &&
    (VALID_STATUS as readonly string[]).includes(params.status)
  ) {
    where.status = params.status as (typeof VALID_STATUS)[number];
  }
  if (params.site) {
    where.siteId = params.site;
  }
  if (params.hazardous === "true") {
    where.isHazardous = true;
  }
  if (params.priority === "true") {
    where.isPriority = true;
  }
  if (params.q) {
    const q = params.q.trim();
    if (q.length > 0) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { materialComposition: { contains: q, mode: "insensitive" } },
      ];
    }
  }

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
