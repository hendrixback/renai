import { notFound, redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Bare /imports/sessions/[id] route — bounces to map or preview based
 * on session status so links in emails / browser history land
 * somewhere useful regardless of state.
 */
export default async function ImportSessionRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx) redirect(`/login?from=/imports/sessions/${id}`);

  const session = await prisma.importSession.findFirst({
    where: { id, companyId: ctx.company.id },
    select: { id: true, status: true },
  });
  if (!session) notFound();

  if (session.status === "PARSED") {
    redirect(`/imports/sessions/${session.id}/map`);
  }
  redirect(`/imports/sessions/${session.id}/preview`);
}
