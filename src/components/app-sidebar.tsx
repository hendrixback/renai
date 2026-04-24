"use client"

import * as React from "react"
import {
  BarChart3Icon,
  FileTextIcon,
  LayoutDashboardIcon,
  LeafIcon,
  RecycleIcon,
  SettingsIcon,
  ShieldIcon,
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

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "Waste Flows", url: "/waste-flows", icon: <RecycleIcon /> },
  {
    title: "Carbon Footprint",
    url: "/carbon-footprint",
    icon: <LeafIcon />,
  },
  { title: "Documentation", url: "/documentation", icon: <FileTextIcon /> },
  { title: "Reporting", url: "/reporting", icon: <BarChart3Icon /> },
  { title: "Settings", url: "/settings", icon: <SettingsIcon /> },
]

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
