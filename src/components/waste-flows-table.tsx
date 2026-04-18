import { FlameIcon, StarIcon } from "lucide-react"

import {
  FREQUENCY_OPTIONS,
  STATUS_OPTIONS,
  UNIT_OPTIONS,
} from "@/lib/waste-flows"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ClickableRow } from "@/components/clickable-row"

function label<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value
}

export type WasteFlowRow = {
  id: string
  name: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  estimatedQuantity: string | null
  quantityUnit: string
  frequency: string
  isHazardous: boolean
  isPriority: boolean
  createdAt: Date
  category: { name: string } | null
  wasteCode: { displayCode: string; isHazardous: boolean } | null
  site: { name: string } | null
  locationName: string | null
}

export function WasteFlowsTable({ rows }: { rows: WasteFlowRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 p-12 text-center">
        <p className="text-sm font-medium">No waste flows yet.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Click <span className="font-medium">New Waste Flow</span> to register
          your first stream. You can always edit it later.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>LoW Code</TableHead>
            <TableHead>Site / Location</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <ClickableRow key={row.id} href={`/waste-flows/${row.id}`}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                {row.category ? (
                  <span className="text-sm">{row.category.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {row.wasteCode ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-xs tabular-nums">
                      {row.wasteCode.displayCode}
                    </span>
                    {row.wasteCode.isHazardous ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Haz
                      </Badge>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {row.site?.name ?? row.locationName ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {row.estimatedQuantity ? (
                  <>
                    {row.estimatedQuantity}
                    <span className="ml-1 text-muted-foreground">
                      {label(UNIT_OPTIONS, row.quantityUnit)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {label(FREQUENCY_OPTIONS, row.frequency)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    row.status === "ACTIVE"
                      ? "default"
                      : row.status === "INACTIVE"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {label(STATUS_OPTIONS, row.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  {row.isHazardous ? (
                    <FlameIcon
                      className="size-4 text-destructive"
                      aria-label="Hazardous"
                    />
                  ) : null}
                  {row.isPriority ? (
                    <StarIcon
                      className="size-4 fill-amber-500 text-amber-500"
                      aria-label="Priority"
                    />
                  ) : null}
                </div>
              </TableCell>
            </ClickableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
