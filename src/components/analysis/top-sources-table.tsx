import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TopSourceRow } from "@/lib/analysis";

const nf = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

const SCOPE_VARIANTS: Record<TopSourceRow["scope"], "default" | "outline"> = {
  s1: "default",
  s2: "outline",
  s3: "outline",
  waste: "outline",
};

export function TopSourcesTable({ rows }: { rows: ReadonlyArray<TopSourceRow> }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No emissions records to rank.
      </div>
    );
  }
  const total = rows.reduce((sum, r) => sum + r.kgCo2e, 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scope</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">tCO₂e</TableHead>
            <TableHead className="text-right">% of top 10</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.scope}-${i}`}>
              <TableCell>
                <Badge variant={SCOPE_VARIANTS[row.scope]}>
                  {row.scopeLabel}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[280px] truncate">
                {row.description}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.siteName ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {monthFormatter.format(row.month)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {nf.format(row.kgCo2e / 1000)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {total > 0
                  ? `${((row.kgCo2e / total) * 100).toFixed(1)}%`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
