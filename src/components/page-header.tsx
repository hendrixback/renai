import Link from "next/link"
import * as React from "react"

import { ModeToggle } from "@/components/mode-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type Crumb = { label: string; href?: string }

export function PageHeader({
  title,
  breadcrumbs,
  actions,
}: {
  title: string
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
}) {
  const trail: Crumb[] = [
    { label: "RenAI", href: "/dashboard" },
    ...(breadcrumbs ?? []),
    { label: title },
  ]

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {trail.map((crumb, index) => {
              const isLast = index === trail.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem
                    className={index === 0 ? "hidden md:block" : undefined}
                  >
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={crumb.href} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast ? (
                    <BreadcrumbSeparator
                      className={index === 0 ? "hidden md:block" : undefined}
                    />
                  ) : null}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
