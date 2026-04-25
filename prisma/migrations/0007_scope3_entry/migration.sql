-- Migration: 0007_scope3_entry
--
-- WHAT:
--   Foundation for Phase 4a (Scope 3 value-chain emissions per Spec §12).
--   - New enum `Scope3Category` (7 GHG-Protocol categories selected for MVP).
--   - 3 new values on `EmissionCategory` (BUSINESS_TRAVEL, EMPLOYEE_COMMUTING,
--     PURCHASED_GOODS) so Scope 3 factors live alongside Scope 1/2 in the
--     same EmissionFactor table.
--   - New `Scope3Entry` table — polymorphic by `category`. Shared core
--     columns (id, companyId, siteId?, category, description, period,
--     kgCo2e, status, audit fields) plus a JSONB `categoryData` payload
--     validated server-side by per-category Zod schemas.
--
-- WHY:
--   Scope 3 is the largest portion of most companies' footprint and the
--   GHG Protocol's 15 categories share little structural overlap. JSONB
--   for category-specific fields keeps the table sane while letting us
--   add categories (8–15) post-MVP without schema migrations.
--   Per-category Zod schemas live in lib/schemas/scope3.schema.ts to
--   enforce shape; ADR-008 carries the factor-snapshot pattern unchanged
--   from Scope 1/2.
--
-- SAFETY:
--   Zero-downtime. Pure additions: new enum, new enum values, new table,
--   no changes to existing data or column types. Postgres 17 supports
--   multiple ALTER TYPE ADD VALUE in a single migration (the warning
--   in the generator output is for PG11 and earlier).
--
-- ROLLBACK:
--   DROP TABLE "Scope3Entry";
--   DROP TYPE "Scope3Category";
--   -- Postgres has no DROP VALUE for enums; the 3 new EmissionCategory
--   -- values are harmless to leave in place. To truly remove them,
--   -- rebuild the enum (see migration 0006 rollback notes for the pattern).

-- CreateEnum
CREATE TYPE "Scope3Category" AS ENUM ('PURCHASED_GOODS_SERVICES', 'FUEL_ENERGY_RELATED', 'UPSTREAM_TRANSPORT', 'WASTE_GENERATED', 'BUSINESS_TRAVEL', 'EMPLOYEE_COMMUTING', 'DOWNSTREAM_TRANSPORT');

-- AlterEnum
ALTER TYPE "EmissionCategory" ADD VALUE 'BUSINESS_TRAVEL';
ALTER TYPE "EmissionCategory" ADD VALUE 'EMPLOYEE_COMMUTING';
ALTER TYPE "EmissionCategory" ADD VALUE 'PURCHASED_GOODS';

-- CreateTable
CREATE TABLE "Scope3Entry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "category" "Scope3Category" NOT NULL,
    "description" TEXT NOT NULL,
    "categoryData" JSONB NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "reportingYear" INTEGER NOT NULL,
    "reportingMonth" INTEGER NOT NULL,
    "emissionFactorId" TEXT,
    "factorSnapshot" JSONB,
    "kgCo2e" DECIMAL(14,3),
    "notes" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scope3Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scope3Entry_companyId_month_idx" ON "Scope3Entry"("companyId", "month");

-- CreateIndex
CREATE INDEX "Scope3Entry_companyId_reportingYear_idx" ON "Scope3Entry"("companyId", "reportingYear");

-- CreateIndex
CREATE INDEX "Scope3Entry_companyId_category_idx" ON "Scope3Entry"("companyId", "category");

-- CreateIndex
CREATE INDEX "Scope3Entry_siteId_idx" ON "Scope3Entry"("siteId");

-- CreateIndex
CREATE INDEX "Scope3Entry_recordStatus_idx" ON "Scope3Entry"("recordStatus");

-- CreateIndex
CREATE INDEX "Scope3Entry_deletedAt_idx" ON "Scope3Entry"("deletedAt");

-- AddForeignKey
ALTER TABLE "Scope3Entry" ADD CONSTRAINT "Scope3Entry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scope3Entry" ADD CONSTRAINT "Scope3Entry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scope3Entry" ADD CONSTRAINT "Scope3Entry_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "EmissionFactor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scope3Entry" ADD CONSTRAINT "Scope3Entry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
