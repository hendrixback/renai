-- Migration: 0011_scope1_title_source_reference
--
-- WHAT:
--   Adds two columns to "FuelEntry" required by Spec §10.3.1 + §10.3.2:
--     - title           TEXT  (entry display name; required for new
--                              entries via app-level Zod validation;
--                              nullable in DB so historical rows stay
--                              valid)
--     - sourceReference TEXT  (invoice number / meter reference; always
--                              optional)
--
-- WHY:
--   Until now, Scope 1 entries had no human-friendly identifier — list
--   views and audit reports had to fall back to fuel type + month,
--   which collides when multiple entries exist per period. The spec
--   also mandates a way to record the original source document
--   reference (invoice id, meter reading id) for auditability.
--
-- SAFETY:
--   Zero-downtime additive migration. Both columns are nullable with
--   no default, so existing rows are unchanged and any deploy order
--   (old code + new schema OR new code + old schema) keeps working.
--
-- ROLLBACK:
--   ALTER TABLE "FuelEntry" DROP COLUMN "title";
--   ALTER TABLE "FuelEntry" DROP COLUMN "sourceReference";

-- AlterTable
ALTER TABLE "FuelEntry"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "sourceReference" TEXT;
