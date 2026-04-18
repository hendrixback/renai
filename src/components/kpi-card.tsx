import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export function KpiCard({
  label,
  value,
  caption,
  icon,
  accent,
  trend,
  className,
}: {
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  icon?: React.ReactNode
  accent?: "default" | "success" | "warning" | "danger"
  trend?: React.ReactNode
  className?: string
}) {
  const accentClass =
    accent === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : accent === "warning"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : accent === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"

  return (
    <Card className={cn("gap-3 p-5", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-0">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tabular-nums leading-tight">
            {value}
          </p>
          {caption ? (
            <p className="text-xs text-muted-foreground">{caption}</p>
          ) : null}
          {trend}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
              accentClass,
            )}
          >
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
