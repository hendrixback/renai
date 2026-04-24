# Database migrations

Everything here gets applied automatically on every Railway deploy by
`prisma migrate deploy`, invoked from the Dockerfile CMD before
`node server.js` starts. Migrations are idempotent — Prisma tracks what's
been applied via the `_prisma_migrations` table, so re-running is safe.

**Migrations are named `NNNN_description`. Prisma applies them in
lexicographic order.** Don't rename or reorder a migration once it has
landed on any environment.

---

## Applied / to-be-applied sequence

| # | Name | What it does | Risk | Applied on prod? |
|---|---|---|---|---|
| 0001 | `init` | Original schema: User, Company, Membership, Site, Invitation, WasteFlow + LoW/EWC catalogs, FuelEntry, ElectricityEntry, EmissionFactor, all enums. | baseline | yes |
| 0002 | `phase1_foundation` | Audit primitives: `ActivityLog` + `ActivityType` + `RecordStatus` enums, `FactorRevision` entity, `createdById`/`updatedById`/`deletedAt` on operational records, `reportingYear`/`reportingMonth` denormalised fields, `baselineYear` on Company, `lastActiveAt` on User, `revokedAt` on Invitation, `factorSnapshot` Json on fuel/electricity entries. | zero-downtime (all additions nullable or defaulted) | **no — will apply on next deploy** |
| 0003 | `documentation` | Documentation module: `Document` entity, `DocumentLink` polymorphic join, `DocumentType` enum. | zero-downtime (new tables only) | **no — will apply on next deploy** |
| 0004 | `scope2_dual_calc` | Adds `locationBasedKgCo2e` + `marketBasedKgCo2e` to `ElectricityEntry` for GHG-Protocol-compliant dual accounting. Legacy `kgCo2e` preserved; new rows mirror `marketBasedKgCo2e` into it. | zero-downtime (2 nullable columns) | **no — will apply on next deploy** |

---

## What happens on the next Railway deploy

1. Container boot.
2. Dockerfile CMD runs `prisma migrate deploy`.
3. Prisma connects to the Postgres at `DATABASE_URL`, reads
   `_prisma_migrations`, and applies any missing migrations in order.
4. On success, `exec node server.js` starts the Next.js server.
5. On failure, container exits non-zero. Railway retries per
   `railway.toml` (ON_FAILURE, max 3 retries) then the deploy fails
   with the migration error visible in the deploy log.

Each of migrations 0002–0004 is **additive** (new columns / tables /
enums, no column drops, no type changes). Apply time on a small table
(Maxtil-scale) is sub-second. Application code continues to work
against the old schema during the brief window between container
start and request traffic — but since the migration runs **before**
the server listens, there is effectively zero window.

---

## Adding a new migration

Local dev with a Postgres running:

```bash
npx prisma migrate dev --name short_snake_case_description
```

This creates a new `NNNN_...` directory, applies to local DB, and
regenerates the client. Commit the new directory + schema change.

No local DB? Use the offline diff pattern:

```bash
git show HEAD:prisma/schema.prisma > /tmp/schema_before.prisma
# ... edit schema.prisma ...
npx prisma migrate diff \
  --from-schema /tmp/schema_before.prisma \
  --to-schema prisma/schema.prisma \
  --script \
  > prisma/migrations/NNNN_name/migration.sql
```

Then manually add a header comment block documenting what/why/safety/
rollback per `Contribution_Standards.md §13`. Verify syntax with
`npx prisma validate`.

---

## Rollback policy

Prisma does not generate down-migrations. For every migration we
document a rollback SQL block in its header comment. If a production
rollback is ever needed:

1. Run the rollback SQL manually against Railway Postgres (requires
   explicit approval per the project's safety rules).
2. Delete the corresponding row from `_prisma_migrations`.
3. Re-deploy with the problematic migration removed or fixed.

Prefer writing forward-only corrective migrations over rolling back.
