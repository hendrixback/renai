-- Migration: 0012_regulation_module
--
-- WHAT:
--   Creates the per-tenant Regulations register (Spec §16):
--     - "Regulation" table with title / type / geography / topic /
--       summary / source / dates / status / appliesToUs / priority /
--       internalNotes / review fields + standard audit columns.
--     - 4 enums: RegulationType, RegulationTopic, RegulationStatus,
--       RegulationPriority.
--
-- WHY:
--   MVP customers (Maxtil first) need a curated view of EU + national
--   environmental regulations relevant to their operations, with
--   document linkage and admin review workflow. AI-generated content
--   is explicitly out per Spec_Amendments §A5; this is admin-only
--   manual CRUD with seed data shipped per tenant.
--
-- SAFETY:
--   New table + new enums only. Zero-downtime, no data backfill, no
--   impact on existing tables. Document linkage already routes through
--   the existing polymorphic DocumentLink table (module="regulation"
--   is already permitted by the validator).
--
-- ROLLBACK:
--   DROP TABLE "Regulation";
--   DROP TYPE "RegulationPriority";
--   DROP TYPE "RegulationStatus";
--   DROP TYPE "RegulationTopic";
--   DROP TYPE "RegulationType";

-- CreateEnum
CREATE TYPE "RegulationType" AS ENUM (
  'EU_REGULATION',
  'EU_DIRECTIVE',
  'NATIONAL_LAW',
  'NATIONAL_DECREE',
  'GUIDANCE',
  'REPORTING_STANDARD',
  'REGULATORY_UPDATE',
  'INTERNAL_COMPLIANCE_NOTE',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "RegulationTopic" AS ENUM (
  'WASTE_MANAGEMENT',
  'CARBON_FOOTPRINT',
  'GHG_REPORTING',
  'ESG_REPORTING',
  'ENERGY',
  'HAZARDOUS_WASTE',
  'ENVIRONMENTAL_LICENSING',
  'AUDIT_AND_DOCUMENTATION',
  'INDUSTRIAL_COMPLIANCE',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "RegulationStatus" AS ENUM (
  'PROPOSED',
  'IN_FORCE',
  'SUPERSEDED',
  'REPEALED'
);

-- CreateEnum
CREATE TYPE "RegulationPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- CreateTable
CREATE TABLE "Regulation" (
  "id"               TEXT NOT NULL,
  "companyId"        TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "type"             "RegulationType" NOT NULL,
  "geography"        VARCHAR(40) NOT NULL,
  "topic"            "RegulationTopic" NOT NULL,
  "summary"          TEXT NOT NULL,
  "sourceReference"  TEXT,
  "effectiveDate"    TIMESTAMP(3),
  "regulatoryStatus" "RegulationStatus" NOT NULL DEFAULT 'IN_FORCE',
  "appliesToUs"      BOOLEAN NOT NULL DEFAULT false,
  "priorityLevel"    "RegulationPriority" NOT NULL DEFAULT 'MEDIUM',
  "internalNotes"    TEXT,
  "reviewedById"     TEXT,
  "reviewDate"       TIMESTAMP(3),
  "recordStatus"     "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdById"      TEXT,
  "updatedById"      TEXT,
  "deletedAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Regulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Regulation_companyId_idx" ON "Regulation"("companyId");
CREATE INDEX "Regulation_companyId_geography_idx" ON "Regulation"("companyId", "geography");
CREATE INDEX "Regulation_companyId_topic_idx" ON "Regulation"("companyId", "topic");
CREATE INDEX "Regulation_companyId_regulatoryStatus_idx" ON "Regulation"("companyId", "regulatoryStatus");
CREATE INDEX "Regulation_companyId_appliesToUs_idx" ON "Regulation"("companyId", "appliesToUs");
CREATE INDEX "Regulation_companyId_effectiveDate_idx" ON "Regulation"("companyId", "effectiveDate");
CREATE INDEX "Regulation_companyId_recordStatus_idx" ON "Regulation"("companyId", "recordStatus");
CREATE INDEX "Regulation_deletedAt_idx" ON "Regulation"("deletedAt");

-- AddForeignKey
ALTER TABLE "Regulation"
  ADD CONSTRAINT "Regulation_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Regulation"
  ADD CONSTRAINT "Regulation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Regulation"
  ADD CONSTRAINT "Regulation_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Regulation"
  ADD CONSTRAINT "Regulation_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
