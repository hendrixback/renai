# RenAI — Architecture Decision Records

> **Format**: Michael Nygard ADRs. Each decision has Context, Decision, Consequences, and Alternatives.
> **Principle**: every non-trivial architectural choice gets an ADR. ADRs are never deleted — if a decision changes, we write a new ADR superseding the old one.

---

## ADR-001: Cloudflare R2 for file storage

**Status**: Accepted · 2026-04-23

**Context**: Documentation module (§15) requires multi-tenant file storage with preview, download, tenant-isolated access control, GDPR-compliant EU regions, and cost-effective egress. Files are typically 100KB–10MB PDFs/images/spreadsheets. No current file storage exists in the app.

**Decision**: Use Cloudflare R2 as the object store. Tenant isolation via prefixed keys (`companies/{companyId}/documents/{documentId}/{filename}`). Application-layer authorization on every download — no public URLs.

**Consequences**:
- **+** S3-compatible API (works with AWS SDK); easy exit path to S3 if needed.
- **+** Zero egress fees → cheap downloads for customers reviewing their own docs.
- **+** Free tier: 10GB storage, 1M Class A ops/month — enough for Maxtil + early customers.
- **+** EU jurisdiction available (GDPR).
- **−** Requires signed-URL generation for downloads (adds latency ~50ms).
- **−** No native image transforms (use `next/image` + R2 HTTP caching).

**Alternatives considered**:
- **AWS S3**: higher egress costs, otherwise equivalent. Chosen-against on price.
- **Supabase Storage**: tightly coupled to Supabase stack; we're on Railway+Prisma, not Supabase.
- **Railway Volumes**: not multi-region, not built for object storage, no CDN.
- **Vercel Blob**: locked to Vercel, and we're on Railway.

**Implementation notes**: `lib/storage/r2-client.ts` exposes `uploadFile`, `getDownloadUrl`, `deleteFile` — never accessed directly from React; all access through server actions that enforce tenant check.

---

## ADR-002: Resend for transactional email

**Status**: Accepted · 2026-04-23

**Context**: Spec implicitly requires email for: invitations (§5, §17), task notifications (§18.13), password resets (not in spec but a SaaS baseline). Current code generates invitation tokens but relies on Admin manually sharing URLs — unacceptable UX.

**Decision**: Use Resend for transactional email. React-Email components for templates. `lib/email/` service with typed send functions (`sendInvitationEmail`, `sendPasswordResetEmail`, etc.).

**Consequences**:
- **+** Best-in-class DX for Next.js; React-Email components live in the codebase with type safety.
- **+** 100 emails/day free → enough for dev; $20/mo for 50K emails (scales past Maxtil + 10 customers).
- **+** Webhook-based delivery tracking.
- **−** Vendor lock-in on React-Email (but templates are JSX, portable).

**Alternatives considered**:
- **Postmark**: mature, slightly pricier, no React-Email story.
- **SendGrid**: oversized, legacy DX.
- **AWS SES**: cheap but requires KYC + deliverability setup overhead.
- **Self-hosted SMTP**: absolutely not.

**Implementation notes**: DKIM/SPF setup required before prod. Dev mode uses Resend's sandbox (logs emails, doesn't send).

---

## ADR-003: Sentry + Pino for observability

**Status**: Accepted · 2026-04-23

**Context**: Spec §24.11 requires reliability, §22.5 requires audit logging, §19.6 mentions insight generation. Zero observability today means prod incidents go unnoticed until customers report them.

**Decision**:
- **Errors**: Sentry (Next.js SDK), browser + server + edge.
- **Structured logs**: Pino with `transport: pino-pretty` in dev, JSON in prod forwarded to Axiom.
- **Business events**: custom `logger.info({ event: 'emission.computed', ... })` for domain events.
- **Performance**: Sentry transactions; budget alerts on slow routes.

**Consequences**:
- **+** Unified error surface; deploy-tracking via Sentry releases.
- **+** Structured logs queryable in Axiom (free tier 0.5GB/day).
- **+** Activity Log entity (ADR-005) is the business-level audit layer; Pino is the technical layer. Both serve different purposes.
- **−** Two log stores — need to be clear which goes where (business = ActivityLog DB; technical = Pino/Axiom).

**Alternatives considered**:
- **Datadog**: expensive for MVP; overkill.
- **Logtail/BetterStack**: fine, chose Axiom for query UX.
- **Vercel Logs**: we're on Railway.
- **Self-hosted Grafana Loki**: ops overhead not justified.

**Implementation notes**: `lib/logger.ts` wraps Pino; always imported, never console.log. Sentry DSN in env, scoped to prod + staging only.

---

## ADR-004: Recharts stays for visualisation

**Status**: Accepted · 2026-04-23

**Context**: Dashboard already uses Recharts (confirmed in `src/components/dashboard/category-bar-chart.tsx`). Analysis module needs 10+ chart types (§14.7).

**Decision**: Keep Recharts. No new chart library.

**Consequences**:
- **+** Zero migration cost; existing charts work.
- **+** Covers all spec-required types (line, bar, stacked, area, pie, donut, scatter).
- **+** React-native API; SSR works via lazy imports.
- **−** Styling Recharts to match design system requires custom components (acceptable trade-off).
- **−** For advanced viz (heatmaps, geographic), we'd need Nivo or D3; defer until a real requirement surfaces.

**Alternatives considered**:
- **Nivo**: richer but heavier bundle; switch later if needed.
- **Tremor**: opinionated Tailwind-based charts; too constrained for Analysis's configurable widgets.
- **Apache ECharts**: very capable but imperative API; doesn't fit React patterns.
- **D3 raw**: too low-level for MVP.

---

## ADR-005: Activity Log as a first-class entity

**Status**: Accepted · 2026-04-23

**Context**: Spec §18.10–§18.11, §22.8, §23.12, §23.15 all require an audit trail of who did what when. Current code has nothing.

**Decision**: Dedicated `ActivityLog` Prisma entity (denormalised for fast reads). Written via a synchronous `logActivity(ctx, { type, module, recordId, description, metadata })` helper called from every server action. Never written async / fire-and-forget — audit trail must be committed in the same transaction as the business write.

**Schema sketch**:
```prisma
model ActivityLog {
  id            String   @id @default(cuid())
  companyId     String
  userId        String?          // nullable for system events
  activityType  ActivityType
  module        String           // "waste-flows", "scope-1", etc.
  recordId      String?          // nullable for non-record events (login)
  description   String
  metadata      Json?            // structured diff, old/new values
  createdAt     DateTime @default(now())
  ipAddress     String?
  userAgent     String?
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([companyId, createdAt])
  @@index([companyId, module, recordId])
  @@index([userId, createdAt])
}

enum ActivityType {
  RECORD_CREATED
  RECORD_UPDATED
  RECORD_DELETED
  RECORD_STATUS_CHANGED
  DOCUMENT_UPLOADED
  DOCUMENT_DOWNLOADED
  DOCUMENT_DELETED
  TASK_CREATED
  TASK_ASSIGNED
  TASK_STATUS_CHANGED
  USER_INVITED
  USER_ROLE_CHANGED
  USER_LOGIN
  USER_LOGOUT
  REGULATION_UPDATED
  EMISSION_FACTOR_IMPORTED
  IMPERSONATION_STARTED
  IMPERSONATION_ENDED
}
```

**Consequences**:
- **+** Queryable audit trail in the main DB (no cross-store join).
- **+** Powers Team Overview (§17.9), Latest Team Actions on Dashboard (§7.7), record detail activity history.
- **+** 7-year retention satisfies audit requirements.
- **−** Write volume: every mutation becomes 2 INSERTs. Acceptable at Maxtil scale (< 1000 mutations/day); revisit at 100x scale.
- **−** Indexes add disk but are essential for query patterns.

**Alternatives considered**:
- **Event sourcing**: overkill for MVP; would delay shipping 4+ weeks.
- **Write to Axiom only**: cross-store joins for "show me this record's activity" become painful.
- **Postgres LOGICAL replication → audit store**: complex infra for questionable benefit.

---

## ADR-006: Polymorphic document linking via DocumentLink join table

**Status**: Accepted · 2026-04-23

**Context**: Documentation module must link a single document to many records across different modules (§15.11). E.g. an "Electricity bill PDF" might be linked to Scope 2 entry AND Production Intensity record AND a Regulation entry (as evidence of compliance).

**Decision**: `Document` entity + `DocumentLink` join table with polymorphic FK pattern:
```prisma
model DocumentLink {
  id         String   @id @default(cuid())
  documentId String
  module     String   // "waste-flows" | "scope-1" | "scope-2" | "scope-3" | "production-intensity" | "regulation"
  recordId   String
  linkedBy   String?  // userId who attached it
  createdAt  DateTime @default(now())
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  @@unique([documentId, module, recordId])
  @@index([module, recordId])
}
```

**Consequences**:
- **+** Any module can attach documents without schema changes.
- **+** A single document can back multiple records (realistic: one invoice covers multiple line items).
- **+** Simple queries: "show all docs for this waste flow" = `WHERE module='waste-flows' AND recordId=?`.
- **−** No DB-level FK to the actual record → integrity enforced at app layer (orphaned links possible if source record is hard-deleted; mitigate via soft-delete everywhere).
- **−** Slightly clunky to query "all records linked from this document" — requires app-layer dispatch on module.

**Alternatives considered**:
- **Per-module FK on Document**: `wasteFlowId?`, `scope1Id?`, etc. Clean schema, but explodes to ~10 nullable FKs; every new module requires a migration.
- **Strict polymorphic (recordType + recordId) without join**: forces 1:1 document→record; doesn't match spec intent.
- **Separate join per module (WasteFlowDocument, Scope1Document, …)**: N join tables; ergonomics awful.

---

## ADR-007: Server actions + thin service layer

**Status**: Accepted · 2026-04-23

**Context**: Current code uses Next.js server actions directly (no service layer). Spec §25.9 calls for clear API/service boundaries. Future: public API, mobile app, CLI, ERP integrations.

**Decision**: Introduce `lib/services/` layer. Pattern:
- Server actions (`app/**/actions.ts`) are thin: validate input, check permissions, delegate to service, log activity, revalidate.
- Services (`lib/services/{domain}.ts`) contain business logic: database reads/writes, calculations, cross-entity coordination.
- Future `app/api/v1/*` route handlers call the same services.

Example:
```typescript
// app/(app)/waste-flows/actions.ts
"use server";
export async function createWasteFlow(data: CreateWasteFlowInput) {
  const ctx = await requireContext();
  requireRole(ctx, "COLLABORATOR");
  const parsed = createWasteFlowSchema.parse(data);
  const flow = await WasteFlowService.create(ctx, parsed);
  await logActivity(ctx, { type: "RECORD_CREATED", module: "waste-flows", recordId: flow.id, description: `Created waste flow "${flow.name}"` });
  revalidatePath("/waste-flows");
  return flow;
}
```

**Consequences**:
- **+** Single implementation per operation; server actions and future API handlers share it.
- **+** Unit testable — services don't depend on Next.js context.
- **+** Clear boundaries help onboarding new devs.
- **−** Slight boilerplate overhead vs. inline logic in actions.
- **−** Tempting to bloat services; enforce "one service per domain, no God objects" in code review.

**Alternatives considered**:
- **Inline in actions (status quo)**: fast to write, painful to reuse / test.
- **tRPC**: overkill for an app that's mostly SSR server actions; adds a layer.
- **NestJS-style controllers**: overkill for Next.js App Router.

---

## ADR-008: Zod schemas in `lib/schemas/`, shared client+server

**Status**: Accepted · 2026-04-23

**Context**: Current schemas are defined inline in action files. Client components can't reuse them for client-side validation. No single source of truth for record shapes.

**Decision**: One Zod schema per entity in `lib/schemas/{entity}.schema.ts`. Client components import for form validation; server actions import for final enforcement. Types derived from schemas (`z.infer`), not maintained separately.

**Consequences**:
- **+** Single source of truth.
- **+** Better UX: client-side validation catches errors before network round-trip.
- **+** Type-safe forms when combined with `react-hook-form + @hookform/resolvers/zod`.
- **−** Schema changes must consider both client and server callers.

**Alternatives considered**:
- **Valibot**: smaller bundle; ecosystem thinner than Zod; chose Zod for maturity.
- **Yup**: older, no TypeScript-first; reject.

---

## ADR-009: next-intl for i18n, scaffolded even for English-only MVP

**Status**: Accepted · 2026-04-23

**Context**: Maxtil is Portuguese. Spec §3.5 says "expand to Europe". Post-MVP localisation is inevitable. Retrofitting i18n is a nightmare.

**Decision**: Use `next-intl`. MVP ships with `en` only. All user-facing strings wrapped in `t()`. Translation files at `messages/{locale}.json`. Route pattern stays single-locale for MVP; become locale-prefixed when second locale ships.

**Consequences**:
- **+** Zero-cost future localisation.
- **+** eslint rule enforces no hardcoded strings.
- **−** Minor verbosity overhead in components.
- **−** Small learning curve for devs.

**Alternatives considered**:
- **Paraglide**: newer, great DX, smaller ecosystem; revisit if we outgrow next-intl.
- **react-i18next**: heavy, legacy patterns.
- **Hardcoded English, retrofit later**: guaranteed weeks of rework when we actually need it.

---

## ADR-010: Env-based feature flags (no external service)

**Status**: Accepted · 2026-04-23

**Context**: We want to merge incomplete Scope 3 or Analysis work to main without exposing to users. Real feature-flag services (LaunchDarkly, Flagsmith) cost money and add infra complexity.

**Decision**: Simple env-based flags in `lib/flags.ts`. Pattern:
```typescript
export const flags = {
  scope3Enabled: process.env.NEXT_PUBLIC_FLAG_SCOPE3 === "true",
  regulationsEnabled: process.env.NEXT_PUBLIC_FLAG_REGULATIONS === "true",
  aiAssistantEnabled: process.env.NEXT_PUBLIC_FLAG_AI_ASSISTANT === "true",
} as const;
```

Used in layouts and route-level guards. Server-side flags (non-NEXT_PUBLIC_) for backend-only kill switches.

**Consequences**:
- **+** Zero cost, zero dependency.
- **+** Per-environment control (dev/staging/prod).
- **−** No per-user / per-company rollout (ship to all or none).
- **−** Redeploy required to toggle; acceptable for MVP.

**Alternatives considered**:
- **Vercel Edge Config / PostHog flags**: wait until we need per-user rollout.
- **LaunchDarkly**: $$$.

**Upgrade path**: when we need per-tenant rollout, add a `FeatureOverride` table (companyId + flag + enabled) checked alongside env.

---

## ADR-011: Anthropic Claude for AI features (when introduced)

**Status**: Accepted · 2026-04-23

**Context**: Post-MVP spec items §19 require an in-app assistant, regulation summarisation, and insight generation.

**Decision**: Anthropic Claude API. Claude 4.x (Sonnet or Haiku depending on task). Prompt caching enabled for system prompt + tool definitions. All AI calls go through `lib/ai/` service; never direct from client. Every AI response is stored in ActivityLog with the prompt hash for reproducibility.

**Consequences**:
- **+** Best-in-class reasoning for structured data tasks (carbon calc explanations, data-quality insights).
- **+** Product name alignment (RenAI — Anthropic as primary AI vendor is on-brand).
- **+** Anthropic has EU data-processing terms for GDPR.
- **−** Single-vendor risk — mitigate via an abstraction that could swap to OpenAI if needed.
- **−** Token cost at scale; prompt caching essential.

**Alternatives considered**:
- **OpenAI GPT-4**: comparable quality, less strong on structured reasoning.
- **Self-hosted (Llama / Mistral)**: infra overhead not justified at MVP; quality gap on reasoning.
- **Azure OpenAI**: same model as OpenAI, enterprise contract; overkill for MVP.

---

## ADR-012: Testing stack (Vitest + Playwright + Factory functions)

**Status**: Accepted · 2026-04-23

**Context**: Zero test coverage today. Senior-level expectations demand comprehensive testing, especially for emission calculations (audit-critical).

**Decision**:
- **Vitest** for unit + integration tests.
- **Playwright** for E2E.
- **Factory functions** in `tests/factories/` for domain objects (no Faker for emissions data — use realistic seeded values).
- **Test database**: separate Postgres schema, reset per test via `BEGIN; ... ROLLBACK` transactions where possible, else `prisma migrate reset` on CI.
- **CI gate**: `pnpm test && pnpm test:e2e && pnpm typecheck && pnpm lint` — all green or no merge.

**Consequences**:
- **+** Catch calc regressions before prod.
- **+** Confidence during refactors.
- **−** Upfront investment (~1 week to scaffold).
- **−** Test runtime overhead (mitigate with sharding in CI).

**Coverage targets**:
- `lib/calculations/*`: ≥ 90% (audit-critical).
- `lib/services/*`: ≥ 80%.
- `app/**/actions.ts`: ≥ 70% (smoke + permission checks + happy path).
- Overall: ≥ 70%.

---

## ADR-013: React Email for email templates

**Status**: Accepted · 2026-04-23

**Context**: ADR-002 chose Resend. Email templates need to be maintainable, version-controlled, testable.

**Decision**: `@react-email/components`. Templates live in `emails/` at repo root. Compiled via `react-email/render` to HTML at send time. Dev server (`pnpm email:dev`) previews templates at localhost.

**Consequences**:
- **+** Templates are typed JSX; refactor-safe.
- **+** Reusable header/footer components.
- **+** Dev preview workflow.
- **−** Locked to Resend ecosystem preferences; templates are portable HTML though.

---

## ADR-014: Prisma migrations + zero-downtime deploy pattern

**Status**: Accepted · 2026-04-23

**Context**: Every schema change must not break running prod. Memory note: "Prod DB writes require approval".

**Decision**:
- Every migration reviewed as SQL before applying to prod.
- Breaking changes split into 3 deploys: (1) add new column/index, (2) backfill data + dual-write, (3) remove old column. Never rename in one step.
- Migrations gated behind manual approval in CI (GitHub Actions `environment: production` protection).
- Rollback path documented per migration in a comment.

**Consequences**:
- **+** Zero-downtime deploys.
- **+** Rollback is always possible.
- **−** Triple-deploy for breaking changes is slower than one-shot; worth it for uptime.
- **−** Discipline required in code review.

---

## ADR-015: UI component library (shadcn/ui + Radix) stays

**Status**: Accepted · 2026-04-23

**Context**: Current stack uses shadcn/ui on top of Radix primitives. Spec §24.5 requires "modern, premium, minimalist SaaS experience".

**Decision**: Keep shadcn/ui. Add Radix primitives as needed. Component library extensions live in `src/components/ui/`. Custom domain components in `src/components/{domain}/`.

**Consequences**:
- **+** Accessibility baked in via Radix.
- **+** Full source ownership (shadcn is copy-paste not dependency).
- **+** Tailwind theming integrates with design tokens.
- **−** No upgrade path when shadcn improves; we're on our own copy.

**Alternatives considered**:
- **MUI / Mantine**: heavyweight, opinionated, harder to theme.
- **Headless UI**: smaller surface; would need more custom work.

---

## ADR-016: Rate limiting via Upstash Ratelimit

**Status**: Accepted · 2026-04-23

**Context**: Spec §22.5 says "protection against common misuse". No rate limiting today.

**Decision**: Upstash Ratelimit (Redis-backed, serverless). Applied to: auth endpoints (5/min/IP), mutating server actions (10/sec/session), file uploads (5/min/session).

**Consequences**:
- **+** Prevents bruteforce, spam, abuse.
- **+** Redis free tier covers MVP traffic.
- **−** Redis dependency; acceptable.

---

## Decision log summary

| # | Decision | Status | Date |
|---|---|---|---|
| ADR-001 | R2 for file storage | Accepted | 2026-04-23 |
| ADR-002 | Resend for email | Accepted | 2026-04-23 |
| ADR-003 | Sentry + Pino for observability | Accepted | 2026-04-23 |
| ADR-004 | Recharts stays | Accepted | 2026-04-23 |
| ADR-005 | ActivityLog entity | Accepted | 2026-04-23 |
| ADR-006 | Polymorphic DocumentLink | Accepted | 2026-04-23 |
| ADR-007 | Server actions + service layer | Accepted | 2026-04-23 |
| ADR-008 | Zod schemas shared | Accepted | 2026-04-23 |
| ADR-009 | next-intl scaffolded | Accepted | 2026-04-23 |
| ADR-010 | Env-based feature flags | Accepted | 2026-04-23 |
| ADR-011 | Anthropic Claude for AI | Accepted | 2026-04-23 |
| ADR-012 | Vitest + Playwright | Accepted | 2026-04-23 |
| ADR-013 | React Email templates | Accepted | 2026-04-23 |
| ADR-014 | Prisma zero-downtime migrations | Accepted | 2026-04-23 |
| ADR-015 | shadcn/ui + Radix stays | Accepted | 2026-04-23 |
| ADR-016 | Upstash Ratelimit | Accepted | 2026-04-23 |
