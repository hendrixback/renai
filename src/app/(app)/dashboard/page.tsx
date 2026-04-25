import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ActivityIcon,
  FlameIcon,
  NetworkIcon,
  PlusIcon,
  RecycleIcon,
  Scale3DIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { getCarbonSummary } from "@/lib/carbon";
import { getDashboardData } from "@/lib/dashboard";
import { flags } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { computePef } from "@/lib/production";
import { getTaskSummary, listTasks } from "@/lib/tasks";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { OpenTasksWidget } from "@/components/dashboard/open-tasks-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { InsightsAlerts } from "@/components/insights-alerts";
import { CategoryBarChart } from "@/components/dashboard-category-chart";
import { TreatmentDonutChart } from "@/components/dashboard-treatment-chart";
import { DashboardRecentFlows } from "@/components/dashboard-recent-flows";
import {
  LatestTeamActions,
  type TeamActionEntry,
} from "@/components/dashboard/latest-team-actions";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

type SearchParams = { year?: string; site?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/dashboard");

  const sp = await searchParams;
  const year = sp.year ? Number.parseInt(sp.year, 10) : undefined;
  const filter = {
    year: Number.isFinite(year) ? year : undefined,
    siteId: sp.site || undefined,
  };

  // PEF — only fetched when the flag is on; falls back to null for the
  // KPI's "—" state otherwise. Gives the dashboard a reading even if the
  // user hasn't visited /carbon-footprint/production yet.
  const pefYear = filter.year ?? new Date().getUTCFullYear();
  const pefPromise = flags.productionIntensityEnabled
    ? computePef({
        companyId: ctx.company.id,
        year: pefYear,
        scopes: { s1: true, s2: true, s3: true },
        siteId: filter.siteId,
      })
    : Promise.resolve(null);

  const tasksPromise = flags.tasksEnabled
    ? Promise.all([
        listTasks({
          companyId: ctx.company.id,
          currentUserId: ctx.user.id,
          filters: { myTasks: true, overdueOnly: false },
          take: 5,
        }),
        getTaskSummary({ companyId: ctx.company.id }),
      ])
    : Promise.resolve(null);

  const [data, carbon, activitiesRaw, sites, pef, tasksBundle] = await Promise.all([
    getDashboardData(ctx.company.id, filter),
    getCarbonSummary(ctx.company.id, filter),
    prisma.activityLog.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    pefPromise,
    tasksPromise,
  ]);

  const myActiveTasks = tasksBundle
    ? tasksBundle[0].filter(
        (t) => t.status === "OPEN" || t.status === "IN_PROGRESS",
      )
    : [];
  const teamTaskSummary = tasksBundle ? tasksBundle[1] : null;

  const { kpi, byCategory, byTreatment, recentFlows, alerts, meta } = data;
  const activities: TeamActionEntry[] = activitiesRaw.map((a) => ({
    id: a.id,
    activityType: a.activityType,
    module: a.module,
    recordId: a.recordId,
    description: a.description,
    createdAt: a.createdAt,
    userName: a.user?.name ?? null,
    userEmail: a.user?.email ?? null,
  }));

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

        <DashboardFilters sites={sites} />

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

        {/* Carbon KPIs — Spec §7.5. */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Scope 1 emissions"
            value={
              <>
                {nf.format(carbon.scope1 / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption={`${carbon.fuelEntryCount} fuel ${carbon.fuelEntryCount === 1 ? "entry" : "entries"} logged`}
            icon={<FlameIcon />}
            accent="warning"
          />
          <KpiCard
            label="Scope 2 emissions"
            value={
              <>
                {nf.format(carbon.scope2 / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption={`${carbon.electricityEntryCount} electricity ${carbon.electricityEntryCount === 1 ? "entry" : "entries"} (market-based)`}
            icon={<ZapIcon />}
            accent="default"
          />
          <KpiCard
            label="Scope 3 emissions"
            value={
              <>
                {nf.format(carbon.scope3 / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption={`${carbon.scope3EntryCount} value-chain ${carbon.scope3EntryCount === 1 ? "entry" : "entries"}`}
            icon={<NetworkIcon />}
            accent="default"
          />
          <KpiCard
            label="Total tracked footprint"
            value={
              <>
                {nf.format(carbon.total / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption="Scope 1 + Scope 2 + Scope 3 + waste impact"
            icon={<Scale3DIcon />}
            accent={carbon.total > 0 ? "success" : "default"}
          />
        </div>

        {/* Production intensity (PEF) — Spec §13 + Amendment A2.
            Computed live from carbon totals ÷ ProductionVolume sums for
            the active year. Hidden when the flag is off. */}
        {pef ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={`Production Emission Factor — ${pefYear}`}
              value={
                pef.pef !== null ? (
                  <>
                    {nf.format(pef.pef)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      kgCO₂e/{pef.denominatorUnit}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
              caption={
                pef.pef !== null
                  ? `${nf.format(pef.numeratorKg / 1000)} tCO₂e ÷ ${nf.format(pef.denominatorVolume)} ${pef.denominatorUnit}`
                  : pef.rowCount === 0
                    ? "Record production volume to enable PEF"
                    : "Mixed units — fix on /carbon-footprint/production"
              }
              icon={<Scale3DIcon />}
              accent={pef.pef !== null ? "success" : "default"}
            />
          </div>
        ) : null}

        {/* Empty-state CTA — fires when no waste flows AND no carbon entries
            have been registered yet. Skips once the user has any data so
            seasoned tenants don't see it. */}
        {kpi.total === 0 &&
        carbon.fuelEntryCount === 0 &&
        carbon.electricityEntryCount === 0 ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <SparklesIcon className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold">
                    Welcome to RenAI — let&apos;s populate your footprint
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Start by registering a waste flow or logging this month&apos;s
                    fuel and electricity. The dashboard fills in as you add
                    records.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" nativeButton={false} render={<Link href="/waste-flows/new" />}>
                  <RecycleIcon className="size-4" />
                  Add Waste Flow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/carbon-footprint/fuel" />}
                >
                  <FlameIcon className="size-4" />
                  Log Scope 1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/carbon-footprint/electricity" />}
                >
                  <ZapIcon className="size-4" />
                  Log Scope 2
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Alerts */}
        <InsightsAlerts alerts={alerts} />

        {/* Open tasks widget — only when the Tasks module is on. */}
        {flags.tasksEnabled && teamTaskSummary ? (
          <OpenTasksWidget
            myTasks={myActiveTasks}
            teamOpen={teamTaskSummary.open + teamTaskSummary.inProgress}
            teamOverdue={teamTaskSummary.overdue}
          />
        ) : null}

        {/* Latest team actions (Spec §7.7) */}
        <LatestTeamActions activities={activities} />

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
              <CardTitle>Data Completeness</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <SnapshotRow
                label="With LoW / EWC code"
                value={kpi.total - getMissingLow(data)}
                total={kpi.total}
              />
              <SnapshotRow
                label="With treatment code"
                value={kpi.total - kpi.untreatedCount}
                total={kpi.total}
              />
              <SnapshotRow
                label="With category"
                value={kpi.withCategory}
                total={kpi.total}
              />
              <SnapshotRow
                label="With site or location"
                value={kpi.withSite}
                total={kpi.total}
              />
              <SnapshotRow
                label="With estimated quantity"
                value={kpi.withQuantity}
                total={kpi.total}
              />
              <SnapshotRow
                label="Hazardous (flagged)"
                value={kpi.hazardous}
                total={kpi.total}
                tone="danger"
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
