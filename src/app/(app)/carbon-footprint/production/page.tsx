import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { flags } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { computePef } from "@/lib/production";
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
import { ComingSoonPanel } from "@/components/carbon/coming-soon-panel";
import { DeleteProductionVolumeButton } from "@/components/carbon/delete-production-volume-button";
import { PefPanel } from "@/components/carbon/pef-panel";
import { RegisterProductionDialog } from "@/components/carbon/register-production-dialog";

export const dynamic = "force-dynamic";

const intnf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export default async function ProductionPage() {
  if (!flags.productionIntensityEnabled) {
    return (
      <ComingSoonPanel
        title="Production emissions"
        description="Track per-product CO2 intensity — inputs (raw materials, energy per unit) and allocated emissions across your output volume."
        examples={[
          "Product-level emission factors (kgCO2e per unit produced)",
          "Link production volume to your Scope 1 + 2 consumption",
          "Allocate site emissions across product lines",
          "Calculate carbon intensity per ton of output for ESG reporting",
        ]}
      />
    );
  }

  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint/production");

  const year = new Date().getUTCFullYear();

  const [rows, sites, pef] = await Promise.all([
    prisma.productionVolume.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: [{ month: "desc" }, { productLabel: "asc" }],
      include: { site: { select: { name: true } } },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    computePef({
      companyId: ctx.company.id,
      year,
      scopes: { s1: true, s2: true, s3: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Production intensity</h2>
          <p className="text-sm text-muted-foreground">
            Capture monthly output per product or line — Production Emission
            Factor (PEF) is computed live from your Scope 1/2/3 totals.
            Recording one row per period × site × product is enough.
          </p>
        </div>
        <RegisterProductionDialog sites={sites} />
      </div>

      <PefPanel
        year={year}
        byScope={pef.byScope}
        unitMix={pef.unitMix}
        primaryUnit={pef.pef !== null ? pef.denominatorUnit : null}
      />

      <Card className="gap-0 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Production volumes{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {rows.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium">No volume recorded yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click <span className="font-medium">Record output</span> above
                to start tracking PEF.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Product / line</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {r.month.toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.productLabel}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.site?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {intnf.format(Number(r.volume))}
                      <span className="ml-1 text-muted-foreground">
                        {r.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.recordStatus === "ACTIVE"
                            ? "default"
                            : r.recordStatus === "DRAFT"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {r.recordStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteProductionVolumeButton
                        id={r.id}
                        productLabel={r.productLabel}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
