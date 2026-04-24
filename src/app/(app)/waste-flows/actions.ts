"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export type CreateWasteFlowState = {
  error: string | null;
  fieldErrors: Record<string, string[]>;
};

const STATUS = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
const UNIT = ["KG", "TON", "LITER", "CUBIC_METER", "UNIT", "PIECE"] as const;
const FREQ = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "ONE_OFF",
  "CONTINUOUS",
] as const;
const TREATMENT = [
  "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "R13",
  "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14", "D15",
] as const;

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  materialComposition: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  categoryId: z.preprocess(emptyToUndef, z.string().cuid().optional()),
  wasteCodeId: z.preprocess(emptyToUndef, z.string().regex(/^\d{6}$/).optional()),
  status: z.enum(STATUS).default("ACTIVE"),
  estimatedQuantity: z.preprocess(
    emptyToUndef,
    z.coerce.number().nonnegative().finite().optional(),
  ),
  quantityUnit: z.enum(UNIT).default("TON"),
  frequency: z.enum(FREQ).default("MONTHLY"),
  siteId: z.preprocess(emptyToUndef, z.string().cuid().optional()),
  locationName: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  storageMethod: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  currentDestination: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  currentOperator: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  internalCode: z.preprocess(emptyToUndef, z.string().max(100).optional()),
  treatmentCode: z.preprocess(emptyToUndef, z.enum(TREATMENT).optional()),
  treatmentNotes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  recoveryNotes: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  notes: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  isHazardous: z.boolean().default(false),
  isPriority: z.boolean().default(false),
});

export async function createWasteFlow(
  _prev: CreateWasteFlowState | null,
  formData: FormData,
): Promise<CreateWasteFlowState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", fieldErrors: {} };
  }

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return {
        error: "You don't have permission to create waste flows.",
        fieldErrors: {},
      };
    }
    throw err;
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = createSchema.safeParse({
    ...raw,
    isHazardous: formData.get("isHazardous") === "on",
    isPriority: formData.get("isPriority") === "on",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const d = parsed.data;

  // Validate LoW code + category belong to the company's catalog (codes are
  // global). Category must exist; code must exist if provided.
  if (d.categoryId) {
    const exists = await prisma.wasteCategory.findUnique({
      where: { id: d.categoryId },
      select: { id: true },
    });
    if (!exists) {
      return {
        error: null,
        fieldErrors: { categoryId: ["Unknown category."] },
      };
    }
  }
  if (d.wasteCodeId) {
    const exists = await prisma.wasteCode.findUnique({
      where: { code: d.wasteCodeId },
      select: { code: true, isHazardous: true },
    });
    if (!exists) {
      return {
        error: null,
        fieldErrors: { wasteCodeId: ["Unknown waste code."] },
      };
    }
    // LoW code declares hazardous → force flag true (authoritative per EU).
    if (exists.isHazardous && !d.isHazardous) {
      d.isHazardous = true;
    }
  }
  if (d.siteId) {
    const ownsSite = await prisma.site.findFirst({
      where: { id: d.siteId, companyId: ctx.company.id },
      select: { id: true },
    });
    if (!ownsSite) {
      return {
        error: null,
        fieldErrors: { siteId: ["Unknown site for this company."] },
      };
    }
  }

  // Reporting period derived from creation time — WasteFlow represents a
  // standing stream, so "reporting year" is when it was registered. Used for
  // YoY views like "flows registered in 2026 vs 2025".
  const now = new Date();
  const reportingYear = now.getUTCFullYear();
  const reportingMonth = now.getUTCMonth() + 1;

  const flow = await prisma.wasteFlow.create({
    data: {
      companyId: ctx.company.id,
      createdById: ctx.user.id,
      updatedById: ctx.user.id,
      reportingYear,
      reportingMonth,
      name: d.name,
      description: d.description ?? null,
      materialComposition: d.materialComposition ?? null,
      categoryId: d.categoryId ?? null,
      wasteCodeId: d.wasteCodeId ?? null,
      status: d.status,
      estimatedQuantity: d.estimatedQuantity ?? null,
      quantityUnit: d.quantityUnit,
      frequency: d.frequency,
      siteId: d.siteId ?? null,
      locationName: d.locationName ?? null,
      storageMethod: d.storageMethod ?? null,
      currentDestination: d.currentDestination ?? null,
      currentOperator: d.currentOperator ?? null,
      internalCode: d.internalCode ?? null,
      treatmentCode: d.treatmentCode ?? null,
      treatmentNotes: d.treatmentNotes ?? null,
      recoveryNotes: d.recoveryNotes ?? null,
      notes: d.notes ?? null,
      isHazardous: d.isHazardous,
      isPriority: d.isPriority,
    },
    select: { id: true, name: true, isHazardous: true, wasteCodeId: true },
  });

  await logActivity(ctx, {
    type: "RECORD_CREATED",
    module: "waste-flows",
    recordId: flow.id,
    description: `Created waste flow "${flow.name}"`,
    metadata: {
      name: flow.name,
      isHazardous: flow.isHazardous,
      wasteCodeId: flow.wasteCodeId,
    },
  });

  revalidatePath("/waste-flows");
  redirect("/waste-flows");
}

export async function updateWasteFlow(
  _prev: CreateWasteFlowState | null,
  formData: FormData,
): Promise<CreateWasteFlowState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", fieldErrors: {} };
  }

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return {
        error: "You don't have permission to edit waste flows.",
        fieldErrors: {},
      };
    }
    throw err;
  }

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { error: "Missing waste flow id", fieldErrors: {} };
  }

  // Verify ownership before any mutation.
  const existing = await prisma.wasteFlow.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!existing) {
    return { error: "Waste flow not found", fieldErrors: {} };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = createSchema.safeParse({
    ...raw,
    isHazardous: formData.get("isHazardous") === "on",
    isPriority: formData.get("isPriority") === "on",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const d = parsed.data;

  // Same reference checks as create — category, waste code, site.
  if (d.categoryId) {
    const catExists = await prisma.wasteCategory.findUnique({
      where: { id: d.categoryId },
      select: { id: true },
    });
    if (!catExists) {
      return { error: null, fieldErrors: { categoryId: ["Unknown category."] } };
    }
  }
  if (d.wasteCodeId) {
    const codeExists = await prisma.wasteCode.findUnique({
      where: { code: d.wasteCodeId },
      select: { code: true, isHazardous: true },
    });
    if (!codeExists) {
      return {
        error: null,
        fieldErrors: { wasteCodeId: ["Unknown waste code."] },
      };
    }
    if (codeExists.isHazardous && !d.isHazardous) {
      d.isHazardous = true;
    }
  }
  if (d.siteId) {
    const ownsSite = await prisma.site.findFirst({
      where: { id: d.siteId, companyId: ctx.company.id },
      select: { id: true },
    });
    if (!ownsSite) {
      return {
        error: null,
        fieldErrors: { siteId: ["Unknown site for this company."] },
      };
    }
  }

  await prisma.wasteFlow.update({
    where: { id: existing.id },
    data: {
      updatedById: ctx.user.id,
      name: d.name,
      description: d.description ?? null,
      materialComposition: d.materialComposition ?? null,
      categoryId: d.categoryId ?? null,
      wasteCodeId: d.wasteCodeId ?? null,
      status: d.status,
      estimatedQuantity: d.estimatedQuantity ?? null,
      quantityUnit: d.quantityUnit,
      frequency: d.frequency,
      siteId: d.siteId ?? null,
      locationName: d.locationName ?? null,
      storageMethod: d.storageMethod ?? null,
      currentDestination: d.currentDestination ?? null,
      currentOperator: d.currentOperator ?? null,
      internalCode: d.internalCode ?? null,
      treatmentCode: d.treatmentCode ?? null,
      treatmentNotes: d.treatmentNotes ?? null,
      recoveryNotes: d.recoveryNotes ?? null,
      notes: d.notes ?? null,
      isHazardous: d.isHazardous,
      isPriority: d.isPriority,
    },
  });

  await logActivity(ctx, {
    type: "RECORD_UPDATED",
    module: "waste-flows",
    recordId: existing.id,
    description:
      existing.name === d.name
        ? `Updated waste flow "${existing.name}"`
        : `Renamed waste flow "${existing.name}" → "${d.name}"`,
    metadata:
      existing.name === d.name
        ? null
        : { previousName: existing.name, newName: d.name },
  });

  revalidatePath("/waste-flows");
  revalidatePath(`/waste-flows/${existing.id}`);
  redirect(`/waste-flows/${existing.id}`);
}

export async function deleteWasteFlow(id: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  // Deletion is destructive; restricted to ADMIN+ per Spec Amendment A9.
  // VIEWER and MEMBER (Collaborator) archive via status instead.
  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const target = await prisma.wasteFlow.findFirst({
    where: { id, companyId: ctx.company.id },
    select: { id: true, name: true },
  });
  if (!target) return;

  await prisma.wasteFlow.delete({ where: { id: target.id } });

  await logActivity(ctx, {
    type: "RECORD_DELETED",
    module: "waste-flows",
    recordId: target.id,
    description: `Deleted waste flow "${target.name}"`,
    metadata: { name: target.name },
  });

  revalidatePath("/waste-flows");
}
