import Link from "next/link"

import { FUEL_TYPES } from "@/lib/carbon-options"
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
import type { FuelFactorOption } from "@/lib/fuel-factor-preview"
import { DeleteFuelEntryButton } from "@/components/carbon/delete-entry-button"
import { RegisterFuelDialog } from "@/components/carbon/register-fuel-dialog"
import { CarbonFiltersBar } from "@/components/carbon/carbon-filters-bar"
import { ExportMenu } from "@/components/export-menu"

type Site = { id: string; name: string }

type Entry = {
  id: string
  fuelType: string
  quantity: string
  unit: string
  month: Date
  kgCo2e: string | null
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

function fuelLabel(v: string) {
  return FUEL_TYPES.find((f) => f.value === v)?.label ?? v
}

export function FuelPanel({
  entries,
  sites,
  factors,
  companyId,
  searchString,
  hasActiveFilters,
}: {
  entries: Entry[]
  sites: Site[]
  factors: FuelFactorOption[]
  companyId: string
  /** Pre-serialised query string from the page; threaded into ExportMenu so
   *  the export honours the same filter slice the user is viewing. */
  searchString?: string
  /** True when the user has any filter applied — used to swap the empty
   *  state copy from "no entries yet" → "no entries match these filters". */
  hasActiveFilters?: boolean
}) {
  const totalKg = entries.reduce(
    (sum, e) => sum + (e.kgCo2e ? Number(e.kgCo2e) : 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scope 1 — Fuel combustion</h2>
          <p className="text-sm text-muted-foreground">
            Direct emissions from owned sources (vehicles, boilers, generators).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            basePath="/carbon-footprint/fuel/export"
            searchString={searchString}
          />
          <RegisterFuelDialog
            sites={sites}
            factors={factors}
            companyId={companyId}
          />
        </div>
      </div>

      <CarbonFiltersBar sites={sites} showSourceType />

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
                  ? "No fuel entries match these filters."
                  : "No fuel entries yet."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters ? (
                  "Adjust or clear the filters above."
                ) : (
                  <>
                    Click <span className="font-medium">Register Fuel</span> above
                    to add diesel, natural gas, LPG, etc.
                  </>
                )}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Factor source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">kgCO₂e</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      <Link
                        href={`/carbon-footprint/fuel/${e.id}`}
                        className="hover:underline"
                      >
                        {e.month.toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                        })}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/carbon-footprint/fuel/${e.id}`}
                        className="hover:underline"
                      >
                        {fuelLabel(e.fuelType)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {Number(e.quantity).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                      <span className="ml-1 text-muted-foreground">{e.unit}</span>
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
                      {e.kgCo2e ? (
                        Number(e.kgCo2e).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteFuelEntryButton id={e.id} />
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
