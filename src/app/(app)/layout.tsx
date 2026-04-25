import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentContext, getCurrentUser } from "@/lib/auth";
import { touchUserLastActive } from "@/lib/auth/touch-last-active";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);

  if (!user) {
    redirect("/login?from=/dashboard");
  }

  const ctx = await getCurrentContext();

  if (!ctx) {
    // Platform admin with no memberships → send them to the admin area
    // where they can pick a company to view.
    if (user.role === "ADMIN") redirect("/admin");
    // Regular user without any company access — rare edge case.
    redirect("/login?error=no-company");
  }

  // Spec §17.4 — track Last Active per user. Throttled to one DB
  // write per ~5 min via touchUserLastActive's internal check, so
  // every page navigation is fine. Run after auth checks so we never
  // touch lastActiveAt for an unauthenticated render.
  await touchUserLastActive(ctx.user.id);

  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        user={{
          id: ctx.user.id,
          name: ctx.user.name ?? ctx.user.email,
          email: ctx.user.email,
          role: ctx.user.role,
        }}
        companies={ctx.memberships.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
        }))}
        activeCompany={{
          id: ctx.company.id,
          name: ctx.company.name,
          role: ctx.company.role,
        }}
        isImpersonating={ctx.isImpersonating}
      />
      <SidebarInset>
        {ctx.isImpersonating ? (
          <ImpersonationBanner companyName={ctx.company.name} />
        ) : null}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
