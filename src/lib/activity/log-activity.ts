import "server-only";

import type { ActivityType } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Input shape for `logActivity`.
 *
 * @field type         — ActivityType enum value (see prisma/schema.prisma)
 * @field module       — short identifier of the source module: "waste-flows",
 *                       "scope-1", "scope-2", "documentation", "regulations",
 *                       "team", etc. One canonical string per module; used
 *                       for filtering in Team Overview and record activity history.
 * @field recordId     — id of the record this activity is about (nullable for
 *                       non-record events like LOGIN).
 * @field description  — one-line human summary shown in UI. Write from the
 *                       third-person perspective: "Created waste flow 'PET
 *                       bottles'" not "You created...". Avoid PII in the
 *                       description (names/emails OK; full addresses / phone
 *                       numbers / financial data → goes in metadata).
 * @field metadata     — optional structured context (old/new values, related
 *                       IDs, IP address if available).
 */
export type LogActivityInput = {
  type: ActivityType;
  module: string;
  recordId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
};

type MinimalContext = {
  user: { id: string };
  company: { id: string };
};

type PrismaTxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Writes an entry to the company's activity log.
 *
 * Called synchronously from every server action that mutates state. The
 * audit trail is a first-class product requirement (ADR-005, Spec §22.8,
 * §23.12, §23.15) — it powers Team Overview, Dashboard "Latest Team
 * Actions", record-level activity history, and compliance audits.
 *
 * ### Transactional usage
 *
 * For strict audit atomicity (audit row must land iff the business row lands),
 * pass a Prisma transaction client:
 *
 * ```ts
 * await prisma.$transaction(async (tx) => {
 *   const flow = await tx.wasteFlow.create({ data: ... });
 *   await logActivity(ctx, {
 *     type: "RECORD_CREATED",
 *     module: "waste-flows",
 *     recordId: flow.id,
 *     description: `Created waste flow "${flow.name}"`,
 *   }, tx);
 * });
 * ```
 *
 * ### Non-transactional usage
 *
 * If the caller doesn't need atomicity, omit `tx` and call directly — the
 * audit row is written best-effort. If the DB write fails we log (and thus
 * Sentry-report) but do not throw, to avoid audit failure masking a
 * successful business operation.
 */
export async function logActivity(
  ctx: MinimalContext,
  input: LogActivityInput,
  tx?: PrismaTxClient,
): Promise<void> {
  const client = tx ?? prisma;

  const metadata =
    input.metadata != null
      ? // Prisma's JSON type wants a plain JSON-serialisable value. Round-trip
        // through JSON.stringify/parse to strip functions/undefined/bigint.
        JSON.parse(JSON.stringify(input.metadata))
      : null;

  try {
    await client.activityLog.create({
      data: {
        companyId: ctx.company.id,
        userId: ctx.user.id,
        activityType: input.type,
        module: input.module,
        recordId: input.recordId ?? null,
        description: input.description,
        metadata,
      },
    });
  } catch (err) {
    // If we're inside a transaction the caller will see this throw; let it
    // bubble so the whole operation rolls back. Outside a transaction, we
    // swallow + log so a failed audit doesn't cascade into a failed mutation.
    if (tx) {
      throw err;
    }
    logger.error("Failed to write activity log", err, {
      companyId: ctx.company.id,
      userId: ctx.user.id,
      module: input.module,
      activityType: input.type,
    });
  }
}
