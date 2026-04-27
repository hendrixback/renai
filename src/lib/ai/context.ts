import "server-only";

import type { CurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import type { SystemPromptContext } from "./prompts";

/**
 * Gather the lightweight context the system prompt needs about the
 * user's tenant. Counts only — no actual record contents leak into
 * the model context. Six COUNT queries fired in parallel; cheap.
 */
export async function gatherAssistantContext(
  ctx: CurrentContext,
): Promise<SystemPromptContext> {
  const [
    wasteFlows,
    scope1Entries,
    scope2Entries,
    scope3Entries,
    sites,
    documents,
    regulations,
    company,
  ] = await Promise.all([
    prisma.wasteFlow.count({
      where: { companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.fuelEntry.count({
      where: { companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.electricityEntry.count({
      where: { companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.scope3Entry.count({
      where: { companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.site.count({
      where: { companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.document.count({
      where: { companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.regulation.count({
      where: { companyId: ctx.company.id, deletedAt: null },
    }),
    prisma.company.findUnique({
      where: { id: ctx.company.id },
      select: { country: true },
    }),
  ]);

  return {
    user: {
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.company.role,
    },
    company: {
      name: ctx.company.name,
      country: company?.country ?? null,
    },
    inventory: {
      wasteFlows,
      scope1Entries,
      scope2Entries,
      scope3Entries,
      sites,
      documents,
      regulations,
    },
  };
}
