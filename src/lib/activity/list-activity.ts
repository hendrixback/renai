import "server-only";

import { prisma } from "@/lib/prisma";

type ServiceContext = {
  user: { id: string };
  company: { id: string };
};

export type ActivityEntry = Awaited<ReturnType<typeof listActivityForRecord>>[number];

/**
 * Reads the activity history for a single record (polymorphic module+id).
 * Scoped to the caller's company — no cross-tenant leaks possible.
 *
 * Default limit of 50 covers months of editing per record without forcing
 * pagination on what is ultimately a timeline UI. Callers that need
 * everything can pass a larger `limit`.
 */
export async function listActivityForRecord(
  ctx: ServiceContext,
  module: string,
  recordId: string,
  opts: { limit?: number } = {},
) {
  return prisma.activityLog.findMany({
    where: {
      companyId: ctx.company.id,
      module,
      recordId,
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
    select: {
      id: true,
      activityType: true,
      description: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}
