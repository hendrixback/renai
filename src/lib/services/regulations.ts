import "server-only";

import type {
  Prisma,
  Regulation,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type CreateRegulationInput,
  type ListRegulationsParams,
  type UpdateRegulationInput,
} from "@/lib/schemas/regulation.schema";

type ServiceContext = {
  user: { id: string };
  company: { id: string };
};

/**
 * Regulations service (Spec §16). Per-tenant register of EU + national
 * environmental rules the company tracks.
 *
 * Per ADR-007, every method scopes by `companyId` from `ctx` so callers
 * can't cross-tenant by accident. Soft-delete via `deletedAt` keeps the
 * audit trail intact when admins remove an entry.
 */

function buildWhere(
  companyId: string,
  params: ListRegulationsParams = {},
): Prisma.RegulationWhereInput {
  const where: Prisma.RegulationWhereInput = {
    companyId,
    deletedAt: null,
  };
  if (params.type) where.type = params.type;
  if (params.topic) where.topic = params.topic;
  if (params.geography) where.geography = params.geography;
  if (params.appliesToUs) where.appliesToUs = params.appliesToUs === "true";
  if (params.regulatoryStatus) where.regulatoryStatus = params.regulatoryStatus;
  if (params.priorityLevel) where.priorityLevel = params.priorityLevel;
  if (params.q && params.q.trim().length > 0) {
    const q = params.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { sourceReference: { contains: q, mode: "insensitive" } },
      { internalNotes: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

export type RegulationListItem = Regulation & {
  createdBy: { name: string | null; email: string } | null;
  updatedBy: { name: string | null; email: string } | null;
};

async function list(
  ctx: ServiceContext,
  params: ListRegulationsParams = {},
): Promise<RegulationListItem[]> {
  return prisma.regulation.findMany({
    where: buildWhere(ctx.company.id, params),
    orderBy: [
      { priorityLevel: "desc" }, // critical → low (string ordering on enum still works because of alphabetical happenstance — guard with explicit sort below if it ever changes)
      { effectiveDate: "desc" },
      { updatedAt: "desc" },
    ],
    include: {
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
    },
  });
}

export type RegulationDetail = Regulation & {
  createdBy: { name: string | null; email: string } | null;
  updatedBy: { name: string | null; email: string } | null;
  reviewedBy: { name: string | null; email: string } | null;
};

async function getById(
  ctx: ServiceContext,
  id: string,
): Promise<RegulationDetail | null> {
  return prisma.regulation.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });
}

async function create(
  ctx: ServiceContext,
  input: CreateRegulationInput,
): Promise<Regulation> {
  return prisma.regulation.create({
    data: {
      companyId: ctx.company.id,
      createdById: ctx.user.id,
      updatedById: ctx.user.id,
      title: input.title,
      type: input.type,
      geography: input.geography,
      topic: input.topic,
      summary: input.summary,
      sourceReference: input.sourceReference ?? null,
      effectiveDate: input.effectiveDate ?? null,
      regulatoryStatus: input.regulatoryStatus,
      appliesToUs: input.appliesToUs,
      priorityLevel: input.priorityLevel,
      internalNotes: input.internalNotes ?? null,
      reviewedById: input.reviewedById ?? null,
      reviewDate: input.reviewDate ?? null,
    },
  });
}

async function update(
  ctx: ServiceContext,
  id: string,
  input: UpdateRegulationInput,
): Promise<Regulation | null> {
  // Tenant guard: only update if the row belongs to this company.
  const existing = await prisma.regulation.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.regulation.update({
    where: { id: existing.id },
    data: {
      updatedById: ctx.user.id,
      title: input.title,
      type: input.type,
      geography: input.geography,
      topic: input.topic,
      summary: input.summary,
      sourceReference: input.sourceReference ?? null,
      effectiveDate: input.effectiveDate ?? null,
      regulatoryStatus: input.regulatoryStatus,
      appliesToUs: input.appliesToUs,
      priorityLevel: input.priorityLevel,
      internalNotes: input.internalNotes ?? null,
      reviewedById: input.reviewedById ?? null,
      reviewDate: input.reviewDate ?? null,
    },
  });
}

async function softDelete(
  ctx: ServiceContext,
  id: string,
): Promise<Regulation | null> {
  const existing = await prisma.regulation.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return null;
  return prisma.regulation.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), updatedById: ctx.user.id },
  });
}

export const RegulationsService = {
  list,
  getById,
  create,
  update,
  softDelete,
  buildWhere,
};
