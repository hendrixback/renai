"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  registerScope3Schema,
  type Scope3CategoryValue,
} from "@/lib/schemas/scope3.schema";
import { computeScope3Emission } from "@/lib/scope3";

export type SimpleState = {
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string[]>;
};

const empty: SimpleState = { error: null, success: null, fieldErrors: {} };
const PERMISSION_DENIED = "You don't have permission to record Scope 3 entries.";

function monthDate(yyyymm: string): Date {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export async function registerScope3Entry(
  input: Record<string, unknown>,
): Promise<SimpleState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ...empty, error: "Not authenticated" };

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) return { ...empty, error: PERMISSION_DENIED };
    throw err;
  }

  const parsed = registerScope3Schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ||= []).push(issue.message);
    }
    return { ...empty, fieldErrors };
  }

  const { category, description, month, siteId, notes, data } = parsed.data;
  const monthAt = monthDate(month);

  const computed = await computeScope3Emission({
    companyId: ctx.company.id,
    category: category as Scope3CategoryValue,
    data,
  });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const entry = await tx.scope3Entry.create({
        data: {
          companyId: ctx.company.id,
          siteId: siteId || null,
          category,
          description,
          categoryData: data as never, // already validated by Zod above
          month: monthAt,
          reportingYear: monthAt.getUTCFullYear(),
          reportingMonth: monthAt.getUTCMonth() + 1,
          emissionFactorId: computed.factorId,
          factorSnapshot: (computed.factorSnapshot as never) ?? undefined,
          kgCo2e: computed.kgCo2e ?? null,
          notes: notes || null,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
        },
      });
      await logActivity(
        ctx,
        {
          type: "RECORD_CREATED",
          module: "scope-3",
          recordId: entry.id,
          description: `Created Scope 3 entry "${description}" (${category})`,
          metadata: {
            category,
            kgCo2e: computed.kgCo2e,
            factorId: computed.factorId,
          },
        },
        tx,
      );
      return entry;
    });

    revalidatePath("/carbon-footprint/value-chain");
    return { ...empty, success: `Recorded ${description}.` };
  } catch (err) {
    logger.error("Scope 3 register failed", err, {
      companyId: ctx.company.id,
      userId: ctx.user.id,
      category,
    });
    return { ...empty, error: "Failed to record entry. Please try again." };
  }
}
