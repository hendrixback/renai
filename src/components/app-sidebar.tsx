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
import { useTranslations } from "next-intl"

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
 */
function buildNavItems(
  t: ReturnType<typeof useTranslations<"nav">>,
): NavItem[] {
  return [
    { title: t("dashboard"), url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: t("wasteFlows"), url: "/waste-flows", icon: <RecycleIcon /> },
    {
      title: t("carbonFootprint"),
      url: "/carbon-footprint",
      icon: <LeafIcon />,
    },
    { title: t("analysis"), url: "/analysis", icon: <BarChart3Icon /> },
    { title: t("documentation"), url: "/documentation", icon: <FileTextIcon /> },
    { title: t("regulations"), url: "/regulations", icon: <BookOpenIcon /> },
    { title: t("teamOverview"), url: "/team-overview", icon: <UsersIcon /> },
    { title: t("tasks"), url: "/tasks", icon: <ListChecksIcon /> },
    { title: t("settings"), url: "/settings", icon: <SettingsIcon /> },
  ]
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
  const t = useTranslations("nav")
  const showAdminLink = user.role === "ADMIN"
  const adminActive = pathname.startsWith("/admin")
  const navMain = React.useMemo(() => buildNavItems(t), [t])

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
                  tooltip={t("platformAdmin")}
                  isActive={adminActive}
                  render={<Link href="/admin" />}
                >
                  <ShieldIcon />
                  <span>{t("platformAdmin")}</span>
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
