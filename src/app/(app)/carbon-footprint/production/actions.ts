"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { registerProductionVolumeSchema } from "@/lib/schemas/production.schema";

export type SimpleState = {
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string[]>;
};

const empty: SimpleState = { error: null, success: null, fieldErrors: {} };
const PERMISSION_DENIED =
  "You don't have permission to manage production volumes.";

function monthDate(yyyymm: string): Date {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export async function registerProductionVolume(
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

  const parsed = registerProductionVolumeSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ||= []).push(issue.message);
    }
    return { ...empty, fieldErrors };
  }

  const { productLabel, month, volume, unit, siteId, notes } = parsed.data;
  const monthAt = monthDate(month);

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.productionVolume.create({
        data: {
          companyId: ctx.company.id,
          siteId: siteId || null,
          productLabel,
          month: monthAt,
          reportingYear: monthAt.getUTCFullYear(),
          reportingMonth: monthAt.getUTCMonth() + 1,
          volume,
          unit,
          notes: notes || null,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
        },
      });
      await logActivity(
        ctx,
        {
          type: "RECORD_CREATED",
          module: "production",
          recordId: row.id,
          description: `Recorded production volume "${productLabel}" — ${volume} ${unit} for ${month}`,
          metadata: { volume, unit, productLabel },
        },
        tx,
      );
    });
  } catch (err) {
    logger.error("Production volume register failed", err, {
      companyId: ctx.company.id,
      userId: ctx.user.id,
    });
    return { ...empty, error: "Failed to record. Please try again." };
  }

  revalidatePath("/carbon-footprint/production");
  return { ...empty, success: "Production volume recorded." };
}

export async function deleteProductionVolume(id: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const target = await prisma.productionVolume.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true, productLabel: true, volume: true, unit: true },
  });
  if (!target) return;

  await prisma.$transaction(async (tx) => {
    await tx.productionVolume.update({
      where: { id: target.id },
      data: { deletedAt: new Date() },
    });
    await logActivity(
      ctx,
      {
        type: "RECORD_DELETED",
        module: "production",
        recordId: target.id,
        description: `Deleted production volume "${target.productLabel}"`,
        metadata: { volume: Number(target.volume), unit: target.unit },
      },
      tx,
    );
  });

  revalidatePath("/carbon-footprint/production");
}
