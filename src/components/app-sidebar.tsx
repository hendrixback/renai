"use client"

import * as React from "react"
import {
  BarChart3Icon,
  BookOpenIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LeafIcon,
  ListChecksIcon,
  RecycleIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"

import { flags } from "@/lib/flags"

import { CompanySwitcher } from "@/components/company-switcher"
import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

type AppSidebarUser = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MEMBER"
}

type SidebarCompany = {
  id: string
  name: string
  role: string
}

/**
 * Canonical nav order per Spec §6.2:
 *   Dashboard → Waste Flows → Carbon Footprint → Analysis → Documentation
 *             → Regulations → Team Overview
 *
 * Unreleased modules (Analysis, Regulations, Team Overview) are
 * flag-gated so production only shows what actually works. The legacy
 * Reporting slot stays visible until Analysis flips on — both routes
 * coexist so there's always at least one "analyse" entry point.
 */
function buildNavItems(): NavItem[] {
  const items: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "Waste Flows", url: "/waste-flows", icon: <RecycleIcon /> },
    {
      title: "Carbon Footprint",
      url: "/carbon-footprint",
      icon: <LeafIcon />,
    },
  ]

  if (flags.analysisEnabled) {
    items.push({ title: "Analysis", url: "/analysis", icon: <BarChart3Icon /> })
  } else {
    // Legacy stub — keep until /analysis is real, so the sidebar never
    // has an empty "analyse your data" slot.
    items.push({ title: "Reporting", url: "/reporting", icon: <BarChart3Icon /> })
  }

  if (flags.documentationEnabled) {
    items.push({
      title: "Documentation",
      url: "/documentation",
      icon: <FileTextIcon />,
    })
  }

  if (flags.regulationsEnabled) {
    items.push({
      title: "Regulations",
      url: "/regulations",
      icon: <BookOpenIcon />,
    })
  }

  if (flags.teamOverviewEnabled) {
    items.push({
      title: "Team Overview",
      url: "/team-overview",
      icon: <UsersIcon />,
    })
  }

  if (flags.tasksEnabled) {
    items.push({
      title: "Tasks",
      url: "/tasks",
      icon: <ListChecksIcon />,
    })
  }

  items.push({ title: "Settings", url: "/settings", icon: <SettingsIcon /> })
  return items
}

export function AppSidebar({
  user,
  companies,
  activeCompany,
  isImpersonating,
  ...props
}: {
  user: AppSidebarUser
  companies: SidebarCompany[]
  activeCompany: SidebarCompany
  isImpersonating: boolean
} & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const showAdminLink = user.role === "ADMIN"
  const adminActive = pathname.startsWith("/admin")
  const navMain = React.useMemo(() => buildNavItems(), [])

  // When impersonating, show the active company in the switcher list too so
  // the user can see and exit — the "exit" button in the impersonation
  // banner is the primary control, but having it in the list is helpful.
  const switcherCompanies = React.useMemo(() => {
    const list = companies.map((c) => ({ ...c }))
    if (
      isImpersonating &&
      !list.some((c) => c.id === activeCompany.id)
    ) {
      list.unshift({ ...activeCompany })
    }
    return list
  }, [companies, activeCompany, isImpersonating])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <CompanySwitcher
          companies={switcherCompanies}
          activeId={activeCompany.id}
          isImpersonating={isImpersonating}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {showAdminLink ? (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Platform Admin"
                  isActive={adminActive}
                  render={<Link href="/admin" />}
                >
                  <ShieldIcon />
                  <span>Platform Admin</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
