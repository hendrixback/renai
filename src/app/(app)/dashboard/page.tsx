import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ActivityIcon,
  FlameIcon,
  PlusIcon,
  RecycleIcon,
  Scale3DIcon,
} from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { InsightsAlerts } from "@/components/insights-alerts";
import { CategoryBarChart } from "@/components/dashboard-category-chart";
import { TreatmentDonutChart } from "@/components/dashboard-treatment-chart";
import { DashboardRecentFlows } from "@/components/dashboard-recent-flows";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/dashboard");

  const data = await getDashboardData(ctx.company.id);

  const { kpi, byCategory, byTreatment, recentFlows, alerts, meta } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link href="/waste-flows/new">
                <PlusIcon className="size-4" />
                Add Waste Flow
              </Link>
            }
          />
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        {/* Company hero */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {ctx.company.name}{" "}
              <span className="text-muted-foreground">— Overview</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Sustainability operations snapshot
              {meta.siteCount > 0
                ? ` · ${meta.siteCount} site${meta.siteCount === 1 ? "" : "s"}`
                : null}
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            Live
          </Badge>
        </div>

        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Waste Flows"
            value={kpi.total}
            caption={`${kpi.active} active · ${kpi.inactive} inactive · ${kpi.archived} archived`}
            icon={<RecycleIcon />}
            accent="success"
          />
          <KpiCard
            label="Est. Monthly Volume"
            value={
              <>
                {nf.format(kpi.monthlyTons)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  t
                </span>
              </>
            }
            caption={
              kpi.nonConvertible > 0
                ? `+ ${kpi.nonConvertible} flow(s) in non-tonnage units`
                : "normalized to tons · KG/TON flows only"
            }
            icon={<Scale3DIcon />}
            accent="default"
          />
          <KpiCard
            label="Hazardous Flows"
            value={kpi.hazardous}
            caption={
              kpi.hazardous > 0
                ? `${kpi.priority} marked priority`
                : "no hazardous streams"
            }
            icon={<FlameIcon />}
            accent={kpi.hazardous > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Recovery Rate"
            value={<>{kpi.recoveryRate}%</>}
            caption={`${kpi.recoveryCount} recovery · ${kpi.disposalCount} disposal · ${kpi.untreatedCount} unassigned`}
            icon={<ActivityIcon />}
            accent={
              kpi.recoveryRate >= 70
                ? "success"
                : kpi.recoveryRate >= 40
                  ? "warning"
                  : kpi.total === 0
                    ? "default"
                    : "danger"
            }
          />
        </div>

        {/* Alerts */}
        <InsightsAlerts alerts={alerts} />

        {/* Recent flows + By Category */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DashboardRecentFlows flows={recentFlows} />
          </div>
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>By Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {byCategory.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No flows yet
                </p>
              ) : (
                <CategoryBarChart data={byCategory} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Treatment pathway donut + metadata summary */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 lg:col-span-1">
            <CardHeader>
              <CardTitle>Treatment Pathway</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {byTreatment.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No flows yet
                </p>
              ) : (
                <TreatmentDonutChart data={byTreatment} />
              )}
            </CardContent>
          </Card>

          <Card className="gap-3 lg:col-span-2">
            <CardHeader>
              <CardTitle>Compliance Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <SnapshotRow
                label="With LoW / EWC code"
                value={kpi.total - getMissingLow(data)}
                total={kpi.total}
              />
              <SnapshotRow
                label="Hazardous (flagged)"
                value={kpi.hazardous}
                total={kpi.total}
                tone="danger"
              />
              <SnapshotRow
                label="With Treatment code"
                value={kpi.total - kpi.untreatedCount}
                total={kpi.total}
              />
              <SnapshotRow
                label="Priority"
                value={kpi.priority}
                total={kpi.total}
                tone="warning"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function getMissingLow(
  data: Awaited<ReturnType<typeof getDashboardData>>,
): number {
  return data.alerts
    .filter((a) => a.message.includes("missing LoW"))
    .reduce((n, a) => {
      const m = a.message.match(/^(\d+)/);
      return m ? n + Number(m[1]) : n;
    }, 0);
}

function SnapshotRow({
  label,
  value,
  total,
  tone = "default",
}: {
  label: string
  value: number
  total: number
  tone?: "default" | "warning" | "danger"
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const barColor =
    tone === "danger"
      ? "bg-destructive"
      : tone === "warning"
        ? "bg-amber-500"
        : "bg-primary"
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value}
          <span className="text-muted-foreground">/{total}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {pct}%
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
