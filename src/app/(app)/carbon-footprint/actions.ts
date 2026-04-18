"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentContext } from "@/lib/auth";
import {
  computeElectricityEmission,
  computeFuelEmission,
} from "@/lib/carbon";
import { prisma } from "@/lib/prisma";

// ─── Shared ────────────────────────────────────────────────────────

export type SimpleState = {
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string[]>;
};

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

function monthDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  return new Date(Date.UTC(y, m - 1, 1));
}

// ─── Fuel ──────────────────────────────────────────────────────────

const fuelSchema = z.object({
  fuelType: z.string().trim().min(1, "Fuel type is required"),
  unit: z.enum(["L", "m3", "kg", "kWh"]),
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  month: z.string().trim().min(1, "Month is required"),
  siteId: z.preprocess(emptyToUndef, z.string().cuid().optional()),
  locationName: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  region: z.preprocess(
    emptyToUndef,
    z.enum(["PT", "ES", "FR", "DE", "UK", "US", "EU", "GLOBAL"]).optional(),
  ),
  notes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export async function registerFuelEntry(
  data: Record<string, string>,
): Promise<SimpleState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  const parsed = fuelSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: null,
      success: null,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const month = monthDate(parsed.data.month);
  if (!month) {
    return {
      error: null,
      success: null,
      fieldErrors: { month: ["Invalid month"] },
    };
  }

  if (parsed.data.siteId) {
    const owns = await prisma.site.findFirst({
      where: { id: parsed.data.siteId, companyId: ctx.company.id },
      select: { id: true },
    });
    if (!owns) {
      return {
        error: null,
        success: null,
        fieldErrors: { siteId: ["Unknown site for this company."] },
      };
    }
  }

  const emission = await computeFuelEmission({
    fuelType: parsed.data.fuelType,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    companyId: ctx.company.id,
    region: parsed.data.region ?? "GLOBAL",
  });

  await prisma.fuelEntry.create({
    data: {
      companyId: ctx.company.id,
      siteId: parsed.data.siteId ?? null,
      fuelType: parsed.data.fuelType,
      unit: parsed.data.unit,
      quantity: parsed.data.quantity,
      month,
      locationName: parsed.data.locationName ?? null,
      emissionFactorId: emission.factorId,
      kgCo2e: emission.kgCo2e,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath("/carbon-footprint", "layout");
  refresh();
  return {
    error: null,
    success: `Registered (${emission.kgCo2e.toFixed(1)} kgCO₂e).`,
    fieldErrors: {},
  };
}

export async function deleteFuelEntry(id: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;
  await prisma.fuelEntry.deleteMany({
    where: { id, companyId: ctx.company.id },
  });
  revalidatePath("/carbon-footprint", "layout");
  refresh();
}

// ─── Electricity ───────────────────────────────────────────────────

const electricitySchema = z.object({
  kwh: z.coerce.number().positive("kWh must be > 0"),
  month: z.string().trim().min(1, "Month is required"),
  renewablePercent: z.preprocess(
    emptyToUndef,
    z.coerce.number().min(0).max(100).optional(),
  ),
  energyProvider: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  siteId: z.preprocess(emptyToUndef, z.string().cuid().optional()),
  locationName: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  region: z.preprocess(
    emptyToUndef,
    z.enum(["PT", "ES", "FR", "DE", "UK", "US", "EU", "GLOBAL"]).optional(),
  ),
  notes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export async function registerElectricityEntry(
  data: Record<string, string>,
): Promise<SimpleState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  const parsed = electricitySchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: null,
      success: null,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const month = monthDate(parsed.data.month);
  if (!month) {
    return {
      error: null,
      success: null,
      fieldErrors: { month: ["Invalid month"] },
    };
  }

  if (parsed.data.siteId) {
    const owns = await prisma.site.findFirst({
      where: { id: parsed.data.siteId, companyId: ctx.company.id },
      select: { id: true },
    });
    if (!owns) {
      return {
        error: null,
        success: null,
        fieldErrors: { siteId: ["Unknown site for this company."] },
      };
    }
  }

  const emission = await computeElectricityEmission({
    kwh: parsed.data.kwh,
    renewablePercent: parsed.data.renewablePercent ?? null,
    companyId: ctx.company.id,
    region: parsed.data.region ?? "EU",
  });

  await prisma.electricityEntry.create({
    data: {
      companyId: ctx.company.id,
      siteId: parsed.data.siteId ?? null,
      kwh: parsed.data.kwh,
      month,
      renewablePercent: parsed.data.renewablePercent ?? null,
      energyProvider: parsed.data.energyProvider ?? null,
      locationName: parsed.data.locationName ?? null,
      emissionFactorId: emission.factorId,
      kgCo2e: emission.kgCo2e,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath("/carbon-footprint", "layout");
  refresh();
  return {
    error: null,
    success: `Registered (${emission.kgCo2e.toFixed(1)} kgCO₂e).`,
    fieldErrors: {},
  };
}

export async function deleteElectricityEntry(id: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;
  await prisma.electricityEntry.deleteMany({
    where: { id, companyId: ctx.company.id },
  });
  revalidatePath("/carbon-footprint", "layout");
  refresh();
}
