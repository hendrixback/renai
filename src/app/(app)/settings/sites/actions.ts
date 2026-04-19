"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageTeam, getCurrentContext } from "@/lib/auth";
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

// Inline form on /settings/sites → useActionState pattern with FormData.
export async function createSite(
  _prev: SiteFormState | null,
  formData: FormData,
): Promise<SiteFormState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ...emptyState, error: "Not authenticated" };
  if (!canManageTeam(ctx.company.role)) {
    return { ...emptyState, error: "Only owners and admins can manage sites." };
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

  await prisma.site.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      addressLine1: parsed.data.addressLine1 ?? null,
      addressLine2: parsed.data.addressLine2 ?? null,
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
      country: parsed.data.country ?? null,
      postalCode: parsed.data.postalCode ?? null,
    },
  });

  revalidatePath("/settings/sites");
  refresh();
  return { ...emptyState, success: `Site "${parsed.data.name}" added.` };
}

// Edit happens inside a base-ui Dialog portal → Atlas plain-object pattern.
export async function updateSite(
  data: Record<string, string>,
): Promise<SiteFormState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ...emptyState, error: "Not authenticated" };
  if (!canManageTeam(ctx.company.role)) {
    return { ...emptyState, error: "Only owners and admins can manage sites." };
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

  const result = await prisma.site.updateMany({
    where: { id, companyId: ctx.company.id },
    data: {
      name: parsed.data.name,
      addressLine1: parsed.data.addressLine1 ?? null,
      addressLine2: parsed.data.addressLine2 ?? null,
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
      country: parsed.data.country ?? null,
      postalCode: parsed.data.postalCode ?? null,
    },
  });
  if (result.count === 0) return { ...emptyState, error: "Site not found" };

  revalidatePath("/settings/sites");
  refresh();
  return { ...emptyState, success: "Site updated." };
}

// Deleting a site sets FuelEntry / ElectricityEntry / WasteFlow siteId → null
// (schema uses onDelete: SetNull), so historical emissions/waste records are
// preserved but become unassigned.
export async function deleteSite(siteId: string) {
  const ctx = await getCurrentContext();
  if (!ctx || !canManageTeam(ctx.company.role)) return;

  await prisma.site.deleteMany({
    where: { id: siteId, companyId: ctx.company.id },
  });

  revalidatePath("/settings/sites");
  refresh();
}
