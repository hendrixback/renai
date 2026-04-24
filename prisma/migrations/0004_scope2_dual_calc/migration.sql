-- Migration: 0004_scope2_dual_calc
--
-- WHAT:
--   Adds two columns to ElectricityEntry to store the GHG-Protocol-compliant
--   dual calculation mandated by Spec §11.4 / Amendment A4:
--     • locationBasedKgCo2e — kwh × pure grid factor (renewable% ignored)
--     • marketBasedKgCo2e   — supplier-specific factor OR residual grid
--                             mix with renewable% applied
--
-- WHY:
--   The original single-value kgCo2e column conflated location and market
--   accounting. GHG Protocol, CSRD, and ISSB all require both. The gap
--   analysis flagged this as a CRITICAL correctness issue.
--
-- SAFETY:
--   Pure column addition (nullable). The legacy kgCo2e column is preserved
--   unchanged — new rows mirror marketBasedKgCo2e into kgCo2e for
--   backwards compatibility with any read paths that haven't migrated yet.
--   Zero downtime.
--
-- ROLLBACK:
--   ALTER TABLE "ElectricityEntry"
--     DROP COLUMN "locationBasedKgCo2e",
--     DROP COLUMN "marketBasedKgCo2e";
--
-- BACKFILL (post-deploy, manual):
--   For existing rows the dual values can be derived:
--     locationBasedKgCo2e = emissionFactor.kgCo2ePerUnit * kwh
--     marketBasedKgCo2e   = emissionFactor.kgCo2ePerUnit * kwh * (1 - renewablePercent/100)
--   Consider running this as a one-off script after deploy if historical
--   YoY accuracy matters from day one.

-- AlterTable
ALTER TABLE "ElectricityEntry" ADD COLUMN     "locationBasedKgCo2e" DECIMAL(14,3),
ADD COLUMN     "marketBasedKgCo2e" DECIMAL(14,3);

