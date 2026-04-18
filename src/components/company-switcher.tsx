"use client"

import * as React from "react"
import { useTransition } from "react"
import { CheckIcon, ChevronsUpDownIcon, GalleryVerticalEndIcon, Loader2 } from "lucide-react"

import { switchCompany } from "@/app/(app)/actions"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type Company = {
  id: string
  name: string
  role: string
}

export function CompanySwitcher({
  companies,
  activeId,
  isImpersonating,
}: {
  companies: Company[]
  activeId: string
  isImpersonating: boolean
}) {
  const { isMobile } = useSidebar()
  const [pending, startTransition] = useTransition()

  const active =
    companies.find((c) => c.id === activeId) ??
    companies[0] ?? { id: "", name: "Renai", role: "—" }

  const hasMultiple = companies.length > 1 || isImpersonating

  const trigger = (
    <SidebarMenuButton
      size="lg"
      className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
    >
      <div
        className={cn(
          "flex aspect-square size-8 items-center justify-center rounded-lg",
          isImpersonating
            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            : "bg-sidebar-primary text-sidebar-primary-foreground",
        )}
      >
        <GalleryVerticalEndIcon />
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{active.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {isImpersonating ? "viewing as admin" : active.role.toLowerCase()}
        </span>
      </div>
      {hasMultiple ? <ChevronsUpDownIcon className="ml-auto" /> : null}
    </SidebarMenuButton>
  )

  if (!hasMultiple) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>{trigger}</SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={trigger} />
          <DropdownMenuContent
            className="min-w-60 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch workspace
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {companies.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  disabled={pending}
                  onClick={() => {
                    if (c.id === active.id && !isImpersonating) return
                    startTransition(() => switchCompany(c.id))
                  }}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <GalleryVerticalEndIcon className="size-3.5" />
                  </div>
                  <div className="grid flex-1">
                    <span className="truncate">{c.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {c.role.toLowerCase()}
                    </span>
                  </div>
                  {c.id === active.id && !isImpersonating ? (
                    <CheckIcon className="ml-auto size-4" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {pending ? (
              <>
                <DropdownMenuSeparator />
                <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Switching…
                </div>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
