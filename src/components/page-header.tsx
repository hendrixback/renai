import Link from "next/link"
import * as React from "react"

import { getCurrentContext } from "@/lib/auth"
import { getTaskSummary } from "@/lib/tasks"
import { HeaderNotifications } from "@/components/header-notifications"
import { HeaderUserMenu } from "@/components/header-user-menu"
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

export async function PageHeader({
  title,
  breadcrumbs,
  actions,
}: {
  title: string
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
}) {
  const ctx = await getCurrentContext()
  const trail: Crumb[] = [
    { label: "RenAI", href: "/dashboard" },
    ...(breadcrumbs ?? []),
    { label: title },
  ]

  // Pull the bell-icon counts here rather than in HeaderNotifications
  // itself, so the bell stays a thin client component (no DB/auth code
  // pulled into the bundle).
  const taskSummary = ctx
    ? await getTaskSummary({
        companyId: ctx.company.id,
        assignedToId: ctx.user.id,
      })
    : null;
  const notifications = {
    myOpen: taskSummary
      ? taskSummary.open + taskSummary.inProgress
      : 0,
    myOverdue: taskSummary?.overdue ?? 0,
  }

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
        <div className="ml-auto flex items-center gap-1.5">
          {actions}
          <Separator
            orientation="vertical"
            className="mx-1 hidden data-vertical:h-5 data-vertical:self-auto md:block"
          />
          <HeaderNotifications data={notifications} />
          <ModeToggle />
          {ctx ? (
            <HeaderUserMenu
              user={{ name: ctx.user.name, email: ctx.user.email }}
            />
          ) : null}
        </div>
      </div>
    </header>
  )
}
