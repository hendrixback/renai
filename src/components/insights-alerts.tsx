import Link from "next/link"
import { AlertTriangleIcon, BellIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Alert = {
  severity: "info" | "warning" | "critical"
  message: string
}

const dotClass: Record<Alert["severity"], string> = {
  info: "bg-sky-500",
  warning: "bg-amber-500",
  critical: "bg-destructive",
}

export function InsightsAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <BellIcon className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
            All clear
          </p>
          <p className="text-sm text-muted-foreground">
            No compliance or data-quality issues detected across your waste
            flows.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 rounded-xl border-l-4 border-amber-500 bg-muted/60 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <AlertTriangleIcon className="size-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
          Insights & Alerts
        </p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {alerts.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span
                className={cn("size-1.5 rounded-full", dotClass[a.severity])}
              />
              {a.message}
              <Link
                href="/waste-flows"
                className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
