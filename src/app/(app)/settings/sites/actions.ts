"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export type SiteFormState = {
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string[]>;
};

const emptyState: SiteFormState = {
  error: null,
  success: null,
  fieldErrors: {},
};

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const siteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  addressLine1: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  addressLine2: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  city: z.preprocess(emptyToUndef, z.string().max(100).optional()),
  region: z.preprocess(emptyToUndef, z.string().max(100).optional()),
  country: z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO code (e.g. PT)")
      .optional(),
  ),
  postalCode: z.preprocess(emptyToUndef, z.string().max(20).optional()),
});

const NO_PERMISSION = "Only admins can manage sites.";

// Inline form on /settings/sites → useActionState pattern with FormData.
export async function createSite(
  _prev: SiteFormState | null,
  formData: FormData,
): Promise<SiteFormState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ...emptyState, error: "Not authenticated" };

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { ...emptyState, error: NO_PERMISSION };
    }
    throw err;
  }

  const parsed = siteSchema.safeParse({
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    region: formData.get("region"),
    country: formData.get("country"),
    postalCode: formData.get("postalCode"),
  });
  if (!parsed.success) {
    return {
      ...emptyState,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const site = await prisma.site.create({
    data: {
      companyId: ctx.company.id,
      createdById: ctx.user.id,
      updatedById: ctx.user.id,
      name: parsed.data.name,
      addressLine1: parsed.data.addressLine1 ?? null,
      addressLine2: parsed.data.addressLine2 ?? null,
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
      country: parsed.data.country ?? null,
      postalCode: parsed.data.postalCode ?? null,
    },
    select: { id: true, name: true },
  });

  await logActivity(ctx, {
    type: "RECORD_CREATED",
    module: "sites",
    recordId: site.id,
    description: `Created site "${site.name}"`,
  });

  revalidatePath("/settings/sites");
  refresh();
  return { ...emptyState, success: `Site "${site.name}" added.` };
}

// Edit happens inside a base-ui Dialog portal → Atlas plain-object pattern.
export async function updateSite(
  data: Record<string, string>,
): Promise<SiteFormState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ...emptyState, error: "Not authenticated" };

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { ...emptyState, error: NO_PERMISSION };
    }
    throw err;
  }

  const id = typeof data.id === "string" ? data.id : "";
  if (!id) return { ...emptyState, error: "Missing site id" };

  const parsed = siteSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ...emptyState,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  // Fetch the current row first so the audit log can record the old name
  // and we can assert tenant ownership atomically with the update below.
  const existing = await prisma.site.findFirst({
    where: { id, companyId: ctx.company.id },
    select: { id: true, name: true },
  });
  if (!existing) return { ...emptyState, error: "Site not found" };

  await prisma.site.update({
    where: { id: existing.id },
    data: {
      updatedById: ctx.user.id,
      name: parsed.data.name,
      addressLine1: parsed.data.addressLine1 ?? null,
      addressLine2: parsed.data.addressLine2 ?? null,
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
      country: parsed.data.country ?? null,
      postalCode: parsed.data.postalCode ?? null,
    },
  });

  await logActivity(ctx, {
    type: "RECORD_UPDATED",
    module: "sites",
    recordId: existing.id,
    description:
      existing.name === parsed.data.name
        ? `Updated site "${existing.name}"`
        : `Renamed site "${existing.name}" → "${parsed.data.name}"`,
    metadata:
      existing.name === parsed.data.name
        ? null
        : { previousName: existing.name, newName: parsed.data.name },
  });

  revalidatePath("/settings/sites");
  refresh();
  return { ...emptyState, success: "Site updated." };
}

// Deleting a site sets FuelEntry / ElectricityEntry / WasteFlow siteId → null
// (schema uses onDelete: SetNull), so historical emissions/waste records are
// preserved but become unassigned.
export async function deleteSite(siteId: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    requireRole(ctx, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const target = await prisma.site.findFirst({
    where: { id: siteId, companyId: ctx.company.id },
    select: { id: true, name: true },
  });
  if (!target) return;

  await prisma.site.delete({ where: { id: target.id } });

  await logActivity(ctx, {
    type: "RECORD_DELETED",
    module: "sites",
    recordId: target.id,
    description: `Deleted site "${target.name}"`,
    metadata: { name: target.name },
  });

  revalidatePath("/settings/sites");
  refresh();
}
