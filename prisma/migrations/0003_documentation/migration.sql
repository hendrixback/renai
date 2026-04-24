-- Migration: 0003_documentation
--
-- WHAT:
--   Documentation module schema (Phase 2 prep):
--     • Document entity — metadata for every uploaded file (Spec §15.5).
--       Bytes live in object storage via lib/storage; this row stores
--       metadata + the opaque storageKey pointer.
--     • DocumentLink polymorphic join (ADR-006) — one document can back
--       many records across different modules.
--     • DocumentType enum — 14 values per Spec §15.6.
--
-- WHY:
--   Documentation is the single most blocking missing module per
--   RenAI_Gap_Analysis.md. Every module's "attach evidence" workflow
--   depends on this entity. Document + DocumentLink land together because
--   the link table has a FK to Document; splitting would require a
--   throwaway intermediate state.
--
-- SAFETY:
--   Pure additions (two new tables, one new enum). No existing columns
--   or tables altered. Zero downtime.
--
-- ROLLBACK:
--   DROP TABLE "DocumentLink";
--   DROP TABLE "Document";
--   DROP TYPE "DocumentType";
--
-- DEPENDENCIES:
--   Requires migration 0002_phase1_foundation to have been applied first
--   (uses the RecordStatus enum and the audit-field FK targets on User).

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'WASTE_CERTIFICATE', 'COLLECTION_RECEIPT', 'FUEL_BILL', 'ELECTRICITY_BILL', 'SUPPLIER_DOCUMENT', 'INTERNAL_REPORT', 'AUDIT_EVIDENCE', 'ENVIRONMENTAL_LICENSE', 'CONTRACT', 'EMISSIONS_EVIDENCE', 'PRODUCTION_REPORT', 'REGULATORY_FILE', 'OTHER');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "plantId" TEXT,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "department" TEXT,
    "reportingYear" INTEGER,
    "reportingMonth" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "linkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_companyId_createdAt_idx" ON "Document"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_companyId_documentType_idx" ON "Document"("companyId", "documentType");

-- CreateIndex
CREATE INDEX "Document_companyId_reportingYear_idx" ON "Document"("companyId", "reportingYear");

-- CreateIndex
CREATE INDEX "Document_companyId_plantId_idx" ON "Document"("companyId", "plantId");

-- CreateIndex
CREATE INDEX "Document_recordStatus_idx" ON "Document"("recordStatus");

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

-- CreateIndex
CREATE INDEX "Document_storageKey_idx" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "DocumentLink_module_recordId_idx" ON "DocumentLink"("module", "recordId");

-- CreateIndex
CREATE INDEX "DocumentLink_documentId_idx" ON "DocumentLink"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentLink_documentId_module_recordId_key" ON "DocumentLink"("documentId", "module", "recordId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

