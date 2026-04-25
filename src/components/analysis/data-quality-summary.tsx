import { CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";

import type { DataQuality } from "@/lib/analysis";
import { cn } from "@/lib/utils";

type Row = {
  label: string;
  count: number;
  total: number;
  tone?: "default" | "warning" | "danger";
};

export function DataQualitySummary({
  quality,
  wasteTotalFlows,
  carbonTotalEntries,
}: {
  quality: DataQuality;
  wasteTotalFlows: number;
  carbonTotalEntries: number;
}) {
  const rows: Row[] = [
    {
      label: "Carbon entries with emission factor",
      count: carbonTotalEntries - quality.recordsMissingFactor,
      total: carbonTotalEntries,
    },
    {
      label: "Scope 1 entries with source type",
      count:
        carbonTotalEntries - quality.scope1MissingSourceType >= 0
          ? carbonTotalEntries - quality.scope1MissingSourceType
          : 0,
      total: carbonTotalEntries,
    },
    {
      label: "Waste flows with LoW / EWC code",
      count: wasteTotalFlows - quality.wasteFlowsMissingCode,
      total: wasteTotalFlows,
    },
    {
      label: "Waste flows with treatment code",
      count: wasteTotalFlows - quality.wasteFlowsMissingTreatment,
      total: wasteTotalFlows,
      tone: quality.wasteFlowsMissingTreatment > 0 ? "warning" : "default",
    },
    {
      label: "Hazardous flows with treatment code",
      count:
        wasteTotalFlows -
        (quality.wasteFlowsHazardousNoCode + quality.wasteFlowsMissingTreatment),
      total: wasteTotalFlows,
      tone: quality.wasteFlowsHazardousNoCode > 0 ? "danger" : "default",
    },
  ];

  if (quality.totalRecords === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No records yet. Add a Scope 1/2/3 entry or a waste flow to populate
        completeness signals.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => {
        const pct = row.total > 0 ? Math.round((row.count / row.total) * 100) : 0;
        const barColor =
          row.tone === "danger"
            ? "bg-destructive"
            : row.tone === "warning"
              ? "bg-amber-500"
              : "bg-primary";
        return (
          <div key={row.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {pct === 100 ? (
                  <CheckCircle2Icon
                    className={cn(
                      "size-3.5",
                      "text-emerald-600 dark:text-emerald-400",
                    )}
                  />
                ) : (
                  <AlertTriangleIcon
                    className={cn(
                      "size-3.5",
                      row.tone === "danger"
                        ? "text-destructive"
                        : row.tone === "warning"
                          ? "text-amber-500"
                          : "text-muted-foreground",
                    )}
                  />
                )}
                {row.label}
              </span>
              <span className="font-medium tabular-nums">
                {row.count}
                <span className="text-muted-foreground">/{row.total}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {pct}%
                </span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
