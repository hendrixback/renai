import {
  FlameIcon,
  LeafIcon,
  RecycleIcon,
  ZapIcon,
} from "lucide-react"

import type { DashboardLike } from "@/components/carbon/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/kpi-card"

export function OverviewPanel({
  summary,
  companyName,
}: {
  summary: DashboardLike["summary"]
  companyName: string
}) {
  const fmt = (kg: number) =>
    kg >= 1000
      ? `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t`
      : `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`

  const rows: {
    label: string
    value: number
    total: number
    tone: "default" | "warning" | "danger"
  }[] = [
    {
      label: "Scope 1 — Fuel",
      value: summary.scope1,
      total: summary.total || 1,
      tone: "warning",
    },
    {
      label: "Scope 2 — Electricity",
      value: summary.scope2,
      total: summary.total || 1,
      tone: "default",
    },
    {
      label: "Waste (current disposal)",
      value: summary.wasteCurrent,
      total: summary.total || 1,
      tone: "danger",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total estimated emissions"
          value={<>{fmt(summary.total)}</>}
          caption={`CO₂e across Scope 1, Scope 2, and waste — ${companyName}`}
          icon={<LeafIcon />}
          accent="success"
        />
        <KpiCard
          label="Scope 1 — Fuel"
          value={<>{fmt(summary.scope1)}</>}
          caption={`${summary.fuelEntryCount} entr${summary.fuelEntryCount === 1 ? "y" : "ies"}`}
          icon={<FlameIcon />}
          accent="warning"
        />
        <KpiCard
          label="Scope 2 — Electricity"
          value={<>{fmt(summary.scope2)}</>}
          caption={`${summary.electricityEntryCount} entr${summary.electricityEntryCount === 1 ? "y" : "ies"}`}
          icon={<ZapIcon />}
          accent="default"
        />
        <KpiCard
          label="Recycling saving potential"
          value={<>{fmt(Math.abs(summary.wasteSavingPotential))}</>}
          caption={`if your ${summary.wasteFlowCount} waste flow${summary.wasteFlowCount === 1 ? "" : "s"} were recycled`}
          icon={<RecycleIcon />}
          accent="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emissions breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {summary.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No emissions data yet. Start by registering a fuel or
              electricity entry in the tabs above.
            </p>
          ) : (
            rows.map((r) => {
              const pct = Math.round((r.value / r.total) * 100)
              const bar =
                r.tone === "danger"
                  ? "bg-destructive"
                  : r.tone === "warning"
                    ? "bg-amber-500"
                    : "bg-primary"
              return (
                <div key={r.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{r.label}</span>
                    <span className="font-medium tabular-nums">
                      {fmt(r.value)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {pct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How this is calculated</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Emission factors are bundled defaults based on public sources —{" "}
            <Badge variant="outline" className="font-mono text-[10px]">
              DEFRA 2024
            </Badge>
            ,{" "}
            <Badge variant="outline" className="font-mono text-[10px]">
              EPA WARM
            </Badge>
            ,{" "}
            <Badge variant="outline" className="font-mono text-[10px]">
              EEA 2023
            </Badge>
            . Electricity factors are country-specific; fuel + waste use
            global averages. All results are estimates — for audited
            reporting, supplement with your utility bills and waste
            consignment notes.
          </p>
          <p>
            <strong>Scope 1</strong> = owned combustion (company vehicles,
            boilers). <strong>Scope 2</strong> = purchased energy (grid
            electricity; renewable %% reduces it). <strong>Waste</strong>{" "}
            shown separately as Scope 3 upstream impact.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
