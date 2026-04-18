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

type Site = { id: string; name: string }

type Entry = {
  id: string
  kwh: string
  month: Date
  renewablePercent: string | null
  energyProvider: string | null
  kgCo2e: string | null
  siteName: string | null
  locationName: string | null
  notes: string | null
}

export function ElectricityPanel({
  entries,
  sites,
}: {
  entries: Entry[]
  sites: Site[]
}) {
  const totalKg = entries.reduce(
    (sum, e) => sum + (e.kgCo2e ? Number(e.kgCo2e) : 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scope 2 — Purchased electricity</h2>
          <p className="text-sm text-muted-foreground">
            Indirect emissions from electricity, heat, and steam you buy.
            Renewable % reduces the grid factor proportionally.
          </p>
        </div>
        <RegisterElectricityDialog sites={sites} />
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
              <p className="text-sm font-medium">No electricity entries yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click <span className="font-medium">Register Electricity</span>{" "}
                above to add your monthly consumption.
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
                  <TableHead className="text-right">kgCO₂e</TableHead>
                  <TableHead className="w-[60px]" />
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
