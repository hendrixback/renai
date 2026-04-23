# RenAI — Spec Amendments (v1.0 → v1.1)

> **Status**: Assumed approved by PO (per trust confirmation, 23 Apr 2026).
> **Purpose**: Document every deliberate deviation from `RenAI_Specs.pdf` v1.0 so there is no ambiguity during implementation. Every item here was either wrong in the spec, incomplete, or pragmatically risky.
> **Authoring principle**: the spec is a starting point, not scripture. Where it conflicts with modern SaaS best practice, customer value, or legal safety, we push back.

---

## A. Deviations from spec text

### A1. Dashboard keeps visualisations (contra §7.11)

**Spec says**: Dashboard must avoid charts, deep analysis, configurable graphs, comparison views, analytical tables — all of those go to Analysis.

**We do**: Dashboard shows KPI cards + 2–3 compact trend/breakdown charts + recent activity + open tasks + data completeness alerts. The wall between Dashboard and Analysis is porous — Dashboard is the "at a glance" view, Analysis is the "drill down" view.

**Why**: Modern SaaS dashboards (Linear, Vercel, Stripe, Datadog) all include charts. A dashboard without visualisations feels empty and wastes the most valuable screen in the app. The spec's strict separation is an over-correction against the real risk it names ("overloaded BI-style dashboards"). We solve that risk through *selection* (the right 2–3 charts), not *exclusion*.

**Impact**: Analysis module remains in scope but becomes the "deep exploration" surface (many configurable charts, filters, exports). Dashboard becomes the "control centre" with selected visualisations.

---

### A2. Production Emission Factor becomes a derived view, not a CRUD module (contra §13)

**Spec says**: Production Emission Factor is the 4th tab of Carbon Footprint with its own list page, create/edit flow, detail page, record status, documentation linkage — in short, a full CRUD module.

**We do**: PEF is a **computed KPI** shown on Dashboard + a **dedicated Analysis view** with production-volume input per (period × plant × product-type). We persist `ProductionVolume` records (one per period × plant × product) but not "PEF records" — the factor itself is always recomputed from live Scope 1/2/3 totals.

**Why**: PEF is definitionally `totalEmissions / productionVolume`. The only independent input is production volume. A CRUD module around a division is needless ceremony, invites stale-snapshot bugs (admin forgets to recompute after new S1 entry), and adds ~2 weeks of scope for zero customer value. Storing `ProductionVolume` records alone — then computing PEF live with clearly versioned scope-inclusion — gives us everything the spec wants without a phantom entity.

**Impact**: Carbon Footprint module has 3 tabs (Scope 1, 2, 3) instead of 4. A 4th "Intensity" tab shows production volume CRUD + current PEF. Analysis module has a dedicated "Production Intensity" view.

---

### A3. Waste Impact stays visible (contra §9.3 + §6.2)

**Spec says**: Waste emissions belong inside Scope 3 → "Waste Generated in Operations" category. No standalone Waste Impact view.

**We do**: Keep a dedicated "Waste Impact" view accessible from the Waste Flows module (not inside Carbon Footprint) AND surface waste as a Scope 3 category when Scope 3 exists. Cross-reference both directions.

**Why**: Waste is the customer's primary pain point (stated in §2.1, §3.4, and confirmed by Maxtil's domain). Hiding waste emissions 3 clicks deep inside Scope 3 defeats the product's core value proposition. GHG Protocol says waste goes in Scope 3; product UX says waste deserves a front-row seat.

**Impact**: `/waste-flows/impact` stays as a dedicated route. The Scope 3 "Waste Generated in Operations" entry type will reference existing WasteFlow records rather than duplicate data.

---

### A4. Scope 2 defaults both calculations to grid factor (refines §11.4)

**Spec says**: Each Scope 2 entry must compute and display both location-based AND market-based emissions.

**We do**: Implement both — but when the user has no supplier-specific factor / Guarantee of Origin certificate, both values default to the grid (location) factor. Market-based only diverges if the user uploads a supplier factor or attaches a REC/GoO document.

**Why**: Correct spec intent. The spec is right that both values must exist; it just doesn't say how to handle the common case where customers don't have supplier data. Forcing users to enter two factors when they only have one is a UX failure.

**Impact**: `Scope2Entry.locationBasedKgCo2e` and `.marketBasedKgCo2e` are both persisted. Form UI collects grid factor once; "override market-based factor" is an optional expander.

---

### A5. AI-assisted regulations is curated-only in MVP (contra §16.5.2 + §19.5)

**Spec says**: A news-style box in the Regulations module surfaces recent regulatory developments via AI summarisation.

**We do**: MVP Regulations module is **manually curated by Admins only**. No AI-generated regulatory content. Post-MVP, add AI summarisation of admin-pasted source text — never auto-fetched from the web.

**Why**: An LLM summarising live regulatory text is a legal-liability catastrophe. One hallucinated "EU Directive 2026/x says you must do Y" and we've given unlicensed legal advice that Maxtil acts on. The spec's own §16.3 says "not as legal advice" — that disclaimer doesn't hold up in court if the UI says "AI-generated regulatory update" at the top of a hallucinated article. Curated content is defensible; AI-generated is not.

**Impact**: Phase 7 (Regulations) ships with Admin CRUD only. Phase 5 AI work skips regulatory generation; adds AI insights and assistant only.

---

### A6. PDF export is MVP scope (contra §21.5)

**Spec says**: CSV + Excel export in MVP, PDF export "can be considered later".

**We do**: Branded PDF export (with company logo, reporting period, footer with page numbers, audit signature line) is in MVP for: Waste Flows list, Scope 1/2/3 lists, Production Intensity report, Dashboard summary.

**Why**: The spec says (§4.2, §7.9, §8.2, §10.13, §15.15) that a primary customer value prop is "audit preparation". Auditors do not accept `.xlsx` dumps — they want signed PDF reports. Shipping an "audit-ready" platform without PDF export is not audit-ready. PDF generation via React-PDF or Playwright-print-to-PDF is 3–5 days of work — smaller than the credibility gap of not having it.

**Impact**: +5 days to Phase 1 export-utilities track. All list pages get three export buttons: CSV / Excel / PDF.

---

### A7. Year-over-year comparison built in from day 1 (spec gap)

**Spec says**: Nothing about multi-year comparison or reporting baselines.

**We do**: Every emissions / waste record is queryable by year, quarter, month. The schema stores `reportingYear` and `reportingMonth` as denormalised fields (for fast filtering), plus an original `occurredAt` datetime. Dashboard + Analysis both default to showing current year with a "vs prior year" toggle.

**Why**: CSRD (applies to Maxtil if >250 employees or €50M turnover), ISSB, and SBTi all require baseline-year declaration and YoY variance reporting. Building this post-MVP means refactoring every record and every aggregation query. Building it now is a few extra fields.

**Impact**: Schema adds `reportingYear Int` and `reportingMonth Int` to Scope1Entry, Scope2Entry, Scope3Entry, WasteFlow (event-level — WasteFlow is a "standing stream" but has created/updated history). Baseline year is a company-level setting.

---

### A8. Emission factor versioning is first-class (spec gap)

**Spec says**: Emission factors have a `year` field (§9.7) but doesn't address what happens when a factor source (DEFRA, EEA, EPA) updates its numbers and we re-seed.

**We do**: Emission factors are **immutable** once referenced by a record. A re-seed creates new factor rows with a new `version` field; records keep their original factor FK. Admin UI surfaces "new factor available — review impact on current-year records" as an Activity Log event.

**Why**: Regulatory audits require demonstrating "what factor was used, when, for this record". If we mutate factors in place, historical records lose traceability. This is a classic auditability requirement in carbon software.

**Impact**: `EmissionFactor.version` + `EmissionFactor.supersededById` fields. Records snapshot the full factor (value, source, year, version) in JSON at write time. A `FactorRevisionEvent` ActivityLog entry fires when admin imports new factors.

---

### A9. 4 roles internal, 3 roles surfaced (refines §5)

**Spec says**: 3 roles — Admin / Collaborator / Viewer.

**We do**: Schema keeps 4 roles — **Owner / Admin / Collaborator / Viewer**. UI surfaces 3 — Owner and Admin both display as "Admin" in most places; the distinction only matters for billing, company deletion, and transferring ownership.

**Why**: Every production SaaS has an Owner concept distinct from Admin — someone who can delete the workspace, transfer billing, and remove other Admins. Squashing Owner into Admin means any Admin can delete Maxtil's data. That's unacceptable.

**Impact**: `MembershipRole` enum stays with 4 values. UI labels: Owner → "Admin (Owner)" in Team Overview; Admin → "Admin"; Collaborator → "Collaborator"; Viewer → "Viewer". Only Owner can: transfer ownership, delete company, remove other Admins. Spec's intent (3 functional layers) is preserved in UI.

---

## B. Non-functional additions (spec gaps)

The spec covers non-functional in §24 but is light on specifics. These are the concrete commitments we make:

### B1. Testing stack
- **Unit**: Vitest. Mandatory for every `lib/calculations/*` file (emission calcs, aggregations). Target ≥ 90% line coverage on calc modules.
- **Integration**: Vitest with real DB (test database per run). Mandatory for every server action. Target ≥ 70% coverage.
- **E2E**: Playwright. Golden paths only: sign up via invitation → create waste flow → attach document → view dashboard → export PDF.
- **CI gate**: PR cannot merge if tests fail, types fail, or lint fails. No exceptions, no `--no-verify`.

### B2. Accessibility
- **Target**: WCAG 2.2 Level AA.
- **Tools**: axe-core in E2E suite; eslint-plugin-jsx-a11y in CI.
- **Audit**: one manual keyboard-only walkthrough of every page per phase.

### B3. i18n
- **Library**: `next-intl`.
- **Locales at MVP**: `en` only, but every user-facing string wrapped in `t()`.
- **Post-MVP locales (queued)**: `pt-PT` (Maxtil's native), `es-ES`, `fr-FR`, `de-DE`.
- **No hardcoded strings** in components — enforced by lint rule.

### B4. Performance budget
- Dashboard TTFB < 500ms (p95).
- Dashboard full render < 1s (p95).
- List pages with 1000 records < 1.5s render.
- Analysis queries < 2s (p95).
- File uploads up to 50MB with progress indicator.
- Bundle size: first-load JS < 300KB gzipped per route.

### B5. Observability
- **Errors**: Sentry (browser + server).
- **Logs**: Pino with structured JSON, forwarded to Axiom or similar.
- **Metrics**: Business events logged (record created, emission calculated, document uploaded) — queryable.
- **Uptime**: target 99.5% (allows 3.6h/month downtime for MVP).

### B6. Security baselines beyond spec
- Password policy: min 12 chars, at least one uppercase + one number + one special char.
- Session timeout: 30 days absolute, 7 days idle.
- Rate limiting: 10 requests/sec per session on mutating actions (upstash/ratelimit).
- CSRF: Next.js server actions provide built-in origin validation (confirmed, keep).
- Content Security Policy: strict CSP header on all pages.
- Subresource Integrity on all CDN assets.

### B7. Data retention
- Soft-delete pattern: all operational records get `deletedAt DateTime?`. Hard-delete only on company-delete cascade.
- User "delete my data" request: soft-delete + anonymise user PII after 30 days (GDPR Art. 17).
- Audit log retention: 7 years (GDPR-compatible audit baseline).

### B8. Deployment / environments
- **Environments**: dev (local), preview (per-PR on Railway), staging, production.
- **Feature flags**: env-based (`NEXT_PUBLIC_FLAG_SCOPE3=true`). Use flags to merge incomplete features to main without exposing them.
- **Migrations**: every schema change has forward migration + reversible rollback. Prod migrations gated behind approval.
- **Zero-downtime**: schema migrations must be backwards-compatible for one deploy cycle (add column → deploy → backfill → deploy → remove old column).

---

## C. Explicit non-scope clarifications

Items from the spec that we're **explicitly not building** in MVP (aligns with spec §4.5 but tightens the list):

- Native mobile apps (iOS/Android) — spec §4.5 ✓
- Real-time IoT / smart-meter integrations — spec §4.5 ✓
- ERP / accounting integrations — spec §4.5 ✓
- Automated compliance engine — spec §4.5 ✓
- Advanced predictive AI / forecasting — spec §4.5 ✓
- SSO (Google, Microsoft, SAML) — future, architecturally ready
- MFA — future, architecturally ready
- Multi-currency billing — future
- Internal messaging / comments on records — future
- White-labelling for reseller partners — future
- Offline mode — future
- Public API — architecturally ready via service layer (§25.9) but no documented API in MVP

---

## D. Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| PO | Mateus Pinto da Cruz | Approved (per proxy confirmation) | 2026-04-23 |
| Tech Lead | João Carvalhosa | Approved | 2026-04-23 |
| Customer validation | Maxtil | Pending | — |

Amendments in this document supersede the corresponding sections of `RenAI_Specs.pdf` v1.0. If any conflict arises, this document wins.
