import { redirect } from "next/navigation";
import {
  ActivityIcon,
  FlameIcon,
  NetworkIcon,
  RecycleIcon,
  Scale3DIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnalysisData } from "@/lib/analysis";
import {
  parseAnalysisFilters,
  describeAnalysisFilters,
  type AnalysisSearchParams,
} from "@/lib/analysis-filters";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ExportMenu } from "@/components/export-menu";
import { AnalysisFilters } from "@/components/analysis/analysis-filters";
import { EmissionsTrendChart } from "@/components/analysis/emissions-trend-chart";
import { EmissionsByScopeChart } from "@/components/analysis/emissions-by-scope-chart";
import { EmissionsByPlantChart } from "@/components/analysis/emissions-by-plant-chart";
import { BreakdownDonutChart } from "@/components/analysis/breakdown-donut-chart";
import { HorizontalBarChart } from "@/components/analysis/horizontal-bar-chart";
import { DataQualitySummary } from "@/components/analysis/data-quality-summary";
import { TopSourcesTable } from "@/components/analysis/top-sources-table";

export const dynamic = "force-dynamic";

const tonsFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

function deltaPct(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return ((current - prior) / prior) * 100;
}

function YoyTrend({
  current,
  prior,
  invert = false,
}: {
  current: number;
  prior: number;
  invert?: boolean;
}) {
  const pct = deltaPct(current, prior);
  if (pct === null) {
    return (
      <span className="text-xs text-muted-foreground">No prior year data</span>
    );
  }
  const rising = pct > 0;
  // For emissions, rising = bad → red; for completeness metrics use invert.
  const isPositive = invert ? rising : !rising;
  const Icon = rising ? TrendingUpIcon : TrendingDownIcon;
  return (
    <span
      className={
        "inline-flex items-center gap-1 text-xs " +
        (isPositive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive")
      }
    >
      <Icon className="size-3.5" />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}% vs prior year
    </span>
  );
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<AnalysisSearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/analysis");

  const sp = await searchParams;
  const filters = parseAnalysisFilters(sp);

  const [data, sites] = await Promise.all([
    getAnalysisData(ctx.company.id, filters),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const subtitle = describeAnalysisFilters(filters, { sites });

  // Reconstruct the URL search string for the export menu so it carries
  // the same filters the user is looking at.
  const exportSearch = new URLSearchParams();
  if (sp.year) exportSearch.set("year", String(sp.year));
  if (sp.site) exportSearch.set("site", String(sp.site));
  if (sp.scopes) exportSearch.set("scopes", String(sp.scopes));
  if (sp.yoy) exportSearch.set("yoy", String(sp.yoy));

  const visibleScopes = (
    ["s1", "s2", "s3", "waste"] as const
  ).filter((s) => filters.scopes.has(s));

  const carbonTotalEntries =
    data.current.s1EntryCount +
    data.current.s2EntryCount +
    data.current.s3EntryCount;
  const wasteTotalFlows = data.wasteSummary.totalFlows;

  const wasteTreatmentBreakdown = [
    {
      key: "recovery",
      label: "Recovery",
      value: data.wasteSummary.recoveryCount,
    },
    {
      key: "disposal",
      label: "Disposal",
      value: data.wasteSummary.disposalCount,
    },
    {
      key: "untreated",
      label: "Not assigned",
      value: data.wasteSummary.untreatedCount,
    },
  ].filter((d) => d.value > 0);

  const wasteHazardousBreakdown = [
    {
      key: "hazardous",
      label: "Hazardous",
      value: data.wasteSummary.hazardousCount,
    },
    {
      key: "non-hazardous",
      label: "Non-hazardous",
      value: data.wasteSummary.nonHazardousCount,
    },
  ].filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Analysis"
        actions={
          <ExportMenu
            basePath="/analysis/export"
            searchString={exportSearch.toString()}
            label="Export view"
          />
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Analysis{" "}
              <span className="text-muted-foreground">— {filters.year}</span>
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <AnalysisFilters sites={sites} defaultYear={filters.year} />

        {/* KPI summary — matches Dashboard scope tiles but adds YoY delta. */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total emissions"
            value={
              <>
                {tonsFormatter.format(data.current.total / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption={`${carbonTotalEntries} carbon entries · ${wasteTotalFlows} waste flows`}
            icon={<Scale3DIcon />}
            accent="default"
            trend={
              filters.yoy && data.prior ? (
                <YoyTrend
                  current={data.current.total}
                  prior={data.prior.total}
                />
              ) : null
            }
          />
          <KpiCard
            label="Scope 1"
            value={
              <>
                {tonsFormatter.format(data.current.s1 / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption={`${data.current.s1EntryCount} fuel entries`}
            icon={<FlameIcon />}
            accent="warning"
            trend={
              filters.yoy && data.prior ? (
                <YoyTrend current={data.current.s1} prior={data.prior.s1} />
              ) : null
            }
          />
          <KpiCard
            label="Scope 2"
            value={
              <>
                {tonsFormatter.format(data.current.s2 / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption={`${data.current.s2EntryCount} electricity entries (market-based)`}
            icon={<ZapIcon />}
            accent="default"
            trend={
              filters.yoy && data.prior ? (
                <YoyTrend current={data.current.s2} prior={data.prior.s2} />
              ) : null
            }
          />
          <KpiCard
            label="Scope 3"
            value={
              <>
                {tonsFormatter.format(data.current.s3 / 1000)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tCO₂e
                </span>
              </>
            }
            caption={`${data.current.s3EntryCount} value-chain entries`}
            icon={<NetworkIcon />}
            accent="default"
            trend={
              filters.yoy && data.prior ? (
                <YoyTrend current={data.current.s3} prior={data.prior.s3} />
              ) : null
            }
          />
        </div>

        {/* Trend + scope split */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Total emissions over time</CardTitle>
              <CardDescription>
                Monthly tCO₂e for {filters.year}
                {filters.yoy ? ` with ${filters.priorYear} overlay` : ""}.
                Waste impact is annualised and spread evenly across months.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.current.total === 0 &&
              (!data.prior || data.prior.total === 0) ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  No emissions recorded for this period.
                </div>
              ) : (
                <EmissionsTrendChart
                  monthly={data.monthly}
                  monthlyPrior={
                    filters.yoy ? data.monthlyPrior ?? null : null
                  }
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By scope</CardTitle>
              <CardDescription>
                Annual share between Scope 1, 2, 3 and waste impact.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownDonutChart
                data={data.byScope.map((s) => ({
                  key: s.scope,
                  label: s.label,
                  value: s.kgCo2e,
                }))}
                emptyLabel="No emissions data"
              />
            </CardContent>
          </Card>
        </div>

        {/* Stacked bar by scope-month + by plant */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Emissions by scope (monthly)</CardTitle>
              <CardDescription>
                Stacked tCO₂e per scope across {filters.year}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visibleScopes.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  Select at least one scope.
                </div>
              ) : (
                <EmissionsByScopeChart
                  monthly={data.monthly}
                  visibleScopes={visibleScopes}
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Emissions by plant</CardTitle>
              <CardDescription>
                Total tCO₂e per site, all scopes stacked. Records without a
                site fall under &ldquo;Unassigned&rdquo;.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.bySite.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  No site-level emissions yet.
                </div>
              ) : (
                <EmissionsByPlantChart
                  bySite={data.bySite}
                  visibleScopes={visibleScopes}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-scope deep dives — Scope 1 fuel mix + Scope 3 categories */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Scope 1 by fuel type</CardTitle>
              <CardDescription>
                Annual breakdown of stationary + mobile combustion sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownDonutChart
                data={data.byFuel}
                emptyLabel={
                  filters.scopes.has("s1")
                    ? "No Scope 1 entries"
                    : "Scope 1 disabled in filters"
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Scope 3 by category</CardTitle>
              <CardDescription>
                GHG Protocol value-chain categories for {filters.year}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownDonutChart
                data={data.byScope3Category}
                emptyLabel={
                  filters.scopes.has("s3")
                    ? "No Scope 3 entries"
                    : "Scope 3 disabled in filters"
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Waste section */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Waste volume by category</CardTitle>
              <CardDescription>
                Monthly throughput in tons (KG/TON-unit flows only).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={data.wasteByCategory}
                unitLabel="t/mo"
                emptyLabel={
                  filters.scopes.has("waste")
                    ? "No waste flows for this period"
                    : "Waste disabled in filters"
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recovery vs disposal</CardTitle>
              <CardDescription>
                Treatment classification by R/D code on each flow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownDonutChart
                data={wasteTreatmentBreakdown}
                emptyLabel="No waste flows recorded"
                unitLabel="flows"
                divisor={1}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Hazardous split</CardTitle>
              <CardDescription>
                Hazardous-flag breakdown across waste flows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownDonutChart
                data={wasteHazardousBreakdown}
                emptyLabel="No waste flows recorded"
                unitLabel="flows"
                divisor={1}
              />
            </CardContent>
          </Card>
        </div>

        {/* Data quality + top sources */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Data completeness</CardTitle>
              <CardDescription>
                Records ready for audit — Spec §14.10.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataQualitySummary
                quality={data.dataQuality}
                wasteTotalFlows={wasteTotalFlows}
                carbonTotalEntries={carbonTotalEntries}
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top emission sources</CardTitle>
              <CardDescription>
                Largest individual records across selected scopes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopSourcesTable rows={data.topSources} />
            </CardContent>
          </Card>
        </div>

        {/* Waste KPI bar */}
        {filters.scopes.has("waste") && wasteTotalFlows > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Waste flows"
              value={wasteTotalFlows}
              caption={`${data.wasteSummary.hazardousCount} hazardous · ${data.wasteSummary.nonHazardousCount} non`}
              icon={<RecycleIcon />}
              accent="default"
            />
            <KpiCard
              label="Monthly waste throughput"
              value={
                <>
                  {tonsFormatter.format(data.wasteSummary.monthlyTons)}
                  <span className="ml-1 text-base font-normal text-muted-foreground">
                    t / mo
                  </span>
                </>
              }
              caption="KG/TON-unit flows only"
              icon={<Scale3DIcon />}
              accent="default"
            />
            <KpiCard
              label="Recovery rate"
              value={
                <>
                  {wasteTotalFlows > 0
                    ? Math.round(
                        (data.wasteSummary.recoveryCount /
                          (data.wasteSummary.recoveryCount +
                            data.wasteSummary.disposalCount)) *
                          100,
                      )
                    : 0}
                  %
                </>
              }
              caption={`${data.wasteSummary.recoveryCount} recovery · ${data.wasteSummary.disposalCount} disposal`}
              icon={<ActivityIcon />}
              accent={
                data.wasteSummary.recoveryCount >=
                data.wasteSummary.disposalCount
                  ? "success"
                  : "warning"
              }
            />
            <KpiCard
              label="Untreated flows"
              value={data.wasteSummary.untreatedCount}
              caption={
                data.wasteSummary.untreatedCount > 0
                  ? "Missing R/D treatment code"
                  : "All flows have a treatment code"
              }
              icon={<ActivityIcon />}
              accent={
                data.wasteSummary.untreatedCount > 0 ? "danger" : "success"
              }
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
