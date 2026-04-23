# RenAI — Execution Plan

> **Timeline estimate**: ~18–22 weeks (4.5–5.5 months) solo; ~10–12 weeks (3 months) with 2–3 devs.
> **Principle**: foundation before features. The "invisible" infrastructure built in Phases 1–3 is what makes Phases 4–6 fast.
> **Dependency rule**: a phase cannot start until its predecessor's exit criteria are met. No "parallel the start of Phase 4 to save time" — that's how codebases rot.
> **Task IDs**: every task has a stable ID (e.g. `P1.3.2`) so PRs and commits can reference them.

---

## Dependency graph

```
Phase 0 (1w) ── Phase 1 (3w) ─┬── Phase 2 (2w) ──┬── Phase 3 (3w) ──── Phase 4a (4w)
                              │                  │                    Phase 4b (4w)
                              │                  │                    Phase 4c (4w)
                              └──────────────────┘                    Phase 4d (2w) ──
                                                                                     │
                                                                                     ▼
                                                                     Phase 5 (3w) ── Phase 6 (4w)
                                                                     
                                                                     Phase 6 can run parallel with
                                                                     Phase 4-5 for non-engineering
                                                                     items (legal, policy).
```

Phases 4a–4d can run in parallel if multiple devs. Solo: sequential.

---

## Phase 0 — Alignment & Infrastructure Setup (1 week)

**Goal**: have every tool, vendor, and policy in place so Phase 1 code has nothing to wait on.

**Tasks**:
- `P0.1` PO walkthrough of `Spec_Amendments.md`. Sign-off documented.
- `P0.2` Provision Cloudflare R2 (EU region). Save credentials in Railway env.
- `P0.3` Provision Resend account. Verify DKIM/SPF on sending domain.
- `P0.4` Provision Sentry project (Next.js). Save DSN.
- `P0.5` Provision Axiom (or BetterStack) log dataset.
- `P0.6` Provision Upstash Redis (for rate limiting + caching).
- `P0.7` Set up staging environment on Railway (separate from preview + prod). Separate DB.
- `P0.8` GitHub Actions CI template: lint + typecheck + test + e2e on PR. Prod deploy gated behind `environment: production` approval.
- `P0.9` Draft internal coding standards doc (becomes `Contribution_Standards.md`).
- `P0.10` Set up feature-flag env vars in all environments (NEXT_PUBLIC_FLAG_*).

**Exit criteria**:
- All SaaS accounts provisioned, credentials stored in Railway.
- Staging env deployable.
- CI pipeline runs on PR (empty test suite OK).
- Amendments signed off by PO.

---

## Phase 1 — Foundation (3 weeks)

**Goal**: build every cross-cutting primitive once, so Phase 2+ can move at speed.

### P1.1 — Observability wiring (2 days)
- `P1.1.1` Install Sentry SDK (`@sentry/nextjs`). Configure for browser + server + edge. Scoped to prod + staging only.
- `P1.1.2` Install Pino. Create `lib/logger.ts`. Structured logging; dev uses `pino-pretty`.
- `P1.1.3` Wire Sentry to Pino: errors logged via Pino auto-send to Sentry.
- `P1.1.4` Add `instrumentation.ts` for Next.js App Router.
- `P1.1.5` Smoke-test: thrown error in prod-mode shows up in Sentry; info log shows up in Axiom.

### P1.2 — Test harness (3 days)
- `P1.2.1` Install Vitest + `@vitejs/plugin-react`. `vitest.config.ts` with jsdom + setup file.
- `P1.2.2` Install Playwright. `playwright.config.ts` with chromium + firefox + webkit; CI uses chromium only.
- `P1.2.3` Create `tests/factories/` with `userFactory`, `companyFactory`, `membershipFactory`, `wasteFlowFactory`, `fuelEntryFactory`, `electricityEntryFactory`, `siteFactory`.
- `P1.2.4` Create test DB setup helper: spawn per-test Prisma client pointing at `DATABASE_URL_TEST`, wrap each test in transaction+rollback where possible.
- `P1.2.5` Write sample tests for existing `lib/carbon.ts` calculations (locked-in baseline; pass before refactoring).
- `P1.2.6` Add `pnpm test`, `pnpm test:watch`, `pnpm test:e2e`, `pnpm test:coverage` scripts.
- `P1.2.7` Wire to CI.

### P1.3 — Schema foundation migration (2 days)
- `P1.3.1` Write migration: add `deletedAt`, `recordStatus` (enum `DRAFT | ACTIVE | ARCHIVED`), `title`, `reportingYear`, `reportingMonth` to `FuelEntry` and `ElectricityEntry`.
- `P1.3.2` Add `createdById` + `updatedById` to `FuelEntry`, `ElectricityEntry`, `Site`, `Invitation`. Make nullable on first migration; backfill in step P1.3.6.
- `P1.3.3` Add `updatedById` to `WasteFlow` (already has `createdById`).
- `P1.3.4` Create `ActivityLog` table + `ActivityType` enum per ADR-005.
- `P1.3.5` Add `FactorRevision` table for ADR-008 (factor versioning).
- `P1.3.6` Backfill migration: set `createdById` on existing records to the Company owner's userId (inferred from Membership OWNER role). Document data loss risks.
- `P1.3.7` Apply to dev, staging, **not prod yet** — prod migration gated behind sign-off checkpoint.

### P1.4 — Permission + audit primitives (3 days)
- `P1.4.1` Create `lib/auth/require-role.ts` with `requireRole(ctx, minRole)` helper. Roles ordered: VIEWER < COLLABORATOR < ADMIN < OWNER.
- `P1.4.2` Map internal `MembershipRole` (OWNER/ADMIN/MEMBER/VIEWER) → surface label mapping util.
- `P1.4.3` Rename `MembershipRole.MEMBER` → `MembershipRole.COLLABORATOR` (breaking change; do in a single migration + update all call sites).
- `P1.4.4` Create `lib/activity/log-activity.ts` with signature: `logActivity(ctx, { type, module, recordId, description, metadata }) → Promise<void>`. Writes in a Prisma transaction alongside the business write where possible.
- `P1.4.5` Add `ActivityLogEntry` view helper (for UI): shape data for display with user name + relative time.
- `P1.4.6` Update every existing server action: add `requireRole()` + `logActivity()` calls. This instruments ~20 actions. Unit test coverage enforced.

### P1.5 — Storage service (2 days)
- `P1.5.1` Install `@aws-sdk/client-s3` (works with R2 via endpoint override).
- `P1.5.2` Create `lib/storage/r2-client.ts` with `uploadFile`, `getDownloadUrl` (signed URL, 15min TTL), `deleteFile`.
- `P1.5.3` Tenant isolation: all keys prefixed `companies/{companyId}/...`. Enforced in service, not policy.
- `P1.5.4` File validation helper: MIME whitelist, size cap (50MB default, configurable per module).
- `P1.5.5` Virus-scan hook (interface only; real scanning deferred — see `ClamAV` integration option in Phase 6).
- `P1.5.6` Unit tests for each storage operation (mock S3 client).

### P1.6 — Email service (1 day)
- `P1.6.1` Install `resend` + `@react-email/components`.
- `P1.6.2` Create `lib/email/client.ts` singleton.
- `P1.6.3` Create first template: `emails/invitation.tsx` — send invitation with URL, company name, role, inviter name.
- `P1.6.4` Update `inviteTeammate` action to email the invitee (replacing current "manually share URL" flow).
- `P1.6.5` Add password reset template + flow (missing from current app).
- `P1.6.6` Configure React Email dev server.

### P1.7 — Schema + Zod centralisation (2 days)
- `P1.7.1` Create `lib/schemas/` directory structure per entity.
- `P1.7.2` Extract existing inline Zod schemas (in actions.ts files) to shared files. Actions import from `lib/schemas/`.
- `P1.7.3` Derive TypeScript types via `z.infer` where possible; remove redundant types.
- `P1.7.4` Add client-side react-hook-form + zodResolver integration pattern. Example on login form.

### P1.8 — Reusable resource patterns (3 days)
- `P1.8.1` Create `<ResourceListPage>` generic component: pagination, filters bar, search, column config, export buttons, empty state, loading state.
- `P1.8.2` Create `<ResourceDetailPage>` generic: field groups, linked documents slot, activity history slot, related tasks slot, audit footer.
- `P1.8.3` Create `<ResourceEditForm>` generic: field groups, validation, submit handling, dirty-check navigation guard.
- `P1.8.4` Create `<ActivityHistoryList>` component — reads ActivityLog entries for a given (module, recordId).
- `P1.8.5` Create `<DocumentAttachments>` component — reads DocumentLinks for a given (module, recordId), supports upload and delete inline.
- `P1.8.6` Migrate Waste Flows list to use `<ResourceListPage>` as reference implementation.
- `P1.8.7` Document patterns in `Contribution_Standards.md`.

### P1.9 — Export utilities (2 days)
- `P1.9.1` Create `lib/export/csv.ts` — `exportToCsv(rows, columns, filename)`.
- `P1.9.2` Create `lib/export/xlsx.ts` — `exportToXlsx(rows, sheets, filename)` using `exceljs`.
- `P1.9.3` Create `lib/export/pdf.ts` — uses `@react-pdf/renderer` with branded header (logo, company name, reporting period, page numbers).
- `P1.9.4` `<ExportMenu>` component for list pages (three buttons: CSV / Excel / PDF).
- `P1.9.5` Unit test each export (happy path + empty data + special characters).

### P1.10 — Feature flags (0.5 days)
- `P1.10.1` Create `lib/flags.ts` per ADR-010.
- `P1.10.2` Define flags for upcoming phases: scope3, productionIntensity, analysis, documentation, regulations, teamOverview, tasks, aiAssistant.
- `P1.10.3` Route guards use flags to return 404 when disabled.

### P1.11 — i18n scaffold (1 day)
- `P1.11.1` Install `next-intl`.
- `P1.11.2` Create `messages/en.json` — seed with all existing hardcoded strings.
- `P1.11.3` Wrap app in `NextIntlClientProvider`.
- `P1.11.4` Replace hardcoded strings in top 10 components (rest iteratively).
- `P1.11.5` Add eslint rule `no-hardcoded-strings` (via `eslint-plugin-i18n-json` or custom).

### P1.12 — Rate limiting (1 day)
- `P1.12.1` Install `@upstash/ratelimit` + `@upstash/redis`.
- `P1.12.2` Create `lib/rate-limit.ts` with named limiters: `auth`, `mutation`, `upload`.
- `P1.12.3` Wire `auth` limiter to login + signup + password reset endpoints.
- `P1.12.4` Wire `mutation` limiter to a subset of mutating actions (high-impact ones).
- `P1.12.5` Return 429 with `Retry-After` header on limit exceeded.

**Phase 1 exit criteria**:
- All foundation primitives shipped and used by at least one existing action.
- Test suite passing on CI (≥ 70% coverage on `lib/`).
- Every existing server action instrumented with `requireRole` + `logActivity`.
- Prod migration ran (after sign-off) with zero user-visible impact.
- Email invitations actually email.

---

## Phase 2 — Documentation Module (2 weeks)

**Goal**: full file management, because it blocks everything else.

### P2.1 — Schema (0.5 days)
- `P2.1.1` `Document` entity migration per ADR-006.
- `P2.1.2` `DocumentLink` join table migration.
- `P2.1.3` `DocumentType` enum with all spec §15.6 values.

### P2.2 — Upload flow (2 days)
- `P2.2.1` `uploadDocument` server action: multipart handling via Next.js 15 server actions, MIME validation, size validation, tenant-prefixed R2 upload, create Document + optional DocumentLink record.
- `P2.2.2` `<FileUpload>` component with drag-drop + progress bar.
- `P2.2.3` Error handling: size exceeded, MIME rejected, network failure, partial upload.

### P2.3 — Download flow (1 day)
- `P2.3.1` `getDocumentDownloadUrl` server action: permission check (tenant + role), fetch signed R2 URL, log activity.
- `P2.3.2` `<DocumentDownloadButton>` component.

### P2.4 — Preview (2 days)
- `P2.4.1` Install `@react-pdf/renderer` viewer component (or use native iframe for PDFs).
- `P2.4.2` PDF preview using iframe with signed URL.
- `P2.4.3` Image preview (PNG/JPG/JPEG) inline.
- `P2.4.4` Office formats (xlsx/docx): download-only with file-type icon.
- `P2.4.5` `<DocumentPreview>` component dispatching on mime type.

### P2.5 — List, filter, search (2 days)
- `P2.5.1` `/documentation` route using `<ResourceListPage>`.
- `P2.5.2` Filters: doc type, linked module, upload date, plant, uploader, tags, file type (per spec §15.8).
- `P2.5.3` Search: title, description, tags (Postgres full-text).
- `P2.5.4` List columns per spec §15.9.

### P2.6 — Detail view (1 day)
- `P2.6.1` `/documentation/[id]` route using `<ResourceDetailPage>`.
- `P2.6.2` Side-panel preview + metadata + linked records + activity history.
- `P2.6.3` Actions: download, edit metadata, delete, link to record.

### P2.7 — Edit + delete metadata (1 day)
- `P2.7.1` `updateDocument` server action for metadata (tags, description, type, plant, department). File itself is immutable once uploaded.
- `P2.7.2` `deleteDocument` with cascade to DocumentLink entries.

### P2.8 — Integrate with existing modules (2 days)
- `P2.8.1` Add `<DocumentAttachments>` to WasteFlow detail page.
- `P2.8.2` Add to FuelEntry detail page (creates detail page first if missing).
- `P2.8.3` Add to ElectricityEntry detail page.
- `P2.8.4` Add to Site detail page.
- `P2.8.5` "Upload from record" flow auto-creates DocumentLink.

### P2.9 — Versioning stub (0.5 days)
- `P2.9.1` `version` field on Document (nullable; no replacement flow yet). Spec §15.14 says "simple" for MVP.

**Phase 2 exit criteria**:
- Customer can upload a PDF to a waste flow, see it on the waste-flow detail page AND in the central Documentation module.
- Activity log records the upload.
- PDF/image preview works; download works for all types.
- Tenant isolation proven via test: user from Company A cannot see/download Company B's documents.

---

## Phase 3 — Fix the Existing (3 weeks)

**Goal**: bring Waste Flows, Scope 1, Scope 2 to spec-compliant state.

### P3.1 — Navigation + routing cleanup (2 days)
- `P3.1.1` Rename `/reporting` → `/analysis` (stub page until Phase 4b).
- `P3.1.2` Rename `/documents` → `/documentation`.
- `P3.1.3` Delete `/valorization` route entirely.
- `P3.1.4` Update `nav-main.tsx` to new labels + order per spec §6.2.
- `P3.1.5` Add placeholder pages for `/regulations`, `/team-overview` (stubs behind feature flags).
- `P3.1.6` Header user/account menu in addition to sidebar footer.
- `P3.1.7` Notifications area in header (empty for now; wires up in Phase 4c).

### P3.2 — Waste Flows completion (3 days)
- `P3.2.1` Add `updateWasteFlow` server action + `/waste-flows/[id]/edit` page.
- `P3.2.2` Add `archiveWasteFlow` action (sets status=ARCHIVED) distinct from delete.
- `P3.2.3` Add frequency + treatment-type filters per spec §8.8.
- `P3.2.4` Direct LoW code filter.
- `P3.2.5` Integrate `<DocumentAttachments>`, `<ActivityHistoryList>`.
- `P3.2.6` Tests.

### P3.3 — Scope 1 refactor (4 days)
- `P3.3.1` Rename `FuelEntry` → `Scope1Entry` (migration).
- `P3.3.2` Add fields: `title` (required), `emissionSourceType` (enum: STATIONARY_COMBUSTION, MOBILE_COMBUSTION, COMPANY_VEHICLES, BOILERS, GENERATORS, PROCESS_EMISSIONS, FUGITIVE_EMISSIONS), `sourceReference`, `factorSnapshot` (JSON: value, unit, source, region, year, version, type).
- `P3.3.3` Add detail page `/carbon-footprint/scope-1/[id]`.
- `P3.3.4` Add edit page + action.
- `P3.3.5` Form: emission factor metadata visible (not hidden). Show "DEFRA 2024, kgCO₂e/L = 2.688, GLOBAL" inline.
- `P3.3.6` Filters: month range, year, source type, factor source, record status.
- `P3.3.7` List columns: status, factor source, last updated.
- `P3.3.8` Tests (especially calculation regression tests).

### P3.4 — Scope 2 refactor (4 days)
- `P3.4.1` Rename `ElectricityEntry` → `Scope2Entry` (migration).
- `P3.4.2` Add fields: `title`, `energyType` (enum: ELECTRICITY, STEAM, HEAT, COOLING), `unit` (now configurable), `locationBasedKgCo2e`, `marketBasedKgCo2e`, `supplierFactorSource`, `factorSnapshotLocation`, `factorSnapshotMarket`.
- `P3.4.3` Recalculate both values in `computeScope2Emission`. Default market = location when no supplier factor.
- `P3.4.4` Form: "override market factor" expander with supplier name + factor value + doc upload.
- `P3.4.5` Detail page, edit page, filters, list columns per spec §11.
- `P3.4.6` Migration: backfill existing records (set location = market = current kgCo2e).
- `P3.4.7` Tests (dual calc + boundary cases).

### P3.5 — Sites completion (1 day)
- `P3.5.1` `/settings/sites/[id]` detail page.
- `P3.5.2` `<DocumentAttachments>` integration.
- `P3.5.3` Activity history.

### P3.6 — Dashboard rebalance (2 days)
- `P3.6.1` Remove "complex" charts per spec §7.11 compromise: keep 2 headline charts, move "deep" charts to Analysis.
- `P3.6.2` Add Scope 1 + Scope 2 emission KPI cards.
- `P3.6.3` Add "Latest Team Actions" section (reads ActivityLog).
- `P3.6.4` Add "Open Tasks" placeholder (empty until Phase 4c).
- `P3.6.5` Data completeness widget (missing docs, incomplete emissions, flows missing classification).
- `P3.6.6` Period filter, plant filter.
- `P3.6.7` Empty-state CTAs.

**Phase 3 exit criteria**:
- Existing modules are spec-compliant per amendments.
- Every existing entity has Create, Read (list + detail), Update, Delete/Archive, Export.
- Every record has audit trail, documents, activity history.
- Dashboard accurately reflects amended spec.

---

## Phase 4 — Net-New Modules (8 weeks total, parallelisable)

### Phase 4a — Scope 3 (4 weeks)

- `P4a.1` Design polymorphic schema: `Scope3Entry` with shared core fields + `categoryData Json`.
- `P4a.2` `Scope3Category` enum with 7 values per spec §12.3.
- `P4a.3` Zod schema per category (strict type-safety on `categoryData`).
- `P4a.4` Seed emission factors for each category (DEFRA, EPA WARM, IEA).
- `P4a.5` Dynamic form: select category → renders category-specific fields.
- `P4a.6` Calculation service per category (activity-based + spend-based methods).
- `P4a.7` List page, detail page, edit page.
- `P4a.8` Filters + columns per spec §12.10–§12.12.
- `P4a.9` Cross-reference with WasteFlow for "Waste Generated in Operations" category (auto-populate from existing waste flows).
- `P4a.10` Unit tests for every category's calculation.
- `P4a.11` E2E test: create entry in each of 7 categories.

### Phase 4b — Analysis Module (3 weeks)

- `P4b.1` Page structure: filter bar + graph area + data table + export.
- `P4b.2` Widget system: users select which charts to display (persisted per user).
- `P4b.3` Carbon chart widgets per spec §14.8 (10 widgets).
- `P4b.4` Waste chart widgets per spec §14.9 (7 widgets).
- `P4b.5` Data quality widgets per spec §14.10.
- `P4b.6` Filters: date range, month/quarter/year, plant, emissions scope, S3 category, waste category, waste flow, energy type, fuel type, user.
- `P4b.7` Year-over-year comparison toggle (per Spec Amendment A7).
- `P4b.8` Export: CSV + Excel + PDF (via Phase 1 utilities).
- `P4b.9` Performance: queries optimised, aggregation cached per-company-per-period.

### Phase 4c — Team Overview + Tasks (3 weeks)

- `P4c.1` Task entity + enums (priority, status).
- `P4c.2` `/team-overview` top-level route (migrate from `/settings/team`).
- `P4c.3` User fields: department (optional), userStatus (derived: ACTIVE/INVITED/INACTIVE/SUSPENDED).
- `P4c.4` Last Active tracking (update on page load server-side, throttled).
- `P4c.5` Team list page with filters + search.
- `P4c.6` User detail page with profile + recent actions + assigned tasks + completed tasks + activity.
- `P4c.7` Task CRUD (Admin create/edit; Collaborator update own; Viewer read-only).
- `P4c.8` Task assignment with email notification.
- `P4c.9` Task overview page (my tasks, team tasks, by status).
- `P4c.10` Task linkage slot on every module's detail page.
- `P4c.11` Overdue detection (cron or lazy-check on read).
- `P4c.12` Dashboard Tasks widget (no longer placeholder).
- `P4c.13` Notifications area in header shows unread task events.

### Phase 4d — Production Intensity (1 week)

Per Spec Amendment A2, this is a derived view not a CRUD module.
- `P4d.1` `ProductionVolume` entity: companyId, period (year + month), plant, product, volume, unit, notes, audit fields.
- `P4d.2` `/carbon-footprint/production-intensity` page with:
  - Production volume CRUD (simple form to enter volume per period × plant × product).
  - Live computed PEF per period + scope inclusion (S1, S1+2, S1+2+3).
  - Scope inclusion toggle.
  - Output unit mapping (ton → kgCO₂e/ton, piece → kgCO₂e/unit).
  - Trend chart.
  - Export.
- `P4d.3` Dashboard PEF KPI card pulling from this.

**Phase 4 exit criteria**:
- All MVP modules functional per amended spec.
- Every new module uses Phase 1 primitives (no shortcuts).
- E2E test covers create-in-each-module + dashboard reflects new data.
- Accessibility audit passes for each new page.

---

## Phase 5 — Intelligence & Automation (3 weeks)

### P5.1 — Regulations module (1 week)
- `P5.1.1` Regulation entity + enums per spec §16.6, §16.7, §16.8.
- `P5.1.2` Admin CRUD (curated only per Amendment A5).
- `P5.1.3` List + filter + detail + document linkage.

### P5.2 — CSV/Excel imports (1 week)
- `P5.2.1` Generic import service: upload → parse → column map UI → validate → preview → commit.
- `P5.2.2` Import for Waste Flows.
- `P5.2.3` Import for Scope 1.
- `P5.2.4` Import for Scope 2.
- `P5.2.5` Import for Scope 3.

### P5.3 — Rules-based insights on Dashboard (3 days)
- `P5.3.1` `lib/insights/` service with rule-based generators:
  - "3 waste flows over 1t/month missing treatment code"
  - "Scope 1 entries for 2 sites in Jan but none in Feb"
  - "Supplier X accounts for 45% of Scope 3 PG&S — consider engagement"
- `P5.3.2` Dashboard insights panel (enhanced).

### P5.4 — AI assistant (4 days) (feature-flagged)
- `P5.4.1` `/api/ai/chat` route using Anthropic SDK.
- `P5.4.2` System prompt with current context: company, role, recent actions.
- `P5.4.3` Prompt caching enabled.
- `P5.4.4` Tools: "findRecord", "explainField", "summariseMonth".
- `P5.4.5` Floating chat widget (opt-in).
- `P5.4.6` All conversations logged in ActivityLog with prompt hash.

**Phase 5 exit criteria**:
- Customers can self-serve for curated regulations + bulk data import.
- Dashboard shows actionable insights.
- AI assistant reachable from any page (flagged off until QA done).

---

## Phase 6 — Commercial Readiness (4 weeks, partially parallel)

Runs partly parallel to Phase 5 — legal/policy work doesn't block engineering.

### P6.1 — Legal docs (2 weeks parallel)
- `P6.1.1` Privacy Policy drafted with counsel.
- `P6.1.2` Terms of Service drafted.
- `P6.1.3` Data Processing Agreement (Art. 28 GDPR).
- `P6.1.4` Subprocessor list (R2, Resend, Sentry, Anthropic, Upstash, Railway).
- `P6.1.5` Cookie policy + consent banner.
- `P6.1.6` Data retention + deletion policy.
- `P6.1.7` Accept-terms flow on signup.

### P6.2 — Security hardening (1 week)
- `P6.2.1` CSP header strict.
- `P6.2.2` Password policy enforcement (12+ chars, complexity).
- `P6.2.3` Session idle timeout (7 days).
- `P6.2.4` Failed-login lockout (5 attempts / 15 min).
- `P6.2.5` Audit log review UI for Owner (show full company activity log with filters).
- `P6.2.6` GDPR request handlers: data export, data deletion.
- `P6.2.7` External pen test (3rd party).

### P6.3 — Observability + runbooks (3 days)
- `P6.3.1` Monitoring dashboard (Grafana / Railway metrics).
- `P6.3.2` Alert rules: error rate, latency, uptime.
- `P6.3.3` Incident response runbook.
- `P6.3.4` Backup/restore runbook (Railway Postgres).
- `P6.3.5` On-call rotation if team > 1.

### P6.4 — Customer onboarding flow (3 days)
- `P6.4.1` Self-service company signup (not invite-only) — Owner role grants.
- `P6.4.2` Onboarding checklist: invite team, create first site, log first waste flow, log first Scope 1/2 entry, upload first document.
- `P6.4.3` Sample data opt-in (for demos; cleanable).
- `P6.4.4` Welcome email via Resend.
- `P6.4.5` Marketing site / landing page (separate from app).

### P6.5 — Performance + accessibility final audit (2 days)
- `P6.5.1` Lighthouse CI, target ≥ 90 on all audited pages.
- `P6.5.2` Manual keyboard-only walkthrough of all critical flows.
- `P6.5.3` Screen reader spot check.
- `P6.5.4` Performance: p95 latency targets met per Amendment B4.

**Phase 6 exit criteria**:
- Legally deployable for commercial use in EU.
- Security audit passed.
- Runbooks reviewed.
- Self-service signup works.
- Maxtil can invite themselves and use the product end-to-end without hand-holding.

---

## Risk register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| R2/Resend vendor outage | High | Low | Document failure modes; queue uploads; email via fallback pathway |
| Schema migration breaks prod | High | Low | Staging full dry-run; zero-downtime pattern (ADR-014); approval gate |
| Calculation bug changes reported emissions | High | Medium | ≥ 90% test coverage on `lib/calculations`; customer-visible changelog for factor updates |
| Scope 3 scope creep | Medium | High | Phase gate: must ship 7 mandatory categories, no 8th in MVP |
| PO changes priorities mid-phase | Medium | Medium | Phases are atomic — current phase finishes before re-prioritising |
| Single dev burnout | High | Medium | Realistic timeline; scope cuts acceptable over quality cuts |
| Maxtil delays feedback | Medium | Medium | Bi-weekly demo cadence enforced; no open-ended validation |
| GDPR non-compliance at launch | High | Low | Phase 6 legal track started early |
| Cost overrun on AI | Medium | Low | Prompt caching; Haiku for easy tasks; per-company spend caps |

---

## Budget envelope (rough)

| Line item | MVP monthly | At 10 customers |
|---|---|---|
| Railway (app + DB) | $25 | $100 |
| Cloudflare R2 | $0 (free tier) | $5 |
| Resend | $0 (free) | $20 |
| Sentry | $0 (free) | $26 |
| Axiom | $0 (free) | $25 |
| Upstash | $0 (free) | $10 |
| Anthropic Claude | $0 (not yet) | $50 |
| Domain + misc | $5 | $5 |
| **Total** | **~$30/mo** | **~$250/mo** |

---

## Go / no-go checkpoints

After each phase completes, a short written review:
1. Exit criteria met? (yes/no per bullet).
2. Was the phase on time? If not, why?
3. Any foundation gaps surfaced that need retrofit?
4. Any spec amendment newly required?
5. Risk register delta.

Only then does the next phase start.
