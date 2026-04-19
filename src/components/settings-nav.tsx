"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const tabs = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/sites", label: "Sites" },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
              active && "text-foreground",
            )}
          >
            {t.label}
            {active ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
