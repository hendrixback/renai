import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteElectricityEntryButton } from "@/components/carbon/delete-entry-button"
import { RegisterElectricityDialog } from "@/components/carbon/register-electricity-dialog"
import { CarbonFiltersBar } from "@/components/carbon/carbon-filters-bar"
import { ExportMenu } from "@/components/export-menu"

type Site = { id: string; name: string }

type Entry = {
  id: string
  kwh: string
  month: Date
  renewablePercent: string | null
  energyProvider: string | null
  /** Pure grid factor × kWh (Spec §11.4). */
  locationBasedKgCo2e: string | null
  /** Contract-adjusted (RECs/GoOs). Falls back to legacy kgCo2e for old rows. */
  marketBasedKgCo2e: string | null
  siteName: string | null
  locationName: string | null
  notes: string | null
  recordStatus: "DRAFT" | "ACTIVE" | "ARCHIVED"
  factorSource: string | null
}

const STATUS_TONE: Record<Entry["recordStatus"], "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  DRAFT: "outline",
  ARCHIVED: "secondary",
}

function fmt(v: string | null): string {
  if (!v) return "—"
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function ElectricityPanel({
  entries,
  sites,
  searchString,
  hasActiveFilters,
}: {
  entries: Entry[]
  sites: Site[]
  searchString?: string
  hasActiveFilters?: boolean
}) {
  const totalLocation = entries.reduce(
    (sum, e) => sum + (e.locationBasedKgCo2e ? Number(e.locationBasedKgCo2e) : 0),
    0,
  )
  const totalMarket = entries.reduce(
    (sum, e) => sum + (e.marketBasedKgCo2e ? Number(e.marketBasedKgCo2e) : 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scope 2 — Purchased electricity</h2>
          <p className="text-sm text-muted-foreground">
            GHG Protocol dual calculation. Location-based = pure grid factor
            × kWh. Market-based = contract-adjusted (applies your renewable
            %).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            basePath="/carbon-footprint/electricity/export"
            searchString={searchString}
          />
          <RegisterElectricityDialog sites={sites} />
        </div>
      </div>

      <CarbonFiltersBar sites={sites} />

      <Card className="gap-0 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Entries{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {entries.length}
            </span>
          </CardTitle>
          <div className="flex items-center gap-6 text-sm tabular-nums text-muted-foreground">
            <span>
              Location-based:{" "}
              <span className="font-medium text-foreground">
                {totalLocation.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                kgCO₂e
              </span>
            </span>
            <span>
              Market-based:{" "}
              <span className="font-medium text-foreground">
                {totalMarket.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                kgCO₂e
              </span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium">
                {hasActiveFilters
                  ? "No electricity entries match these filters."
                  : "No electricity entries yet."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters ? (
                  "Adjust or clear the filters above."
                ) : (
                  <>
                    Click <span className="font-medium">Register Electricity</span>{" "}
                    above to add your monthly consumption.
                  </>
                )}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">kWh</TableHead>
                  <TableHead className="text-right">Renewable %</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Factor source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    className="text-right"
                    title="Pure grid factor × kWh. Reflects the territorial grid mix."
                  >
                    Location kgCO₂e
                  </TableHead>
                  <TableHead
                    className="text-right"
                    title="Contract-adjusted via renewable % (RECs / GoOs)."
                  >
                    Market kgCO₂e
                  </TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      <Link
                        href={`/carbon-footprint/electricity/${e.id}`}
                        className="hover:underline"
                      >
                        {e.month.toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                        })}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {Number(e.kwh).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {e.renewablePercent ? (
                        <>{Number(e.renewablePercent).toFixed(1)}%</>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.energyProvider ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.siteName ?? e.locationName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.factorSource ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[e.recordStatus]}>
                        {e.recordStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {e.locationBasedKgCo2e ? (
                        fmt(e.locationBasedKgCo2e)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {e.marketBasedKgCo2e ? (
                        fmt(e.marketBasedKgCo2e)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteElectricityEntryButton id={e.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
