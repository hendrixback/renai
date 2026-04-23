-- Migration: 0002_phase1_foundation
--
-- WHAT:
--   Phase 1 foundation layer. Adds cross-cutting infrastructure that every
--   future feature depends on:
--     • ActivityLog entity + ActivityType enum (audit trail, ADR-005)
--     • FactorRevision entity (emission factor versioning, ADR-008)
--     • RecordStatus enum (DRAFT / ACTIVE / ARCHIVED lifecycle)
--     • Audit fields (createdById, updatedById, deletedAt) on Site, FuelEntry,
--       ElectricityEntry, WasteFlow (per Spec §23.14)
--     • Reporting period fields (reportingYear, reportingMonth) for YoY queries
--       (per Spec Amendment A7)
--     • baselineYear on Company (ESG baseline for CSRD/ISSB)
--     • lastActiveAt on User (for Team Overview §17.4)
--     • revokedAt on Invitation (distinguishes revoked from accepted)
--     • factorSnapshot JSON on FuelEntry/ElectricityEntry (factor traceability)
--
-- WHY:
--   Building these primitives now prevents retrofit across every future module.
--   Every entity in the platform will need audit trail, soft-delete, and
--   period-based queries. Building once, using everywhere.
--
-- SAFETY:
--   All column additions are nullable (or have DEFAULT for recordStatus).
--   No existing columns are altered or removed. No data is mutated.
--   Migration is backwards-compatible: old code continues to work against the
--   new schema (new columns are simply unused).
--
-- ROLLBACK PLAN:
--   Down migration (if ever needed):
--     DROP TABLE "ActivityLog";
--     DROP TABLE "FactorRevision";
--     DROP TYPE "ActivityType";
--     DROP TYPE "RecordStatus";
--     ALTER TABLE "User" DROP COLUMN "lastActiveAt";
--     ALTER TABLE "Company" DROP COLUMN "baselineYear";
--     ALTER TABLE "Invitation" DROP COLUMN "revokedAt";
--     ALTER TABLE "Site" DROP COLUMN "createdById", DROP COLUMN "updatedById", DROP COLUMN "deletedAt";
--     ALTER TABLE "FuelEntry" DROP COLUMN "createdById", DROP COLUMN "updatedById",
--       DROP COLUMN "deletedAt", DROP COLUMN "recordStatus", DROP COLUMN "reportingYear",
--       DROP COLUMN "reportingMonth", DROP COLUMN "factorSnapshot";
--     ALTER TABLE "ElectricityEntry" DROP COLUMN "createdById", DROP COLUMN "updatedById",
--       DROP COLUMN "deletedAt", DROP COLUMN "recordStatus", DROP COLUMN "reportingYear",
--       DROP COLUMN "reportingMonth", DROP COLUMN "factorSnapshot";
--     ALTER TABLE "WasteFlow" DROP COLUMN "updatedById", DROP COLUMN "deletedAt",
--       DROP COLUMN "reportingYear", DROP COLUMN "reportingMonth";
--
-- DEPLOYMENT NOTES:
--   - Zero-downtime. Can be applied during normal traffic.
--   - No backfill required; new fields populated by application code going forward.
--   - Follow-up PRs will update server actions to populate createdById/updatedById
--     on writes, populate reportingYear/reportingMonth from month, and call
--     logActivity() for audit trail.

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_DELETED', 'RECORD_STATUS_CHANGED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_DELETED', 'TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'USER_INVITED', 'USER_INVITATION_REVOKED', 'USER_ROLE_CHANGED', 'USER_REMOVED', 'USER_LOGIN', 'USER_LOGOUT', 'USER_PASSWORD_CHANGED', 'REGULATION_UPDATED', 'EMISSION_FACTOR_IMPORTED', 'IMPERSONATION_STARTED', 'IMPERSONATION_ENDED', 'COMPANY_CREATED', 'COMPANY_UPDATED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "baselineYear" INTEGER;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "FuelEntry" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "factorSnapshot" JSONB,
ADD COLUMN     "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "reportingMonth" INTEGER,
ADD COLUMN     "reportingYear" INTEGER,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "ElectricityEntry" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "factorSnapshot" JSONB,
ADD COLUMN     "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "reportingMonth" INTEGER,
ADD COLUMN     "reportingYear" INTEGER,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "WasteFlow" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "reportingMonth" INTEGER,
ADD COLUMN     "reportingYear" INTEGER,
ADD COLUMN     "updatedById" TEXT;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactorRevision" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "factorCount" INTEGER NOT NULL DEFAULT 0,
    "importedById" TEXT,
    "notes" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactorRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_companyId_createdAt_idx" ON "ActivityLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_companyId_module_recordId_idx" ON "ActivityLog"("companyId", "module", "recordId");

-- CreateIndex
CREATE INDEX "ActivityLog_companyId_userId_createdAt_idx" ON "ActivityLog"("companyId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_idx" ON "ActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "FactorRevision_source_version_idx" ON "FactorRevision"("source", "version");

-- CreateIndex
CREATE UNIQUE INDEX "FactorRevision_companyId_source_version_key" ON "FactorRevision"("companyId", "source", "version");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE INDEX "Invitation_revokedAt_idx" ON "Invitation"("revokedAt");

-- CreateIndex
CREATE INDEX "Site_deletedAt_idx" ON "Site"("deletedAt");

-- CreateIndex
CREATE INDEX "FuelEntry_companyId_reportingYear_idx" ON "FuelEntry"("companyId", "reportingYear");

-- CreateIndex
CREATE INDEX "FuelEntry_companyId_reportingYear_reportingMonth_idx" ON "FuelEntry"("companyId", "reportingYear", "reportingMonth");

-- CreateIndex
CREATE INDEX "FuelEntry_recordStatus_idx" ON "FuelEntry"("recordStatus");

-- CreateIndex
CREATE INDEX "FuelEntry_deletedAt_idx" ON "FuelEntry"("deletedAt");

-- CreateIndex
CREATE INDEX "ElectricityEntry_companyId_reportingYear_idx" ON "ElectricityEntry"("companyId", "reportingYear");

-- CreateIndex
CREATE INDEX "ElectricityEntry_companyId_reportingYear_reportingMonth_idx" ON "ElectricityEntry"("companyId", "reportingYear", "reportingMonth");

-- CreateIndex
CREATE INDEX "ElectricityEntry_recordStatus_idx" ON "ElectricityEntry"("recordStatus");

-- CreateIndex
CREATE INDEX "ElectricityEntry_deletedAt_idx" ON "ElectricityEntry"("deletedAt");

-- CreateIndex
CREATE INDEX "WasteFlow_companyId_reportingYear_idx" ON "WasteFlow"("companyId", "reportingYear");

-- CreateIndex
CREATE INDEX "WasteFlow_deletedAt_idx" ON "WasteFlow"("deletedAt");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelEntry" ADD CONSTRAINT "FuelEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelEntry" ADD CONSTRAINT "FuelEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityEntry" ADD CONSTRAINT "ElectricityEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityEntry" ADD CONSTRAINT "ElectricityEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteFlow" ADD CONSTRAINT "WasteFlow_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorRevision" ADD CONSTRAINT "FactorRevision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorRevision" ADD CONSTRAINT "FactorRevision_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

