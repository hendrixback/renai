import { redirect } from "next/navigation";

import { canManageTeam, getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SitesPanel } from "@/components/sites-panel";

export const dynamic = "force-dynamic";

export default async function SitesSettingsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/settings/sites");

  const sites = await prisma.site.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { name: "asc" },
  });

  return (
    <SitesPanel
      canManage={canManageTeam(ctx.company.role)}
      sites={sites.map((s) => ({
        id: s.id,
        name: s.name,
        addressLine1: s.addressLine1,
        addressLine2: s.addressLine2,
        city: s.city,
        region: s.region,
        country: s.country,
        postalCode: s.postalCode,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
