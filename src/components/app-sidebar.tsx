"use client"

import * as React from "react"
import {
  BarChart3Icon,
  CoinsIcon,
  FileTextIcon,
  GalleryVerticalEndIcon,
  LayoutDashboardIcon,
  LeafIcon,
  RecycleIcon,
  SettingsIcon,
} from "lucide-react"

import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarUser = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MEMBER"
}

const teams = [
  {
    name: "Renai",
    logo: <GalleryVerticalEndIcon />,
    plan: "Starter",
  },
]

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "Waste Flows", url: "/waste-flows", icon: <RecycleIcon /> },
  { title: "Documents", url: "/documents", icon: <FileTextIcon /> },
  { title: "Valorization Opp.", url: "/valorization", icon: <CoinsIcon /> },
  {
    title: "Carbon Footprint",
    url: "/carbon-footprint",
    icon: <LeafIcon />,
  },
  { title: "Reporting", url: "/reporting", icon: <BarChart3Icon /> },
  { title: "Settings", url: "/settings", icon: <SettingsIcon /> },
]

export function AppSidebar({
  user,
  ...props
}: { user: AppSidebarUser } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
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
