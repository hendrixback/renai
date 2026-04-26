"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger";
import {
  createRegulationSchema,
  updateRegulationSchema,
} from "@/lib/schemas/regulation.schema";
import { RegulationsService } from "@/lib/services/regulations";

export type RegulationActionState = {
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string[]>;
};

const NO_PERMISSION = "Only Admins can manage regulations.";

function flattenIssues(error: import("zod").ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    out[key] = value;
  }
  return out;
}

export async function createRegulation(
  _prev: RegulationActionState | null,
  formData: FormData,
): Promise<RegulationActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: NO_PERMISSION, success: null, fieldErrors: {} };
    }
    throw err;
  }

  const parsed = createRegulationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: null,
      success: null,
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const reg = await RegulationsService.create(ctx, parsed.data);

  await logActivity(ctx, {
    type: "REGULATION_UPDATED",
    module: "regulations",
    recordId: reg.id,
    description: `Created regulation "${reg.title}"`,
    metadata: { type: reg.type, topic: reg.topic, geography: reg.geography },
  });

  logger.info("Regulation created", {
    event: "regulation.created",
    companyId: ctx.company.id,
    regulationId: reg.id,
  });

  revalidatePath("/regulations");
  return {
    error: null,
    success: `Created "${reg.title}".`,
    fieldErrors: {},
  };
}

export async function updateRegulation(
  id: string,
  _prev: RegulationActionState | null,
  formData: FormData,
): Promise<RegulationActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: NO_PERMISSION, success: null, fieldErrors: {} };
    }
    throw err;
  }

  const parsed = updateRegulationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: null,
      success: null,
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const reg = await RegulationsService.update(ctx, id, parsed.data);
  if (!reg) {
    return {
      error: "Regulation not found",
      success: null,
      fieldErrors: {},
    };
  }

  await logActivity(ctx, {
    type: "REGULATION_UPDATED",
    module: "regulations",
    recordId: reg.id,
    description: `Updated regulation "${reg.title}"`,
    metadata: { type: reg.type, topic: reg.topic, geography: reg.geography },
  });

  revalidatePath("/regulations");
  revalidatePath(`/regulations/${reg.id}`);
  return {
    error: null,
    success: "Saved.",
    fieldErrors: {},
  };
}

export async function deleteRegulation(id: string): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const reg = await RegulationsService.softDelete(ctx, id);
  if (!reg) return;

  await logActivity(ctx, {
    type: "REGULATION_UPDATED",
    module: "regulations",
    recordId: reg.id,
    description: `Deleted regulation "${reg.title}"`,
    metadata: { soft: true },
  });

  revalidatePath("/regulations");
}
