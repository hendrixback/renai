-- Migration: 0008_production_volume
--
-- WHAT:
--   Adds the ProductionVolume table — sole persistent input to the
--   Production Emission Factor (PEF) view per Spec §13 + Amendment A2.
--
-- WHY:
--   Per Amendment A2, PEF is *not* a CRUD entity (no PEF rows). The
--   factor itself is `totalEmissions(period, scopes) / volume`,
--   computed live every time it's read so a late-arriving Scope 1/2/3
--   entry can't leave the saved PEF stale. ProductionVolume captures
--   the only independent input — production output per period × plant
--   × product label — and the calc joins it with the existing emission
--   tables on read.
--
-- SAFETY:
--   Zero-downtime. New table, no changes to existing data or columns.
--
-- ROLLBACK:
--   DROP TABLE "ProductionVolume";

-- CreateTable
CREATE TABLE "ProductionVolume" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "productLabel" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "reportingYear" INTEGER NOT NULL,
    "reportingMonth" INTEGER NOT NULL,
    "volume" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionVolume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionVolume_companyId_month_idx" ON "ProductionVolume"("companyId", "month");

-- CreateIndex
CREATE INDEX "ProductionVolume_companyId_reportingYear_idx" ON "ProductionVolume"("companyId", "reportingYear");

-- CreateIndex
CREATE INDEX "ProductionVolume_siteId_idx" ON "ProductionVolume"("siteId");

-- CreateIndex
CREATE INDEX "ProductionVolume_recordStatus_idx" ON "ProductionVolume"("recordStatus");

-- CreateIndex
CREATE INDEX "ProductionVolume_deletedAt_idx" ON "ProductionVolume"("deletedAt");

-- AddForeignKey
ALTER TABLE "ProductionVolume" ADD CONSTRAINT "ProductionVolume_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionVolume" ADD CONSTRAINT "ProductionVolume_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionVolume" ADD CONSTRAINT "ProductionVolume_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionVolume" ADD CONSTRAINT "ProductionVolume_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
