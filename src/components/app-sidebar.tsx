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
 * Regulations is the only flag-gated module today (work in progress).
 * Flag values come in as props from the server-rendered layout — this
 * avoids dev-mode hydration mismatches that occur when a client
 * component reads `flags.*` directly while the server reads it at
 * runtime (Turbopack inlines client-side, Node reads server-side,
 * and the two can disagree mid-HMR).
 */
export type SidebarFlagSet = {
  regulationsEnabled: boolean
}

function buildNavItems(flagSet: SidebarFlagSet): NavItem[] {
  const items: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: "Waste Flows", url: "/waste-flows", icon: <RecycleIcon /> },
    {
      title: "Carbon Footprint",
      url: "/carbon-footprint",
      icon: <LeafIcon />,
    },
    { title: "Analysis", url: "/analysis", icon: <BarChart3Icon /> },
    { title: "Documentation", url: "/documentation", icon: <FileTextIcon /> },
    { title: "Team Overview", url: "/team-overview", icon: <UsersIcon /> },
    { title: "Tasks", url: "/tasks", icon: <ListChecksIcon /> },
  ]

  if (flagSet.regulationsEnabled) {
    items.push({
      title: "Regulations",
      url: "/regulations",
      icon: <BookOpenIcon />,
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
  flagSet,
  ...props
}: {
  user: AppSidebarUser
  companies: SidebarCompany[]
  activeCompany: SidebarCompany
  isImpersonating: boolean
  flagSet: SidebarFlagSet
} & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const showAdminLink = user.role === "ADMIN"
  const adminActive = pathname.startsWith("/admin")
  const navMain = React.useMemo(() => buildNavItems(flagSet), [flagSet])

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
