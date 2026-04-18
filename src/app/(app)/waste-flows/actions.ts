"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentContext } from "@/lib/auth";
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

  await prisma.wasteFlow.create({
    data: {
      companyId: ctx.company.id,
      createdById: ctx.user.id,
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

  revalidatePath("/waste-flows");
  redirect("/waste-flows");
}

export async function deleteWasteFlow(id: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  await prisma.wasteFlow.deleteMany({
    where: { id, companyId: ctx.company.id },
  });
  revalidatePath("/waste-flows");
}
