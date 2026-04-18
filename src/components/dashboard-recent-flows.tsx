import Link from "next/link"
import { ArrowRightIcon, FlameIcon, StarIcon } from "lucide-react"

import {
  FREQUENCY_OPTIONS,
  STATUS_OPTIONS,
  UNIT_OPTIONS,
} from "@/lib/waste-flows"
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
import { ClickableRow } from "@/components/clickable-row"

function label<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value
}

export type RecentFlow = {
  id: string
  name: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  estimatedQuantity: number | null
  quantityUnit: string
  frequency: string
  isHazardous: boolean
  isPriority: boolean
  categoryName: string | null
  wasteCodeDisplay: string | null
}

export function DashboardRecentFlows({ flows }: { flows: RecentFlow[] }) {
  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent Waste Flows</CardTitle>
        <Link
          href="/waste-flows"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          View all
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <p className="text-sm font-medium">No waste flows yet.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Register your first stream to start tracking compliance and
              valorization opportunities.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>LoW Code</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flows.map((f) => (
                <ClickableRow key={f.id} href={`/waste-flows/${f.id}`}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      {f.name}
                      {f.isHazardous ? (
                        <FlameIcon
                          className="size-3.5 text-destructive"
                          aria-label="Hazardous"
                        />
                      ) : null}
                      {f.isPriority ? (
                        <StarIcon
                          className="size-3.5 fill-amber-500 text-amber-500"
                          aria-label="Priority"
                        />
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.categoryName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {f.wasteCodeDisplay ? (
                      <span className="font-mono text-xs tabular-nums">
                        {f.wasteCodeDisplay}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {f.estimatedQuantity ? (
                      <>
                        {f.estimatedQuantity}
                        <span className="ml-1 text-muted-foreground">
                          {label(UNIT_OPTIONS, f.quantityUnit)}
                        </span>
                        <span className="text-muted-foreground">
                          {" / "}
                          {label(FREQUENCY_OPTIONS, f.frequency).toLowerCase()}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        f.status === "ACTIVE"
                          ? "default"
                          : f.status === "INACTIVE"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {label(STATUS_OPTIONS, f.status)}
                    </Badge>
                  </TableCell>
                </ClickableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
