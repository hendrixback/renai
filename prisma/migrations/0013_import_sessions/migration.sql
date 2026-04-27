-- Migration: 0013_import_sessions
--
-- WHAT:
--   Creates the ImportSession table + ImportSessionStatus enum to back
--   the CSV / XLSX import workflow (Spec §20). Each session captures
--   the uploaded file (storage key + metadata), the per-row validation
--   report, the user's column mapping, and the commit outcome.
--
-- WHY:
--   Imports are stateful: upload → parse → map → validate → preview →
--   commit. We need a row to bind those steps together so the user can
--   leave and return, the audit trail records who did what, and we can
--   re-validate or retry without re-uploading.
--
-- SAFETY:
--   New table + new enum. Zero impact on any existing table; no
--   backfill, no locks. Fully reversible.
--
-- ROLLBACK:
--   DROP TABLE "ImportSession";
--   DROP TYPE "ImportSessionStatus";

-- CreateEnum
CREATE TYPE "ImportSessionStatus" AS ENUM (
  'UPLOADED',
  'PARSED',
  'VALIDATED',
  'COMMITTING',
  'COMMITTED',
  'FAILED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "ImportSession" (
  "id"            TEXT NOT NULL,
  "companyId"     TEXT NOT NULL,
  "uploadedById"  TEXT,
  "module"        TEXT NOT NULL,
  "filename"      TEXT NOT NULL,
  "storageKey"    TEXT NOT NULL,
  "fileSize"      INTEGER NOT NULL,
  "mimeType"      TEXT NOT NULL,
  "status"        "ImportSessionStatus" NOT NULL DEFAULT 'UPLOADED',
  "headers"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "columnMap"     JSONB,
  "totalRows"     INTEGER NOT NULL DEFAULT 0,
  "validRows"     INTEGER NOT NULL DEFAULT 0,
  "errorRows"     INTEGER NOT NULL DEFAULT 0,
  "errorReport"   JSONB,
  "committedRows" INTEGER NOT NULL DEFAULT 0,
  "errorMessage"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportSession_companyId_status_idx" ON "ImportSession"("companyId", "status");
CREATE INDEX "ImportSession_companyId_module_idx" ON "ImportSession"("companyId", "module");
CREATE INDEX "ImportSession_companyId_createdAt_idx" ON "ImportSession"("companyId", "createdAt");
CREATE INDEX "ImportSession_uploadedById_idx" ON "ImportSession"("uploadedById");

-- AddForeignKey
ALTER TABLE "ImportSession"
  ADD CONSTRAINT "ImportSession_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportSession"
  ADD CONSTRAINT "ImportSession_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
