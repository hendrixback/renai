-- Migration: 0005_scope1_emission_source_type
--
-- WHAT:
--   Adds the EmissionSourceType enum (11 canonical values per Spec §10.4)
--   and a nullable `emissionSourceType` column on FuelEntry.
--
-- WHY:
--   Audit reports require source classification independent of fuel type
--   (same fuel burned in a boiler vs. a truck tells different stories
--   for ESG disclosure). Spec §10.3.1 flags it as a core record field;
--   §10.4 lists the canonical 11 types.
--
-- SAFETY:
--   Zero-downtime. Nullable column; no existing rows break. Seed data
--   has no source-type classification today — existing rows will simply
--   show "—" in the UI until edited.
--
-- ROLLBACK:
--   ALTER TABLE "FuelEntry" DROP COLUMN "emissionSourceType";
--   DROP TYPE "EmissionSourceType";

-- CreateEnum
CREATE TYPE "EmissionSourceType" AS ENUM ('STATIONARY_COMBUSTION', 'MOBILE_COMBUSTION', 'COMPANY_VEHICLES', 'BOILERS', 'GENERATORS', 'NATURAL_GAS_USE', 'DIESEL_USE', 'LPG_USE', 'GASOLINE_USE', 'PROCESS_EMISSIONS', 'FUGITIVE_EMISSIONS');

-- AlterTable
ALTER TABLE "FuelEntry" ADD COLUMN     "emissionSourceType" "EmissionSourceType";

