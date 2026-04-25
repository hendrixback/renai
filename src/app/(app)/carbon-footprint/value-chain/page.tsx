import { notFound } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
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
import { ComingSoonPanel } from "@/components/carbon/coming-soon-panel";
import { RegisterScope3Dialog } from "@/components/carbon/register-scope3-dialog";

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

export default async function ValueChainPage() {
  if (!flags.scope3Enabled) {
    // Flag not on yet — show the original placeholder copy.
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

  const [entries, sites] = await Promise.all([
    prisma.scope3Entry.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { month: "desc" },
      include: { site: { select: { name: true } } },
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
        <RegisterScope3Dialog sites={sites} />
      </div>

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
              <p className="text-sm font-medium">No Scope 3 entries yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click <span className="font-medium">Register Scope 3</span> above
                to log a flight, hotel stay, or other value-chain activity.
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">kgCO₂e</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      {e.month.toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_LABEL[e.category] ?? e.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {e.description}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.site?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
