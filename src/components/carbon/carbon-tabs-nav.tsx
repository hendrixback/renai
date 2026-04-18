"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FlameIcon,
  FactoryIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  RecycleIcon,
  ZapIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const TABS = [
  { path: "overview",     label: "Overview",               icon: <LayoutDashboardIcon className="size-3.5" /> },
  { path: "fuel",         label: "Scope 1 — Fuel",         icon: <FlameIcon className="size-3.5" /> },
  { path: "electricity",  label: "Scope 2 — Electricity",  icon: <ZapIcon className="size-3.5" /> },
  { path: "production",   label: "Production",             icon: <FactoryIcon className="size-3.5" /> },
  { path: "value-chain",  label: "Scope 3 — Value Chain",  icon: <GlobeIcon className="size-3.5" /> },
  { path: "waste-impact", label: "Waste Impact",           icon: <RecycleIcon className="size-3.5" /> },
] as const

export function CarbonTabsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
      {TABS.map((t) => {
        const href = `/carbon-footprint/${t.path}`
        const isActive = pathname === href

        return (
          <Link
            key={t.path}
            href={href}
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
