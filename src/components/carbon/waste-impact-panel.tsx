import type { WasteImpactRow } from "@/lib/carbon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function fmtMass(kg: number | null): React.ReactNode {
  if (kg === null) return <span className="text-muted-foreground">—</span>
  const absValue = Math.abs(kg)
  const sign = kg < 0 ? "−" : ""
  if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })} t`
  }
  return `${sign}${absValue.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} kg`
}

export function WasteImpactPanel({ rows }: { rows: WasteImpactRow[] }) {
  const totalCurrent = rows.reduce(
    (s, r) => s + (r.currentKgCo2e ?? 0),
    0,
  )
  const totalRecycling = rows.reduce(
    (s, r) => s + (r.recyclingKgCo2e ?? 0),
    0,
  )
  const totalSaving = rows.reduce(
    (s, r) => s + (r.savingKgCo2e ?? 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Waste-related emission impact</h2>
        <p className="text-sm text-muted-foreground">
          Estimated CO₂ impact of your current waste destinations vs. best-case
          recycling.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Waste flows
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {rows.length}
            </span>
          </CardTitle>
          {rows.length > 0 ? (
            <div className="flex items-center gap-4 text-sm tabular-nums">
              <span>
                Current:{" "}
                <span className="font-medium">{fmtMass(totalCurrent)}</span>
              </span>
              <span>
                Recycling:{" "}
                <span className="font-medium">{fmtMass(totalRecycling)}</span>
              </span>
              <span
                className={
                  totalSaving < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }
              >
                Potential:{" "}
                <span className="font-medium">{fmtMass(totalSaving)}</span>
              </span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium">No waste flows yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Register your waste streams in the{" "}
                <span className="font-medium">Waste Flows</span> page and they
                will appear here with CO₂ estimates.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Current Destination</TableHead>
                  <TableHead className="text-right">Current CO₂</TableHead>
                  <TableHead className="text-right">Recycling CO₂</TableHead>
                  <TableHead className="text-right">Potential Saving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.currentDisposalLabel}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {fmtMass(r.currentKgCo2e)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {fmtMass(r.recyclingKgCo2e)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm tabular-nums ${
                        r.savingKgCo2e !== null && r.savingKgCo2e < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {fmtMass(r.savingKgCo2e)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Estimation only.</span>{" "}
        Waste CO₂ is estimated based on the current disposal method (or landfill
        when no treatment code is set). Recycling redirects significantly reduce
        landfill emissions — the &ldquo;Potential Saving&rdquo; column shows the
        delta (negative = reduction). Only mass-based waste flows (kg, ton) are
        converted; liter/m³/unit rows are skipped.
      </p>
    </div>
  )
}
