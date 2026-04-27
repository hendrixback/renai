import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { hasRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { RegulationForm } from "@/components/regulations/regulation-form";

export const dynamic = "force-dynamic";

export default async function NewRegulationPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/regulations/new");
  if (!hasRole(ctx, "ADMIN")) redirect("/regulations");

  // Reviewer dropdown: any active member of the company.
  const memberships = await prisma.membership.findMany({
    where: { companyId: ctx.company.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const members = memberships.map((m) => m.user);

  return (
    <>
      <PageHeader
        title="New regulation"
        breadcrumbs={[{ label: "Regulations", href: "/regulations" }]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <RegulationForm members={members} />
      </div>
    </>
  );
}
