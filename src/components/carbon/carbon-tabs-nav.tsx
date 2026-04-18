"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  FlameIcon,
  FactoryIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  RecycleIcon,
  ZapIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type TabKey =
  | "overview"
  | "fuel"
  | "electricity"
  | "production"
  | "value-chain"
  | "waste-impact"

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview",      label: "Overview",               icon: <LayoutDashboardIcon className="size-3.5" /> },
  { key: "fuel",          label: "Scope 1 — Fuel",         icon: <FlameIcon className="size-3.5" /> },
  { key: "electricity",   label: "Scope 2 — Electricity",  icon: <ZapIcon className="size-3.5" /> },
  { key: "production",    label: "Production",             icon: <FactoryIcon className="size-3.5" /> },
  { key: "value-chain",   label: "Scope 3 — Value Chain",  icon: <GlobeIcon className="size-3.5" /> },
  { key: "waste-impact",  label: "Waste Impact",           icon: <RecycleIcon className="size-3.5" /> },
]

export function CarbonTabsNav({ active }: { active: TabKey }) {
  const pathname = usePathname()
  const params = useSearchParams()

  const hrefFor = (key: TabKey) => {
    const next = new URLSearchParams(params.toString())
    if (key === "overview") next.delete("tab")
    else next.set("tab", key)
    const qs = next.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
      {TABS.map((t) => {
        const isActive = t.key === active
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            scroll={false}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
