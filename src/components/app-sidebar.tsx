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

function buildNavItems(
  flagSet: SidebarFlagSet,
  t: ReturnType<typeof useTranslations<"nav">>,
): NavItem[] {
  const items: NavItem[] = [
    { title: t("dashboard"), url: "/dashboard", icon: <LayoutDashboardIcon /> },
    { title: t("wasteFlows"), url: "/waste-flows", icon: <RecycleIcon /> },
    {
      title: t("carbonFootprint"),
      url: "/carbon-footprint",
      icon: <LeafIcon />,
    },
    { title: t("analysis"), url: "/analysis", icon: <BarChart3Icon /> },
    { title: t("documentation"), url: "/documentation", icon: <FileTextIcon /> },
    { title: t("teamOverview"), url: "/team-overview", icon: <UsersIcon /> },
    { title: t("tasks"), url: "/tasks", icon: <ListChecksIcon /> },
  ]

  if (flagSet.regulationsEnabled) {
    items.push({
      title: t("regulations"),
      url: "/regulations",
      icon: <BookOpenIcon />,
    })
  }

  items.push({ title: t("settings"), url: "/settings", icon: <SettingsIcon /> })
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
  const t = useTranslations("nav")
  const showAdminLink = user.role === "ADMIN"
  const adminActive = pathname.startsWith("/admin")
  const navMain = React.useMemo(() => buildNavItems(flagSet, t), [flagSet, t])

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
