"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
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

type ParsedMonth = {
  date: Date;
  year: number;
  month: number;
};

function parseMonth(raw: unknown): ParsedMonth | null {
  if (typeof raw !== "string" || !raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return {
    date: new Date(Date.UTC(year, month - 1, 1)),
    year,
    month,
  };
}

/**
 * Build a JSON snapshot of the emission factor used at write time so the
 * record's calculation basis is preserved even if the factor row is
 * updated or superseded later (ADR-008).
 */
async function buildFactorSnapshot(factorId: string | null | undefined) {
  if (!factorId) return null;
  const factor = await prisma.emissionFactor.findUnique({
    where: { id: factorId },
    select: {
      id: true,
      kgCo2ePerUnit: true,
      unit: true,
      source: true,
      region: true,
      year: true,
      subtype: true,
      category: true,
    },
  });
  if (!factor) return null;
  return {
    id: factor.id,
    category: factor.category,
    subtype: factor.subtype,
    value: factor.kgCo2ePerUnit.toString(),
    unit: factor.unit,
    source: factor.source,
    region: factor.region,
    year: factor.year,
    type: "STANDARD" as const,
  };
}

const PERMISSION_DENIED_REGISTER =
  "You don't have permission to register emissions data.";

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

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: PERMISSION_DENIED_REGISTER, success: null, fieldErrors: {} };
    }
    throw err;
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

  const month = parseMonth(parsed.data.month);
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
  const factorSnapshot = await buildFactorSnapshot(emission.factorId);

  const entry = await prisma.fuelEntry.create({
    data: {
      companyId: ctx.company.id,
      createdById: ctx.user.id,
      updatedById: ctx.user.id,
      siteId: parsed.data.siteId ?? null,
      fuelType: parsed.data.fuelType,
      unit: parsed.data.unit,
      quantity: parsed.data.quantity,
      month: month.date,
      reportingYear: month.year,
      reportingMonth: month.month,
      locationName: parsed.data.locationName ?? null,
      emissionFactorId: emission.factorId,
      factorSnapshot: factorSnapshot ?? undefined,
      kgCo2e: emission.kgCo2e,
      notes: parsed.data.notes ?? null,
    },
    select: { id: true, fuelType: true, quantity: true, unit: true },
  });

  await logActivity(ctx, {
    type: "RECORD_CREATED",
    module: "scope-1",
    recordId: entry.id,
    description: `Registered ${entry.quantity} ${entry.unit} of ${entry.fuelType} (${emission.kgCo2e.toFixed(1)} kgCO₂e)`,
    metadata: {
      fuelType: entry.fuelType,
      reportingYear: month.year,
      reportingMonth: month.month,
      kgCo2e: emission.kgCo2e,
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

export async function updateFuelEntry(
  id: string,
  data: Record<string, string>,
): Promise<SimpleState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return {
        error: PERMISSION_DENIED_REGISTER,
        success: null,
        fieldErrors: {},
      };
    }
    throw err;
  }

  const existing = await prisma.fuelEntry.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true, fuelType: true, quantity: true, unit: true },
  });
  if (!existing) {
    return { error: "Entry not found", success: null, fieldErrors: {} };
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

  const month = parseMonth(parsed.data.month);
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

  // Re-compute emissions because fuel type / quantity / region may have changed.
  const emission = await computeFuelEmission({
    fuelType: parsed.data.fuelType,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    companyId: ctx.company.id,
    region: parsed.data.region ?? "GLOBAL",
  });
  const factorSnapshot = await buildFactorSnapshot(emission.factorId);

  await prisma.fuelEntry.update({
    where: { id: existing.id },
    data: {
      updatedById: ctx.user.id,
      siteId: parsed.data.siteId ?? null,
      fuelType: parsed.data.fuelType,
      unit: parsed.data.unit,
      quantity: parsed.data.quantity,
      month: month.date,
      reportingYear: month.year,
      reportingMonth: month.month,
      locationName: parsed.data.locationName ?? null,
      emissionFactorId: emission.factorId,
      factorSnapshot: factorSnapshot ?? undefined,
      kgCo2e: emission.kgCo2e,
      notes: parsed.data.notes ?? null,
    },
  });

  await logActivity(ctx, {
    type: "RECORD_UPDATED",
    module: "scope-1",
    recordId: existing.id,
    description: `Updated Scope 1 entry (${parsed.data.fuelType}, ${parsed.data.quantity} ${parsed.data.unit}) — ${emission.kgCo2e.toFixed(1)} kgCO₂e`,
    metadata: {
      fuelType: parsed.data.fuelType,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      kgCo2e: emission.kgCo2e,
    },
  });

  revalidatePath("/carbon-footprint", "layout");
  revalidatePath(`/carbon-footprint/fuel/${existing.id}`);
  refresh();
  return {
    error: null,
    success: `Saved (${emission.kgCo2e.toFixed(1)} kgCO₂e).`,
    fieldErrors: {},
  };
}

export async function deleteFuelEntry(id: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    // Carbon-entry deletion stays at MEMBER: correcting a typo shouldn't
    // require admin escalation. WasteFlow deletion (bigger entity) is
    // gated at ADMIN.
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const target = await prisma.fuelEntry.findFirst({
    where: { id, companyId: ctx.company.id },
    select: { id: true, fuelType: true, quantity: true, unit: true, kgCo2e: true },
  });
  if (!target) return;

  await prisma.fuelEntry.delete({ where: { id: target.id } });

  await logActivity(ctx, {
    type: "RECORD_DELETED",
    module: "scope-1",
    recordId: target.id,
    description: `Deleted Scope 1 entry: ${target.quantity} ${target.unit} ${target.fuelType}`,
    metadata: {
      fuelType: target.fuelType,
      kgCo2e: target.kgCo2e?.toString() ?? null,
    },
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

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: PERMISSION_DENIED_REGISTER, success: null, fieldErrors: {} };
    }
    throw err;
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

  const month = parseMonth(parsed.data.month);
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
  const factorSnapshot = await buildFactorSnapshot(emission.factorId);

  const entry = await prisma.electricityEntry.create({
    data: {
      companyId: ctx.company.id,
      createdById: ctx.user.id,
      updatedById: ctx.user.id,
      siteId: parsed.data.siteId ?? null,
      kwh: parsed.data.kwh,
      month: month.date,
      reportingYear: month.year,
      reportingMonth: month.month,
      renewablePercent: parsed.data.renewablePercent ?? null,
      energyProvider: parsed.data.energyProvider ?? null,
      locationName: parsed.data.locationName ?? null,
      emissionFactorId: emission.factorId,
      factorSnapshot: factorSnapshot ?? undefined,
      locationBasedKgCo2e: emission.locationBasedKgCo2e,
      marketBasedKgCo2e: emission.marketBasedKgCo2e,
      // Legacy mirror — read paths that haven't switched to the dual columns
      // still see the market-based value, which is the more commonly
      // reported figure in corporate disclosures.
      kgCo2e: emission.marketBasedKgCo2e,
      notes: parsed.data.notes ?? null,
    },
    select: {
      id: true,
      kwh: true,
      renewablePercent: true,
      energyProvider: true,
    },
  });

  await logActivity(ctx, {
    type: "RECORD_CREATED",
    module: "scope-2",
    recordId: entry.id,
    description: `Registered ${entry.kwh} kWh${
      entry.renewablePercent ? ` (${entry.renewablePercent}% renewable)` : ""
    } — market-based ${emission.marketBasedKgCo2e.toFixed(1)} kgCO₂e / location-based ${emission.locationBasedKgCo2e.toFixed(1)} kgCO₂e`,
    metadata: {
      kwh: entry.kwh.toString(),
      renewablePercent: entry.renewablePercent?.toString() ?? null,
      energyProvider: entry.energyProvider,
      reportingYear: month.year,
      reportingMonth: month.month,
      locationBasedKgCo2e: emission.locationBasedKgCo2e,
      marketBasedKgCo2e: emission.marketBasedKgCo2e,
    },
  });

  revalidatePath("/carbon-footprint", "layout");
  refresh();
  return {
    error: null,
    success: `Registered (market-based ${emission.marketBasedKgCo2e.toFixed(1)} kgCO₂e).`,
    fieldErrors: {},
  };
}

export async function updateElectricityEntry(
  id: string,
  data: Record<string, string>,
): Promise<SimpleState> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return { error: "Not authenticated", success: null, fieldErrors: {} };
  }

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return {
        error: PERMISSION_DENIED_REGISTER,
        success: null,
        fieldErrors: {},
      };
    }
    throw err;
  }

  const existing = await prisma.electricityEntry.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { error: "Entry not found", success: null, fieldErrors: {} };
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

  const month = parseMonth(parsed.data.month);
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
  const factorSnapshot = await buildFactorSnapshot(emission.factorId);

  await prisma.electricityEntry.update({
    where: { id: existing.id },
    data: {
      updatedById: ctx.user.id,
      siteId: parsed.data.siteId ?? null,
      kwh: parsed.data.kwh,
      month: month.date,
      reportingYear: month.year,
      reportingMonth: month.month,
      renewablePercent: parsed.data.renewablePercent ?? null,
      energyProvider: parsed.data.energyProvider ?? null,
      locationName: parsed.data.locationName ?? null,
      emissionFactorId: emission.factorId,
      factorSnapshot: factorSnapshot ?? undefined,
      locationBasedKgCo2e: emission.locationBasedKgCo2e,
      marketBasedKgCo2e: emission.marketBasedKgCo2e,
      kgCo2e: emission.marketBasedKgCo2e,
      notes: parsed.data.notes ?? null,
    },
  });

  await logActivity(ctx, {
    type: "RECORD_UPDATED",
    module: "scope-2",
    recordId: existing.id,
    description: `Updated Scope 2 entry (${parsed.data.kwh} kWh) — market ${emission.marketBasedKgCo2e.toFixed(1)} kgCO₂e / location ${emission.locationBasedKgCo2e.toFixed(1)} kgCO₂e`,
    metadata: {
      kwh: parsed.data.kwh,
      renewablePercent: parsed.data.renewablePercent ?? null,
      locationBasedKgCo2e: emission.locationBasedKgCo2e,
      marketBasedKgCo2e: emission.marketBasedKgCo2e,
    },
  });

  revalidatePath("/carbon-footprint", "layout");
  revalidatePath(`/carbon-footprint/electricity/${existing.id}`);
  refresh();
  return {
    error: null,
    success: `Saved (market-based ${emission.marketBasedKgCo2e.toFixed(1)} kgCO₂e).`,
    fieldErrors: {},
  };
}

export async function deleteElectricityEntry(id: string) {
  const ctx = await getCurrentContext();
  if (!ctx) return;

  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) return;
    throw err;
  }

  const target = await prisma.electricityEntry.findFirst({
    where: { id, companyId: ctx.company.id },
    select: {
      id: true,
      kwh: true,
      kgCo2e: true,
      locationBasedKgCo2e: true,
      marketBasedKgCo2e: true,
    },
  });
  if (!target) return;

  await prisma.electricityEntry.delete({ where: { id: target.id } });

  await logActivity(ctx, {
    type: "RECORD_DELETED",
    module: "scope-2",
    recordId: target.id,
    description: `Deleted Scope 2 entry: ${target.kwh} kWh`,
    metadata: {
      kwh: target.kwh.toString(),
      locationBasedKgCo2e: target.locationBasedKgCo2e?.toString() ?? null,
      marketBasedKgCo2e:
        target.marketBasedKgCo2e?.toString() ?? target.kgCo2e?.toString() ?? null,
    },
  });

  revalidatePath("/carbon-footprint", "layout");
  refresh();
}
