"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { cn } from "@/lib/utils"
import { TableRow } from "@/components/ui/table"

export function ClickableRow({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  return (
    <TableRow
      className={cn("cursor-pointer hover:bg-muted/50", className)}
      onClick={(e) => {
        // Avoid hijacking clicks on child interactive elements.
        const target = e.target as HTMLElement
        if (target.closest("a, button, input, [role=button]")) return
        router.push(href)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href)
      }}
      tabIndex={0}
    >
      {children}
    </TableRow>
  )
}
