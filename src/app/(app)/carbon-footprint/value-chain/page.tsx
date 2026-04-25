import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import {
  buildScope3EntryWhere,
  factorSourceFromSnapshot,
  type CarbonListSearchParams,
} from "@/lib/carbon-filters";
import { flags } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CarbonFiltersBar } from "@/components/carbon/carbon-filters-bar";
import { ComingSoonPanel } from "@/components/carbon/coming-soon-panel";
import { RegisterScope3Dialog } from "@/components/carbon/register-scope3-dialog";
import { ExportMenu, serializeSearchParams } from "@/components/export-menu";

const CATEGORY_LABEL: Record<string, string> = {
  PURCHASED_GOODS_SERVICES: "Purchased goods",
  FUEL_ENERGY_RELATED: "Fuel & energy",
  UPSTREAM_TRANSPORT: "Upstream transport",
  WASTE_GENERATED: "Waste generated",
  BUSINESS_TRAVEL: "Business travel",
  EMPLOYEE_COMMUTING: "Commuting",
  DOWNSTREAM_TRANSPORT: "Downstream transport",
};

export const dynamic = "force-dynamic";

export default async function ValueChainPage({
  searchParams,
}: {
  searchParams: Promise<CarbonListSearchParams>;
}) {
  if (!flags.scope3Enabled) {
    return (
      <ComingSoonPanel
        title="Scope 3 — Value chain"
        description="Upstream and downstream emissions outside your direct operations. This is often the largest portion of a company's footprint."
        examples={[
          "Purchased goods & services (from suppliers)",
          "Upstream & downstream transportation / distribution",
          "Employee commuting and business travel",
          "Use of sold products; end-of-life treatment",
          "Leased assets, investments, franchises",
        ]}
      />
    );
  }

  const ctx = await getCurrentContext();
  if (!ctx) notFound();

  const params = await searchParams;
  const where = buildScope3EntryWhere(params, ctx.company.id);

  const [entries, sites] = await Promise.all([
    prisma.scope3Entry.findMany({
      where,
      orderBy: { month: "desc" },
      include: {
        site: { select: { name: true } },
        emissionFactor: { select: { source: true } },
      },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalKg = entries.reduce(
    (sum, e) => sum + (e.kgCo2e ? Number(e.kgCo2e) : 0),
    0,
  );

  const hasActiveFilters = Boolean(
    params.year || params.site || params.status || params.category,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scope 3 — Value chain</h2>
          <p className="text-sm text-muted-foreground">
            Upstream and downstream emissions outside your direct operations.
            Business travel ships first; other categories accept manual
            kgCO₂e entries until their dedicated forms ship.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            basePath="/carbon-footprint/value-chain/export"
            searchString={serializeSearchParams(params)}
          />
          <RegisterScope3Dialog sites={sites} />
        </div>
      </div>

      <CarbonFiltersBar sites={sites} showCategory />

      <Card className="gap-0 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Entries{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {entries.length}
            </span>
          </CardTitle>
          <p className="text-sm tabular-nums text-muted-foreground">
            Total:{" "}
            <span className="font-medium text-foreground">
              {totalKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kgCO₂e
            </span>
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium">
                {hasActiveFilters
                  ? "No Scope 3 entries match these filters."
                  : "No Scope 3 entries yet."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters ? (
                  "Adjust or clear the filters above."
                ) : (
                  <>
                    Click <span className="font-medium">Register Scope 3</span> above
                    to log a flight, hotel stay, or other value-chain activity.
                  </>
                )}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Factor source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">kgCO₂e</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const factorSource = factorSourceFromSnapshot(
                    e.factorSnapshot,
                    e.emissionFactor?.source ?? null,
                  );
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">
                        <Link
                          href={`/carbon-footprint/value-chain/${e.id}`}
                          className="hover:underline"
                        >
                          {e.month.toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                          })}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CATEGORY_LABEL[e.category] ?? e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/carbon-footprint/value-chain/${e.id}`}
                          className="hover:underline"
                        >
                          {e.description}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.site?.name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {factorSource ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.recordStatus === "ACTIVE"
                              ? "default"
                              : e.recordStatus === "DRAFT"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {e.recordStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {e.kgCo2e ? (
                          Number(e.kgCo2e).toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
