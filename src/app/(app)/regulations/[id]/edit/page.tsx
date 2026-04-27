import { notFound, redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { hasRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import {
  RegulationForm,
  type RegulationFormInitial,
} from "@/components/regulations/regulation-form";
import { RegulationsService } from "@/lib/services/regulations";

export const dynamic = "force-dynamic";

function dateToInput(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export default async function EditRegulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/regulations");
  if (!hasRole(ctx, "ADMIN")) redirect("/regulations");

  const { id } = await params;
  const reg = await RegulationsService.getById(ctx, id);
  if (!reg) notFound();

  const memberships = await prisma.membership.findMany({
    where: { companyId: ctx.company.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const members = memberships.map((m) => m.user);

  const initial: RegulationFormInitial = {
    id: reg.id,
    title: reg.title,
    type: reg.type,
    geography: reg.geography,
    topic: reg.topic,
    summary: reg.summary,
    sourceReference: reg.sourceReference,
    effectiveDate: dateToInput(reg.effectiveDate),
    regulatoryStatus: reg.regulatoryStatus,
    appliesToUs: reg.appliesToUs,
    priorityLevel: reg.priorityLevel,
    internalNotes: reg.internalNotes,
    reviewedById: reg.reviewedById,
    reviewDate: dateToInput(reg.reviewDate),
  };

  return (
    <>
      <PageHeader
        title="Edit regulation"
        breadcrumbs={[
          { label: "Regulations", href: "/regulations" },
          { label: reg.title, href: `/regulations/${reg.id}` },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <RegulationForm members={members} initial={initial} />
      </div>
    </>
  );
}
