# RenAI — Spec vs Code Gap Analysis (Exhaustive)

> **Sources compared**: `specs/RenAI_Specs.pdf` v1.0 (98 pages, dated 19 Apr 2026) vs. current `main` branch at commit `0757c9a`.
> **Analysis date**: 23 Apr 2026.

---

## 1. Context & Why This Analysis

The PO delivered the full RenAI MVP Product Requirements Document (v1.0). The codebase has been built iteratively over the last weeks (Scope 1/2 carbon tracking shipped Apr 18; Sites section added Apr 19). We need a ground-truth gap analysis to:

1. Identify what is already aligned with the spec (avoid rework).
2. Identify what is **missing** entirely (unscoped work).
3. Identify what is **wrong** — built but diverges from the spec (refactor/rename work).
4. Produce a prioritized roadmap aligned with the spec's own phasing (§26).

The spec is structured across 26 sections covering: Product overview, User roles, Navigation, Dashboard, Waste Flows, Carbon Footprint (Scope 1/2/3 + Production Emission Factor), Analysis, Documentation, Regulations, Team Overview, Tasks + Activity Tracking, AI Features, Integrations/Imports, Reporting/Exports, Security/Compliance, Data Model, Non-Functional, Tech Architecture, and MVP Phases.

---

## 2. Executive Summary

**Overall readiness: ~30% of MVP scope implemented.**

The app has a **solid foundation** (multi-tenant auth, role-based access, sidebar layout, Waste Flows CRUD, Scope 1 fuel, Scope 2 electricity, Sites, invitation-based onboarding, platform-admin impersonation). But the spec's MVP is substantially larger than what's built:

- **7 of 13 specified modules are missing or stubs**: Scope 3, Production Emission Factor, Analysis, Documentation, Regulations, Team Overview (as a top-level module), Tasks & Activity Tracking.
- **Role names don't match the spec** (code has 4 roles; spec says 3 with different names).
- **Navigation has 2 extra items** (Valorization, Reporting) that aren't in the spec, and **is missing 3 items** (Analysis, Documentation, Regulations, Team Overview).
- **Scope 2 is missing the mandated dual-calculation** (location-based AND market-based).
- **No file upload infrastructure exists anywhere** — this blocks the entire Documentation value proposition and breaks every module's "attach supporting evidence" requirement.
- **No Activity Log / audit trail entity** — required by spec §5.2, §18, §22.8, §23.12, §23.15.
- **No tasks system** — required throughout (§4.4, §7.8, §17, §18).
- **Most existing modules are missing Edit actions** — only Create and Delete exist.

The foundation is good enough to build on; no wholesale rewrite is needed. The biggest gaps are **net-new modules** (Documentation, Regulations, Analysis, Tasks, Scope 3, Production EF) rather than broken existing code.

---

## 3. Readiness Scorecard

Status legend: ✅ Done · 🟡 Partial · 🟠 Wrong (diverges from spec) · ❌ Missing · — Not applicable yet

| Spec § | Module / Area | Status | % | Notes |
|---|---|---|---|---|
| 5 | User roles (Admin/Collaborator/Viewer) | 🟠 | 40 | Code uses OWNER/ADMIN/MEMBER/VIEWER + platform-level UserRole. Names and count wrong. |
| 6 | Navigation sidebar | 🟠 | 50 | Missing Analysis, Documentation, Regulations, Team Overview. Extra: Valorization, Reporting. |
| 7 | Dashboard module | 🟡 | 45 | KPIs + recent waste flows + charts present. Missing Scope 1/2/3/PEF KPIs, team actions, open tasks, data completeness, filters, empty states. |
| 8 | Waste Flows module | 🟡 | 70 | Most structure done. Missing: Edit, Archive action, doc attach, activity history, related tasks, updatedBy. |
| 9 | Carbon Footprint shell | 🟠 | 40 | Has Overview + Fuel + Electricity + Waste-Impact + 2 stubs. Spec wants Scope 1 + Scope 2 + Scope 3 + Production EF (no Overview, no Waste-Impact tabs). |
| 10 | Scope 1 | 🟡 | 35 | Core entry + calc works. Missing ~12 fields, custom factors, detail page, edit, activity history, doc upload. |
| 11 | Scope 2 | 🟠 | 25 | **Critical: single-calc instead of dual location-based + market-based**. Same field gaps as Scope 1. Missing Energy Type (electricity/steam/heat/cooling). |
| 12 | Scope 3 | ❌ | 0 | Stub page only. Needs 6+ categories, polymorphic schema, activity + spend-based calc methods. |
| 13 | Production Emission Factor | ❌ | 0 | Stub page only. Needs entity, calc engine, scope inclusion logic. |
| 14 | Analysis module | ❌ | 5 | `/reporting` is a stub. Spec wants configurable graph widgets, 10+ graph types, filters, CSV/Excel export. |
| 15 | Documentation module | ❌ | 0 | `/documents` is a stub. **No file upload infrastructure exists.** Needs Document entity, S3/cloud storage, metadata, preview, download, search. |
| 16 | Regulations module | ❌ | 0 | Does not exist in code. Needs entity, CRUD, AI news summaries. |
| 17 | Team Overview module | 🟠 | 30 | Partially covered by `/settings/team`. Spec wants top-level module with activity, tasks, user status, department, Last Active. |
| 18 | Tasks & Activity Tracking | ❌ | 0 | No task entity, no activity log entity, no assignment flow, no notifications. |
| 19 | AI Features | ❌ | 0 | No AI integration anywhere. |
| 20 | Integrations & Imports (CSV/Excel) | ❌ | 0 | Manual entry only. |
| 21 | Reporting & Exports | ❌ | 0 | No CSV/Excel export anywhere. |
| 22 | Security & Compliance | 🟡 | 55 | Multi-tenant isolation, bcrypt, HMAC sessions, RBAC all good. Missing: password complexity, MFA hook, Activity Log, protected file storage, privacy docs. |
| 23 | Data model + audit trail | 🟡 | 50 | Core entities present. Missing: Document, Regulation, Task, ActivityLog, Scope3Entry, ProductionEmissionFactor, updatedById on all records, Record Status on carbon entries. |
| 24 | Non-functional (perf/ux/reliability) | 🟡 | 65 | Fast, clean, multi-tenant. Missing: documented backup process, activity logging for reliability traceability. |
| 25 | Technical architecture | ✅ | 75 | Modular, multi-tenant by design, relational DB, env separation. Missing: file storage layer, import/export layer. |
| 26 | MVP Phases progress | — | — | Phase 1 ~80%, Phase 2 ~40%, Phase 3 ~5%, Phase 4 ~15%. |

---

## 4. Module-by-Module Detailed Analysis

Each section below lists: what's **DONE**, what's **MISSING** (not started), and what's **WRONG** (built but diverges from spec). File paths are absolute so you can jump directly to the code.

### 4.1 User Roles and Permissions (Spec §5)

**Spec requires**: 3 roles — `Admin`, `Collaborator`, `Viewer`. Audit trail must record which user created/updated important records.

**Current code**: `prisma/schema.prisma` defines:
- Platform-level: `UserRole` enum = `ADMIN | MEMBER` on `User.role`
- Company-level: `MembershipRole` enum = `OWNER | ADMIN | MEMBER | VIEWER` on `Membership.role`

**DONE**
- ✅ Role-based gating for team/sites (`canManageTeam()` at `src/lib/auth.ts`).
- ✅ Platform admin separation (for RenAI internal support).
- ✅ Multi-tenant role scoping via `Membership`.

**WRONG**
- 🟠 **Role names don't match spec**. Spec says "Collaborator"; code says "MEMBER". Spec says "Admin"; code has both `OWNER` and `ADMIN`. Spec has 3 roles; code has 4.
- 🟠 **VIEWER role exists in schema but server actions do not differentiate read-only behavior** (waste-flows/actions.ts does not check role; any member can write).
- 🟠 **Platform-level `User.role` (ADMIN/MEMBER) is a separate concept not in the spec.** It's a useful internal-support feature but should be documented as an internal concern, not exposed as "Admin" which would conflict with the tenant-level Admin role.

**MISSING**
- ❌ `updatedById` fields across most records (only `createdById` on WasteFlow, nothing on FuelEntry, ElectricityEntry, Site). Spec §5.2 and §23.14 require both.
- ❌ VIEWER enforcement in server actions (Spec §18.12: "Viewer users should have no task editing permissions and only limited visibility").

**Recommendation**: Keep 4-role schema internally (OWNER needed for delete-safeguards) but **map to spec's 3 roles in UI labels**: `OWNER` + `ADMIN` → "Admin", `MEMBER` → "Collaborator", `VIEWER` → "Viewer". Add `updatedById` to all records. Add read-only enforcement for VIEWER.

---

### 4.2 Platform Structure and Navigation (Spec §6)

**Spec requires** sidebar items (in this order): Dashboard, Waste Flows, Carbon Footprint, Analysis, Documentation, Regulations, Team Overview.

**Current sidebar** (`src/components/app-sidebar.tsx` via `src/components/nav-main.tsx`):
Dashboard, Waste Flows, Documents, Valorization Opp., Carbon Footprint, Reporting, Settings.

**DONE**
- ✅ Dashboard route.
- ✅ Waste Flows route.
- ✅ Carbon Footprint route with tab sub-navigation.
- ✅ Sidebar is collapsible to icon mode (good UX).
- ✅ Company switcher header.
- ✅ Platform Admin link gated on platform role.

**WRONG**
- 🟠 `/valorization` is **not in the spec at all**. It's a speculative "future module" — remove from MVP sidebar.
- 🟠 `/reporting` should be **`/analysis`** per spec (§6.2, §14). Reporting/Exports is a separate concern in spec §21 and is cross-cutting, not a navigation module.
- 🟠 `/documents` should be **`/documentation`** per spec (§6.2, §15) and must actually work, not be a stub.
- 🟠 `/settings` is in the sidebar but spec §6.8 explicitly lists "Settings" as a *future* scalability item that should not be a core sidebar item in MVP. It's used today for Account/Team/Sites — we need to rethink where those live (Sites arguably belongs under Company/Admin, Team moves to Team Overview, Account moves to header user menu).
- 🟠 Sidebar order doesn't match spec order.

**MISSING**
- ❌ `/analysis` route (currently `/reporting` stub).
- ❌ `/documentation` route (currently `/documents` stub with no implementation).
- ❌ `/regulations` route — does not exist at all.
- ❌ `/team-overview` route — does not exist at all (partially covered by `/settings/team`).
- ❌ Spec §6.6 "Suggested Global Page Elements": Notifications/alerts area in header (not implemented).
- ❌ Header user profile/account menu — only sidebar footer has user menu.

**Recommendation**: Rename routes and nav labels to match spec verbatim. Remove Valorization. Move Settings to future. Add Regulations + Team Overview top-level pages.

---

### 4.3 Dashboard Module (Spec §7)

**Spec requires** (§7.4–§7.10): KPI cards, Recent Activity section, Latest Team Actions, Open Tasks, Data Completeness summary, basic filters (period, plant, company), helpful empty states.

**Current code**: `src/app/(app)/dashboard/page.tsx` + `src/lib/dashboard.ts`.

**DONE**
- ✅ KPI cards: total flows, monthly volume, hazardous flows, recovery rate.
- ✅ Charts: category breakdown bar chart, treatment donut chart (`src/components/dashboard/`).
- ✅ Recent flows table (5 most recent).
- ✅ Alerts/insights panel (data quality warnings).
- ✅ Compliance snapshot (% flows with LoW code, % hazardous, % with treatment, % priority).

**WRONG**
- 🟠 **Too many complex charts on Dashboard**. Spec §7.11 explicitly says: "The Dashboard should not become the main page for detailed graph exploration. The following should be limited or avoided: too many complex charts, deep carbon analysis, configurable graph libraries, overloaded comparison views, large analytical tables." Current Dashboard has a full category bar chart + full treatment donut — these belong in the Analysis module.
- 🟠 The KPI set is **waste-only**. Spec §7.5 mandates Total Scope 1, Scope 2, Scope 3, and Production Emission Factor KPI cards in addition to waste KPIs. Current code has none of these emission KPIs on Dashboard (they live behind `/carbon-footprint/overview` instead).

**MISSING**
- ❌ **Total Scope 1 Emissions KPI card** (§7.5).
- ❌ **Total Scope 2 Emissions KPI card** (§7.5).
- ❌ **Total Scope 3 Emissions KPI card** (§7.5) — blocked by Scope 3 not existing.
- ❌ **Production Emission Factor KPI card** (§7.5) — blocked by PEF not existing.
- ❌ **Latest Team Actions section** (§7.7): who added a record, who uploaded a doc, who completed a task, who was assigned a task. Requires Activity Log entity.
- ❌ **Open Task Overview section** (§7.8): number open, overdue, due soon, by status, by user. Requires Task entity.
- ❌ **Data Completeness Summary** (§7.9): entries missing docs, incomplete emissions, flows missing classification, pending review items. Partially present via `InsightsAlerts` but needs expansion once Documentation exists.
- ❌ **Dashboard filters** (§7.10): reporting period selector, plant/location selector, company-level toggle.
- ❌ **Empty-state onboarding flows** (§7.12): if no data, show "Create a waste flow / Add a Scope 1 or 2 entry / Upload documentation / Invite collaborators" CTAs. Current Dashboard renders with empty charts.
- ❌ Dashboard has no "last login / welcome" context.

**Recommendation**: After emission KPIs are wired up (once Scope 3 + PEF exist), rebalance Dashboard to be summary-only. Move charts to Analysis. Add Activity Log + Tasks to unlock the team-actions and tasks sections.

---

### 4.4 Waste Flows Module (Spec §8)

**Spec requires** a record with 4 field groups (General Info / Quantities / Operational / Additional), required field validation, search + filter, list columns, detail page with activity history + related tasks + linked docs.

**Current code**: `src/app/(app)/waste-flows/**`, `src/lib/waste-flows.ts`.

**DONE**
- ✅ All General Information fields (Name, Category, Status, Waste Code LoW/EWC, Description, Material Composition) — schema at `prisma/schema.prisma:195-279`.
- ✅ Quantities fields (Estimated Quantity, Unit, Frequency).
- ✅ Operational fields (Storage Method, Current Destination, Current Operator, Plant/Location, Internal Code, Treatment Type with R1–R13 / D1–D15 codes, Treatment Notes).
- ✅ Additional fields (Recovery Potential Notes, Notes, Hazardous flag auto-set from LoW code, Priority flag).
- ✅ List view with all recommended columns (`waste-flows-table.tsx`).
- ✅ Filters: category, status, site, hazardous, priority, free-text search (§8.8).
- ✅ Required-field validation (Zod, server-side) per §8.5.
- ✅ Detail view page showing full record (§8.10).
- ✅ Create waste flow (§8.6).
- ✅ Delete waste flow (§8.6).
- ✅ Hazardous logic: LoW code is authoritative override (§8.12).
- ✅ Treatment classification via R*/D* codes (§8.13).

**WRONG**
- 🟠 `Frequency` enum has `CONTINUOUS` and `ONE_OFF` which are not in the spec's typical list but are reasonable extensions — leave as is, but flag for PO review.

**MISSING**
- ❌ **Edit existing waste flow** (§8.6). Today there is only Create + Delete. The form exists but there's no `/waste-flows/[id]/edit` route or update action.
- ❌ **Archive action** (§8.6) distinct from Delete. Schema supports `status=ARCHIVED` but no UI action exists to archive (vs. delete).
- ❌ **Attach documents to a waste flow** (§8.6, §8.11). Blocked by Documentation module not existing.
- ❌ **Download linked documents** (§8.6). Blocked by above.
- ❌ **Activity history on detail page** (§8.10). Blocked by Activity Log not existing.
- ❌ **Related tasks on detail page** (§8.10). Blocked by Tasks not existing.
- ❌ **Created By + Updated By display on detail page** (§8.10). Schema has `createdById` but no `updatedById`; detail page doesn't show either.
- ❌ **Frequency filter** (§8.8) and **Treatment-type filter** (§8.8) — category/status/hazardous/priority/site/code filters exist, but not frequency/treatment.
- ❌ **Waste code filter** is partially present (filtering by category) but there's no direct LoW-code filter.

**Recommendation**: This is the closest-to-spec module. Add Edit + Archive actions first; bolt on Documentation + Tasks + Activity history after those modules exist.

---

### 4.5 Carbon Footprint — Module Shell (Spec §9)

**Spec requires** 4 sub-sections (tabs) inside Carbon Footprint: Scope 1, Scope 2, Scope 3, Production Emission Factor. Module should be calculation-oriented, traceable, audit-friendly, with factor source tracking.

**Current tabs** (`src/components/carbon/carbon-tabs-nav.tsx`): Overview, Scope 1 Fuel, Scope 2 Electricity, Production (stub), Scope 3 Value Chain (stub), Waste Impact.

**WRONG**
- 🟠 **Overview tab should not exist here**. Spec §9.10: "High-level emissions KPIs may appear in the Dashboard, but detailed charts, comparisons, and advanced visual exploration should be handled in the Analysis module." Overview duplicates dashboard work in the wrong place.
- 🟠 **Waste Impact tab should not exist here**. Spec §6 and §9.3 list only 4 sub-sections. Waste impact calculations are part of Scope 3 ("Waste Generated in Operations" category) — they should move there.
- 🟠 **Production** is a stub, but it's labelled correctly per spec.
- 🟠 **Scope 3 is labelled "Scope 3 — Value Chain"** which is descriptive but the spec just calls it "Scope 3" — minor cosmetic.
- 🟠 Module design is **not calculation-oriented** per §9.5. Currently, users pick a fuel type + region and the app silently looks up a factor. Spec expects the factor (value, source, region, year, version, custom vs. standard) to be **explicitly visible on the form and in the record** (§9.7, §10.3.3).

**DONE**
- ✅ Tabbed sub-navigation component pattern is correct and extensible.
- ✅ Module grouping, filter by period in part (month-based).
- ✅ Factor storage with global + company overrides (`EmissionFactor` table with `(category, subtype, region, year, companyId)` uniqueness).
- ✅ Factor snapshot on entry (`kgCo2e` stored at write time for traceability) — matches §10.12.

**MISSING** (cross-cutting for all sub-sections)
- ❌ Scope 3 implementation.
- ❌ Production Emission Factor implementation.
- ❌ Activity history per record (§9.6, §10.10, §11.11, §12.13).
- ❌ Filter by quarter and year (month only today) (§9.9).
- ❌ Filter by factor source (§9.9).
- ❌ Filter by record status (§9.9).
- ❌ Custom user-defined emission factors UI (§9.7): schema allows `companyId` on EmissionFactor but there's no UI to create/override factors per company.
- ❌ Factor Type field on entries (standard vs. custom) (§10.3.3).
- ❌ Supporting documentation linkage (§9.8, §10.11, §11.12, §12.14). Blocked by Documentation module.

**Recommendation**: Delete Overview + Waste Impact tabs (move their content to Dashboard + Scope 3). Add Scope 3 + PEF tabs as real modules. Rework entry forms to expose factor metadata visibly.

---

### 4.6 Scope 1 (Spec §10)

**Spec requires** per-entry fields: Entry Title, Emission Source Type, Fuel Type, Plant/Location, Month, Year, Notes, Quantity, Unit, Source Reference, full Emission Factor Data (Value/Unit/Source/Region/Year or Version/Type), Calculation Output (Emissions + Unit), Supporting Documentation, Created/Updated By, Created/Updated At, Record Status.

**Current code**: `src/app/(app)/carbon-footprint/fuel/**`, `src/lib/carbon.ts:254-285`, schema `FuelEntry`.

**DONE**
- ✅ Fuel Type field (with catalog: diesel, petrol, natural_gas, natural_gas_kwh, lpg, heating_oil, coal, biodiesel, wood_pellets).
- ✅ Plant/Location (siteId + locationName fallback).
- ✅ Month (DateTime, first of month UTC).
- ✅ Notes.
- ✅ Quantity + Unit (L, m³, kg, kWh).
- ✅ Region selector (PT/ES/FR/DE/UK/US/EU/GLOBAL) — maps to factor region.
- ✅ Calculated kgCo2e stored at insert.
- ✅ Created At / Updated At (Prisma auto).
- ✅ List view.
- ✅ Filter by region partial.
- ✅ Delete action.

**WRONG**
- 🟠 **Unit conversion is absent**: if user picks natural_gas (factor in m³) but types kWh, the app silently returns 0 kgCo2e with a warning. This is dangerous — either do conversions via calorific values or block the mismatch at the form level.
- 🟠 **Emission factor is opaque to the user**. Form doesn't display "kgCO₂e/L = 2.688 (DEFRA 2024, GLOBAL)". Record detail page doesn't show which factor was used.
- 🟠 Records don't show who created them; no `createdById` field on `FuelEntry`.

**MISSING**
- ❌ **Entry Title** (§10.3.1) — no human-friendly name for an entry.
- ❌ **Emission Source Type** (§10.3.1, §10.4) — spec wants a classifier: stationary combustion, mobile combustion, company vehicles, boilers, generators, process emissions, fugitive emissions. Currently only "Fuel Type" is captured.
- ❌ **Year** as a distinct field separate from Month (§10.3.1).
- ❌ **Source Reference / Consumption Reference** (§10.3.2) — e.g. the fuel invoice number or meter reading reference.
- ❌ **Full Emission Factor Data** stored with the entry (§10.3.3): Value, Unit, Source, Region, Year/Version, Type (standard/custom). Today only `emissionFactorId` FK is kept — if the factor is later edited or deleted (onDelete SetNull), the historical context is lost. The `kgCo2e` snapshot helps but doesn't preserve factor context.
- ❌ **Output Unit** field on Calculation Output (§10.3.4) — we store kgCO₂e but don't explicitly denote the unit.
- ❌ **Supporting Documentation attachment** (§10.3.5, §10.11).
- ❌ **Created By / Updated By** fields on `FuelEntry` (§10.3.5, §23.14).
- ❌ **Record Status** (§10.3.5) — draft / active / archived? Not modelled.
- ❌ **Edit existing entry** — no edit UI or update action.
- ❌ **Detail page** for a Scope 1 entry (§10.10). List-only today.
- ❌ **Activity history** (§10.10).
- ❌ **Related tasks** (§10.10).
- ❌ **Custom factor** support UI (§10.3.3, §9.7).
- ❌ **Filters**: month range, year, source type, factor source, record status (§10.8).
- ❌ **Additional list columns** (§10.9): Status, Factor Source, Last Updated.

---

### 4.7 Scope 2 (Spec §11)

**Spec requires**: energy consumption with BOTH `Location-Based Emissions` AND `Market-Based Emissions` calculated and stored per entry; all the same fields as Scope 1 plus Energy Type (electricity/steam/heat/cooling), % Renewable, Energy Provider, Grid Region.

**Current code**: `src/app/(app)/carbon-footprint/electricity/**`, `src/lib/carbon.ts:287-308`, schema `ElectricityEntry`.

**DONE**
- ✅ kWh quantity.
- ✅ Month.
- ✅ Renewable % (0–100 clamp).
- ✅ Energy provider (freetext).
- ✅ Grid Region (PT/ES/FR/DE/UK/US/EU; defaults EU).
- ✅ Plant/Location.
- ✅ Factor lookup by region.
- ✅ Renewable % correctly reduces fossil-weighted emissions.

**WRONG**
- 🟠 **CRITICAL: Single-calc instead of dual**. Spec §11.2 and §11.4 mandate BOTH location-based and market-based emissions be calculated and displayed. Current implementation computes one value (`kgCo2e`) that behaves closer to a blended market-like value (using renewable% discount on grid factor). This is not spec-compliant. Location-based uses pure grid factor (ignoring renewable%). Market-based uses supplier-specific factor or residual mix (applies renewable%). Spec wants both shown side-by-side for transparency.
- 🟠 **Unit is hardcoded to kWh.** Spec wants configurable Energy Type + Unit (electricity kWh/MWh, steam t or GJ, heat kWh or GJ, cooling kWh). Current code only supports electricity in kWh.

**MISSING**
- ❌ **Energy Type field** (§11.3.1): electricity, steam, heat, cooling.
- ❌ **Entry Title** (§11.3.1).
- ❌ **Year** as separate field (§11.3.1).
- ❌ **Location-Based Emissions Value** column in DB (§11.3.4).
- ❌ **Market-Based Emissions Value** column in DB (§11.3.4).
- ❌ **Output Unit** field (§11.3.4).
- ❌ **Full Emission Factor Data** stored with entry (§11.3.3) — same issue as Scope 1.
- ❌ **Supplier-specific factor** support (§11.5) — distinct from grid region factors; needs a way to input a supplier's REC / guarantee-of-origin factor.
- ❌ **Custom user-defined factors** (§11.5, §9.7).
- ❌ **Supporting Documentation** (§11.3.5, §11.12).
- ❌ **Created By / Updated By / Record Status** (§11.3.5).
- ❌ **Detail page** (§11.11).
- ❌ **Activity history** (§11.11).
- ❌ **Related tasks** (§11.11).
- ❌ **Edit existing entry**.
- ❌ **Filters**: month/year, energy type, energy provider, grid region, factor source, record status (§11.9).
- ❌ **Additional list columns**: Location-Based, Market-Based, Factor Source, Status, Last Updated (§11.10).

**Recommendation**: This is the highest-risk module. Redesign ElectricityEntry → rename to `Scope2Entry` with dual emission columns, energy type, and factor source split (grid vs supplier vs custom).

---

### 4.8 Scope 3 (Spec §12) — **COMPLETELY MISSING**

**Spec requires**: 6 mandatory categories for MVP, plus architecture to add more. Each category has shared core fields + category-specific fields. Must support activity-based AND spend-based calculations.

**Current code**: `src/app/(app)/carbon-footprint/value-chain/page.tsx` — a 10-line stub rendering `<ComingSoonPanel />`.

**MISSING (everything)**
- ❌ `Scope3Entry` Prisma model (polymorphic design: shared core fields + JSONB or discriminator-based category-specific fields).
- ❌ `Scope3Category` enum: `PURCHASED_GOODS_SERVICES`, `FUEL_ENERGY_RELATED`, `UPSTREAM_TRANSPORT`, `WASTE_GENERATED`, `BUSINESS_TRAVEL`, `EMPLOYEE_COMMUTING`, `DOWNSTREAM_TRANSPORT`.
- ❌ Shared core record fields: Entry Title, Scope 3 Category, Activity Type, Plant/Location or Business Unit, Month, Year, Notes, Quantity, Unit, Supplier or Counterparty, Activity Reference, full Emission Factor Data, Calculation Output, Calculation Method (activity-based / spend-based), Supporting Docs, Created/Updated By, Record Status.
- ❌ Category-specific field groups per §12.7:
  - **Purchased Goods & Services**: Supplier, Material/Service Type, Quantity or Spend Value, Currency (if spend-based), Product Category.
  - **Fuel & Energy-Related Activities**: Related Energy Type, Quantity, Unit, Upstream Factor Reference.
  - **Upstream Transport**: Transport Mode, Weight, Distance, Origin, Destination, Carrier.
  - **Waste Generated in Operations**: Related Waste Flow (FK), Waste Treatment Path, Quantity, Unit, Waste Operator.
  - **Business Travel**: Travel Type, Transport Mode, Distance, Traveler or Department.
  - **Employee Commuting**: Number of Employees, Transport Mode, Distance Estimate, Frequency.
  - **Downstream Transport**: Transport Mode, Weight, Distance, Destination, Carrier.
- ❌ Dynamic form rendering that changes fields based on selected category (§12.9).
- ❌ List page, filters (§12.10–§12.11), list columns (§12.12), detail page (§12.13), doc linkage (§12.14), traceability (§12.15).
- ❌ Emission factor catalogs for Scope 3 subtypes (we have none seeded).
- ❌ Server actions: `registerScope3Entry`, `updateScope3Entry`, `deleteScope3Entry`.
- ❌ Integration with Waste Flow module (Waste Generated in Operations should auto-link to existing WasteFlow records).

**Recommendation**: Design the polymorphic schema carefully (Postgres JSONB column `categoryData` is a good fit, gated by Zod schemas per category server-side). Seed factors from DEFRA / EPA / IEA. Start with the 2 highest-value categories for Maxtil (Purchased Goods & Services + Business Travel) then expand.

---

### 4.9 Production Emission Factor (Spec §13) — **COMPLETELY MISSING**

**Spec requires**: a calculated intensity metric: `Production Emission Factor = Total Emissions / Production Volume`. User selects which scopes to include. Output units like kgCO₂e/ton, tCO₂e/ton, kgCO₂e/unit, kgCO₂e/meter textile.

**Current code**: `src/app/(app)/carbon-footprint/production/page.tsx` — stub.

**MISSING (everything)**
- ❌ `ProductionEmissionFactor` Prisma model.
- ❌ Fields: Record Title, Reporting Period, Plant/Location, Product Type, Notes, Scope 1 value, Scope 2 value, Scope 3 value, Total Included, Scope Selection, Production Volume, Production Unit, Calculated PEF, Output Unit, Supporting Docs, Created/Updated By, Record Status.
- ❌ Calculation engine: given a Company + reporting period + scope inclusion set, sum the Scope 1/2/3 entries, divide by production volume.
- ❌ Scope Inclusion enum: `SCOPE_1_ONLY`, `SCOPE_1_2`, `SCOPE_1_2_3`.
- ❌ Auto-pull logic from Scope 1/2/3 records for the selected period.
- ❌ Output unit mapping (ton → kgCO₂e/ton; piece → kgCO₂e/unit; meter → kgCO₂e/m).
- ❌ List page, filters (§13.10), columns (§13.11), detail page (§13.12), doc linkage (§13.13), trend/comparison graph (§13.14) — latter defers detailed viz to Analysis.
- ❌ Server actions.

**Recommendation**: Depends on Scope 3 existing for full S1+S2+S3 coverage, but S1+S2 PEF can ship first.

---

### 4.10 Analysis Module (Spec §14) — **COMPLETELY MISSING**

**Spec requires**: a separate advanced analytics module. Configurable graph widgets (user selects which charts to display). 10+ graph types. Rich filter bar (date range, month/quarter/year, plant, scope, Scope 3 category, waste category, waste flow, energy type, fuel type, team member). CSV + Excel export (MVP); PDF/Image export (future).

**Current code**: `src/app/(app)/reporting/page.tsx` — a 10-line stub.

**MISSING (everything)**
- ❌ Rename `/reporting` → `/analysis`.
- ❌ Page structure: Top section (page title, filter bar, date-range + plant + scope + category selectors, graph selection controls); Main section (selected graph widgets, card/block layout); Bottom section (optional data table, export actions).
- ❌ Graph types to support (§14.7): line, bar, stacked bar, area, pie, donut, comparison, trend, breakdown, top contributor.
- ❌ Carbon graphs (§14.8): total emissions over time, emissions by scope, by plant/location, by month/quarter/year, Scope 1 breakdown by fuel type, Scope 2 location-vs-market comparison, Scope 3 breakdown by category, top emissions sources, emissions trend, PEF trend.
- ❌ Waste graphs (§14.9): volume by category, by plant, hazardous vs non-hazardous split, recovery vs disposal split, generation trend over time, priority flows, top streams by volume.
- ❌ Data quality graphs (§14.10): records missing docs, incomplete emissions, waste flows missing required fields, missing classifications, open tasks by module, completion rate by user/team.
- ❌ Graph selection UI (user adds/removes widgets).
- ❌ Export: CSV + Excel (MVP).

**Library choice**: Current Dashboard uses Recharts (looking at `src/components/dashboard/category-bar-chart.tsx` etc.). Extend the same library to avoid adding a new dependency.

**Recommendation**: This is a large module. Ship a "fixed" (non-configurable) v1 with the most important 6–8 charts and export, then add configurability in v2.

---

### 4.11 Documentation Module (Spec §15) — **COMPLETELY MISSING** (and blocks many other features)

**Spec requires**: central file repository. Metadata: Title, Type, File Name/Type/Size, Upload Date, Uploaded By, Linked Module, Related Record Type/ID, Reporting Period, Plant/Location, Department, Notes, Tags, Version, Record Status. Support PDF, Excel, CSV, PNG, JPG, JPEG, Word, text. Document types: Invoice, Waste certificate, Collection receipt, Fuel bill, Electricity bill, Supplier doc, Internal report, Audit evidence, Environmental license, Contract, Emissions evidence, Production report, Regulatory file, Other. Preview + download + search + filter. Uploaded from Documentation OR directly from any module record, with auto-population across both.

**Current code**: `src/app/(app)/documents/page.tsx` — stub. **No file storage exists anywhere in the project.** No S3, no Cloudinary, no local storage handler, no multipart form handling for files.

**MISSING (everything)**
- ❌ **File storage infrastructure**: need to choose and integrate an object store (S3, Cloudflare R2, Supabase Storage, or similar). Railway has volumes but for multi-tenant file storage, cloud object storage is recommended. Spec §25.7 requires "secure file storage with controlled access" + §22.7 requires "uploaded files are access-controlled, not publicly exposed, tenant permissions, traceable actions".
- ❌ **`Document` Prisma model** with all spec metadata fields.
- ❌ **`DocumentType` enum**.
- ❌ **`DocumentLink` join table** to many-to-many link documents to arbitrary records (waste flow, scope 1/2/3, PEF, regulation). Alternative: polymorphic pattern with `linkedModule` + `linkedRecordId`.
- ❌ **Upload endpoint / server action** with multipart handling, MIME validation, size limits, virus scanning consideration.
- ❌ **Download endpoint** with per-request authorization check (must verify tenant owns the file).
- ❌ **Preview UI**: PDF preview (react-pdf or iframe), images inline, download-only for other types.
- ❌ **Documentation overview page** (§15.7): search + filters + upload button + list/table + preview + download + open-related-record actions.
- ❌ **Filters**: doc type, linked module, reporting period, upload date, plant, department, uploader, tags, file type, record status (§15.8).
- ❌ **List columns** per §15.9.
- ❌ **Detail view / side panel** (§15.10).
- ❌ **Upload directly from module records** (§15.11): attach-document button on waste flow form, Scope 1/2/3 forms, PEF form, Regulation form.
- ❌ **Auto-appearance in Documentation** when uploaded from sub-module (§15.11).
- ❌ **Version numbering** (§15.14) — optional in MVP but recommended.

**Recommendation**: This is the single most blocking missing module. Pick object storage (recommend **Cloudflare R2** — S3-compatible, generous free tier, low egress costs) and wire up end-to-end upload+download+preview before any other feature depends on it. Add a Document entity with polymorphic linking.

---

### 4.12 Regulations Module (Spec §16) — **COMPLETELY MISSING**

**Spec requires**: curated regulatory information hub (not legal-automation engine). Manual CRUD (Admin only) + separate AI-assisted news/updates area.

**Current code**: does not exist at all. No `/regulations` route.

**MISSING (everything)**
- ❌ `/regulations` route.
- ❌ `Regulation` Prisma model with all §16.6 fields: Title, Type, Geography, Topic, Summary, Source Reference, Effective Date, Status, Applies to Us flag, Priority Level, Internal Notes, Reviewed By, Review Date, Linked Documents, Created/Updated By, Created/Updated At.
- ❌ `RegulationType` enum per §16.7: EU Regulation, EU Directive, National Law, National Decree, Guidance, Reporting Standard, Regulatory Update, Internal Compliance Note, Other.
- ❌ `RegulationTopic` enum per §16.8: Waste Management, Carbon Footprint, GHG Reporting, ESG Reporting, Energy, Hazardous Waste, Environmental Licensing, Audit and Documentation, Industrial Compliance, Other.
- ❌ CRUD server actions (Admin-only).
- ❌ Overview page, search, filter, list view, detail view per §16.9–§16.11.
- ❌ Document linkage (§16.12).
- ❌ **AI-Assisted Updates Area** (§16.5.2, §19.5): separate news-style box with simplified summaries. Requires AI integration.

**Recommendation**: Ship the manual CRUD first; AI summaries can come later once AI infrastructure is established.

---

### 4.13 Team Overview Module (Spec §17)

**Spec requires**: top-level module where Admins see all users, roles, recent activity, assigned tasks, user statuses. Fields per user: Full Name, Email, Role, Department, User Status (Active/Invited/Inactive/Suspended), Date Invited, Last Active, Number of Open Tasks, Number of Completed Tasks.

**Current code**: `src/app/(app)/settings/team/**` — partial implementation.

**DONE**
- ✅ View team members (member list by company).
- ✅ Invite team member with role.
- ✅ Revoke pending invitation.
- ✅ Remove member (with last-OWNER safeguard).
- ✅ Role assignment (OWNER/ADMIN/MEMBER/VIEWER).

**WRONG**
- 🟠 Lives under `/settings/team` but spec wants it as a **top-level sidebar module** `/team-overview`. It's architecturally misplaced.
- 🟠 Invitations are not emailed (no SMTP integration) — Admin must manually share the invite URL. Not strictly spec-violating, but a UX gap.

**MISSING**
- ❌ **Department field on User** (§17.4).
- ❌ **User Status enum**: Active, Invited, Inactive, Suspended (§17.5). Today users are only implicit (have a session or don't).
- ❌ **Date Invited** display (§17.4) — `Invitation.createdAt` exists but isn't surfaced.
- ❌ **Last Active timestamp** (§17.4) — not tracked on User.
- ❌ **Number of Open / Completed Tasks per user** (§17.4, §17.9) — blocked by Tasks module.
- ❌ **Recent actions per user** (§17.4, §17.9) — blocked by Activity Log.
- ❌ **User detail page** (§17.8) with profile, recent actions, assigned/completed tasks, activity.
- ❌ **Filter by role, department, user status, last activity, task status** (§17.7).
- ❌ **Search** by name/email.

**Recommendation**: Create `/team-overview` as a top-level route. Migrate existing team-management actions to live there. Move the URL-scheme to align with spec. Leave `/settings/team` as a deprecated alias or remove entirely (post-Tasks + Activity Log).

---

### 4.14 Tasks & Activity Tracking (Spec §18) — **COMPLETELY MISSING**

**Spec requires** (§18.3–§18.11): Admins create tasks with title, description, assigned-to, assigned-by, related module, related record, priority (Low/Medium/High/Critical), status (Open/In Progress/Blocked/Completed/Cancelled/Overdue), start date, due date, notes. Tasks link to specific records (Waste Flow, Scope 1/2/3 entry, PEF record, Regulation entry, Document). Activity log tracks: record creation, record updates, document uploads, task creation, task assignment, task status changes, user invitations, regulation updates.

**Current code**: does not exist at all.

**MISSING (everything)**
- ❌ `Task` Prisma model.
- ❌ `TaskPriority` enum (Low/Medium/High/Critical).
- ❌ `TaskStatus` enum (Open/InProgress/Blocked/Completed/Cancelled/Overdue).
- ❌ Task `assignedToId` + `assignedById` + polymorphic link (`relatedModule`, `relatedRecordId`) + dates + notes.
- ❌ `ActivityLog` Prisma model with Activity Type (enum), User FK, Related Module, Related Record ID, Action Description, Timestamp.
- ❌ `ActivityType` enum: `RECORD_CREATED`, `RECORD_UPDATED`, `DOCUMENT_UPLOADED`, `TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `USER_INVITED`, `REGULATION_UPDATED`.
- ❌ Activity log write hooks in every server action (create/update/delete).
- ❌ Task CRUD server actions with Admin-gating (Viewer: read-only; Collaborator: see own tasks).
- ❌ Task overview page (list by user, module, priority, status, due date).
- ❌ Task detail view.
- ❌ "My Tasks" section / view.
- ❌ Simple in-app notifications: newly assigned task, overdue task, recent status change (§18.13).
- ❌ Task linkage on every module's detail page ("Related tasks" section).

**Recommendation**: This unlocks a huge amount of downstream value (Dashboard team-actions + open-tasks, Team Overview user task counts, audit trail). Build `ActivityLog` first (lightweight; instrument every server action), then `Task` on top. Consider a shared `logActivity(type, userId, companyId, module, recordId, description)` helper invoked from each server action.

---

### 4.15 AI Features (Spec §19) — **COMPLETELY MISSING**

**Spec requires** (MVP): In-app assistant (helps users understand platform, modules, fields, calculations). AI-assisted regulations updates (news summaries). Basic insight suggestions (highlight high-emission sources, missing documentation, incomplete records, major contributors).

**Current code**: no AI integration.

**MISSING**
- ❌ Anthropic API integration (or OpenAI). Given this is a product *called* RenAI that prominently features AI, Anthropic is the natural fit.
- ❌ In-app assistant UI (chat sidebar or modal).
- ❌ System prompt scaffolding with current user context (company, role, recent actions).
- ❌ AI-assisted regulations news-summary pipeline (background fetch + summarize + tag by topic/geography).
- ❌ Rules-based or LLM-based insight generator (can be purely algorithmic for MVP per spec: "highlighting high-emission sources, pointing out missing documentation, identifying incomplete records, surfacing major contributors, suggesting areas for reduction review").

**Recommendation**: Start with rules-based insights on Dashboard (no LLM needed). Add in-app assistant in a later phase using Claude API.

---

### 4.16 Integrations and Imports (Spec §20) — **MOSTLY MISSING**

**Spec MVP**: manual data entry + file uploads + CSV import + Excel import. Support all the main modules.

**Current code**: manual entry only.

**DONE**
- ✅ Manual data entry (every module).

**MISSING**
- ❌ **CSV import** (§20.3) for Waste Flows, Scope 1, Scope 2, Scope 3, Production EF, Documentation metadata.
- ❌ **Excel import** (§20.3) for same modules.
- ❌ **Column mapping UI** (§20.5) — user maps file columns to platform fields.
- ❌ **Validation pre-import** (§20.5–§20.6): required fields, formats, unit consistency, duplicate detection, basic data quality.
- ❌ **Import review UI** before commit (§20.5).
- ❌ **File uploads from every module** (§20.7) — blocked by Documentation module.

**Recommendation**: Ship a reusable import component (column mapper + dry-run validator + commit) once Documentation exists.

---

### 4.17 Reporting and Exports (Spec §21) — **MISSING**

**Spec MVP**: CSV + Excel export of structured data. Download uploaded files. Export filtered data set from any module's list view.

**Current code**: no export anywhere.

**MISSING**
- ❌ **CSV export** from Waste Flows, Scope 1, Scope 2, Scope 3, PEF, Documentation metadata, Tasks (§21.4).
- ❌ **Excel export** (`.xlsx`) from same modules.
- ❌ **"Export filtered data set"** action — honour active filters on list pages.
- ❌ **"Download source files"** action — download uploaded documents (depends on Documentation).

**Recommendation**: Add a small `exportToCsv(records, columns)` and `exportToXlsx(records, columns)` utility and an "Export" button on every list page.

---

### 4.18 Security and Compliance (Spec §22)

**Spec requires**: multi-tenant separation, secure auth, RBAC, HTTPS, secure password storage, protected file access, audit logging, controlled editing/deletion, backup & recovery, env separation, least-privilege, GDPR-related controls, privacy policy, terms of service, data processing agreement, subprocessor list, document & file security, audit trail, retention/deletion policy.

**Current code**:

**DONE**
- ✅ **Multi-tenant separation** enforced via `companyId` filter on every query + `deleteMany` guards to prevent cross-tenant deletes.
- ✅ **Custom authentication** with bcrypt (cost 10) + HMAC-signed session cookies (httpOnly, secure in prod, sameSite=lax, 30-day expiry). Timing-safe comparison on login.
- ✅ **RBAC (basic)**: `canManageTeam()` gates OWNER/ADMIN actions; `isPlatformAdmin()` gates platform admin surface.
- ✅ **HTTPS in transit** (Railway terminates TLS).
- ✅ **Secure password storage** (bcrypt).
- ✅ **Environment separation** (Railway preview/production).
- ✅ **Backup**: Railway Postgres has automatic backups.

**WRONG**
- 🟠 **Password rules too weak**: min 8 chars only, no complexity rules (§22.4 says "strong password rules"). No 1-char-class / 2-char-class / length requirement.
- 🟠 VIEWER role not enforced for read-only.
- 🟠 Deployment history shows the app was previously affected by "stale server action IDs" — Next.js server actions should be monitored for backwards-compat issues during deployment.

**MISSING**
- ❌ **MFA hook** (§22.4 says "architecture should also allow future addition of SSO and MFA") — not blocked but not present.
- ❌ **SSO hook** (§22.4) — same.
- ❌ **Protected file access** (§22.7) — blocked by no file storage.
- ❌ **Audit logging of key actions** (§22.5, §22.8, §23.15) — blocked by no ActivityLog entity.
- ❌ **Controlled record editing/deletion** (§22.5) — there's no confirm-and-reason flow, no soft-delete + recycle-bin. Schema does hard-delete.
- ❌ **Documented backup & recovery process** (§22.5, §22.10).
- ❌ **Principle of least privilege** (§22.5) — internal access policy not documented.
- ❌ **Privacy Policy** (§22.6, §22.10).
- ❌ **Terms of Service** (§22.6, §22.10).
- ❌ **Data Processing Agreement** (§22.6, §22.10).
- ❌ **Subprocessor list** (§22.6, §22.10).
- ❌ **Security overview document** (§22.10).
- ❌ **Retention and deletion logic** (§22.6) — no data retention policy; `User.delete()` cascades which is OK but there's no user-facing "delete my data" flow.
- ❌ **Data access / deletion request handling process** (§22.6).
- ❌ **GDPR records-of-processing** docs (§22.6, Article 30).
- ❌ **Cross-border transfer mechanisms** docs (§22.6) — given Railway hosts in US by default, subprocessor disclosure is required.

**Recommendation**: Harden password rules in the near term (easy win). Add ActivityLog for audit. Plan file storage with access control. Draft Privacy Policy + ToS + DPA with counsel before commercial use (§22.10).

---

### 4.19 Data Model & Audit Trail (Spec §23)

**Spec requires** the following entities: Company, User, Role, Plant/Location, Waste Flow, Scope 1 Entry, Scope 2 Entry, Scope 3 Entry, Production Emission Factor, Document, Regulation Entry, Task, Activity Log. All important records must have: Created By, Updated By, Created At, Updated At, Record Status.

**Current schema** (`prisma/schema.prisma`):

**DONE**
- ✅ Company.
- ✅ User.
- ✅ MembershipRole (approx for Role, modulo naming mismatch).
- ✅ Plant/Location (named `Site`).
- ✅ WasteFlow.
- ✅ Scope 1 Entry (named `FuelEntry`).
- ✅ Scope 2 Entry (named `ElectricityEntry`).
- ✅ EmissionFactor — not in spec's core entity list but a good design choice for factor traceability.
- ✅ WasteCode + WasteCategory — reference data catalogs.
- ✅ Invitation — supporting entity for onboarding.
- ✅ Multi-tenant cascade design.

**MISSING (entities)**
- ❌ `Scope3Entry`.
- ❌ `ProductionEmissionFactor`.
- ❌ `Document` (+ DocumentLink or polymorphic fields).
- ❌ `Regulation`.
- ❌ `Task`.
- ❌ `ActivityLog`.

**WRONG / MISSING (fields on existing entities)**
- 🟠 **No `updatedById` on any record** (§23.14 mandates it on all important records).
- 🟠 **No `createdById` on FuelEntry, ElectricityEntry, Site, Invitation** (only WasteFlow has it).
- 🟠 **No `recordStatus` enum on FuelEntry, ElectricityEntry** (§10.3.5, §11.3.5).
- 🟠 **No `entryTitle`** on FuelEntry, ElectricityEntry.
- 🟠 **No `year`** separate field on entries (month only).

**Recommendation**: Schema migration to add `createdById`, `updatedById`, `recordStatus`, `title`, `year` fields to FuelEntry + ElectricityEntry. Add new entities for the missing modules. Enforce tenant isolation on all new entities.

---

### 4.20 Non-Functional Requirements (Spec §24)

**Spec covers**: performance, usability, reliability, scalability, maintainability, security, responsiveness, availability.

**DONE**
- ✅ **Performance**: Next.js SSR with route prefetching (commit 652b05a). Fast initial loads.
- ✅ **Usability**: shadcn/ui is clean, readable, consistent.
- ✅ **Scalability**: multi-tenant by design; indexes in place.
- ✅ **Maintainability**: modular structure (`lib/`, `app/(app)/**/actions.ts`), TypeScript throughout.
- ✅ **Security**: see §22.
- ✅ **Responsiveness**: sidebar collapse + responsive table; desktop-first as spec requires.

**PARTIAL / MISSING**
- 🟡 **Reliability**: records save correctly; filters return accurate results; user actions are traceable (partially — no audit log yet).
- ❌ **Availability documentation**: no published uptime target or monitoring dashboard.
- ❌ **Activity logging** (for reliability traceability per §24.6).

---

### 4.21 Technical Architecture (Spec §25)

**Spec requires**: multi-tenant by design, modular backend structure, clear domain separation, scalable data model, secure file storage, RBAC, audit-ability, integration-ready.

**DONE**
- ✅ Multi-tenant web app (Next.js App Router + Prisma + Postgres).
- ✅ Modular backend (per-module `actions.ts` files).
- ✅ Domain separation (lib/carbon.ts, lib/dashboard.ts, lib/waste-flows.ts, lib/auth.ts, lib/session.ts, lib/invitations.ts).
- ✅ Scalable relational data model.
- ✅ RBAC.
- ✅ Env separation (Railway preview + production).

**MISSING**
- ❌ **Secure file storage layer** — biggest architectural gap. Must be added before Documentation module.
- ❌ **API/service boundary clarity** (§25.9): everything is Next.js server actions right now. This is fine for MVP but may not expose stable boundaries for future integrations. Consider a thin internal services layer in `lib/services/*` (e.g. `WasteFlowService`, `Scope1Service`) that actions call — so later an `/api/v1/*` route handler can call the same service.
- ❌ **Import/export architecture** (§25.10): needs to be designed with reusable column-mapper + validator + commit pattern.
- ❌ **Centralized calculation logic** (§25.8): `lib/carbon.ts` centralizes carbon math (good); need similar for Scope 3 (once it exists) and PEF. Recommend one file per calc domain under `lib/calculations/`.

---

### 4.22 MVP Phases Readiness (Spec §26)

**Spec's own phased delivery** reflected against current state:

**Phase 1 — Core Platform Foundation (§26.6)**
Authentication ✅ · User roles ✅ (naming wrong) · Multi-tenant ✅ · Base navigation 🟠 (extra items) · Core layout ✅ · Initial DB ✅ · Audit fields 🟡 (missing updatedBy, ActivityLog) · **≈ 80% done**.

**Phase 2 — Core Operational Modules (§26.7)**
Waste Flows 🟡 70% · Documentation ❌ 0% · Scope 1 🟡 35% · Scope 2 🟠 25% · **≈ 40% done overall**.

**Phase 3 — Extended Carbon and Analytics (§26.8)**
Scope 3 ❌ 0% · Production Emission Factor ❌ 0% · Analysis module ❌ 5% · Dashboard completion 🟡 45% · **≈ 10% done**.

**Phase 4 — Team and Regulatory Layer (§26.9)**
Team Overview 🟠 30% (wrong location) · Tasks ❌ 0% · Activity Tracking ❌ 0% · Regulations ❌ 0% · AI-assisted regs ❌ 0% · Basic AI assistant ❌ 0% · **≈ 10% done**.

---

## 5. Cross-Cutting Issues

These cut across every module and must be addressed once to avoid repeated remediation:

1. **Role naming alignment** (Spec §5): rename UI labels and API field names. Either redefine `MembershipRole` enum or add a presentational mapping layer.
2. **updatedBy across all entities** (§23.14): schema migration to add `updatedById String?` + `updatedBy User? @relation(...)` to every operational entity.
3. **Record Status enum** on carbon entries: add `recordStatus` field (DRAFT / ACTIVE / ARCHIVED).
4. **Entry Title on carbon entries**: currently fuel/electricity have no human-friendly name.
5. **Activity Log entity** and a `logActivity()` helper called from every server action.
6. **File storage layer**: choose cloud object store (recommend Cloudflare R2). This blocks Documentation + every module's "attach evidence" need.
7. **Edit actions**: every module has Create + Delete only; Edit is missing everywhere.
8. **Detail pages for carbon entries**: Scope 1 + Scope 2 (and future Scope 3 + PEF) need their own detail routes, not just list views.
9. **Export layer**: CSV + Excel exports on every list page.
10. **Factor traceability UI**: emission factor should be visible on entry forms and records, not hidden.

---

## 6. Priority Recommendations (What to Build Next)

Order influenced by spec's own phase logic and dependency graph:

**P0 — Foundational fixes (1-2 weeks)**
1. Rename roles in UI + add `updatedById` to all records (schema migration).
2. Add `ActivityLog` entity + `logActivity()` helper + instrument existing server actions.
3. Harden password rules; add VIEWER enforcement.
4. Align sidebar nav labels + remove Valorization + add placeholders for Documentation, Analysis, Regulations, Team Overview.
5. Add Edit action to Waste Flows, Scope 1 (FuelEntry), Scope 2 (ElectricityEntry), Sites.

**P1 — File storage + Documentation (2-3 weeks)**
6. Integrate Cloudflare R2 (or equivalent) + `Document` entity + multipart upload + secure download.
7. Documentation module (list + upload + preview + download + metadata).
8. Wire "attach document" into Waste Flows, Scope 1, Scope 2, Sites.

**P2 — Scope 2 correctness (1 week)**
9. Refactor ElectricityEntry → Scope2Entry: dual calc (location + market), Energy Type, Supplier factor support.
10. Add Entry Title, Source Reference, Record Status, Year, full factor metadata to Scope 1 + Scope 2 records.

**P3 — Analysis module (2-3 weeks)**
11. Build `/analysis` with 6-8 fixed charts + date/plant/scope filters + CSV/Excel export.
12. Rebalance Dashboard: keep KPIs + recent activity + alerts, remove the complex charts (move to Analysis).

**P4 — Scope 3 (3-4 weeks)**
13. Design polymorphic Scope3Entry + migrate seed factors + implement 6 categories.
14. Dynamic form rendering per category.

**P5 — Production Emission Factor (1-2 weeks)**
15. `ProductionEmissionFactor` entity + calc engine + scope inclusion + UI.

**P6 — Team Overview + Tasks (2-3 weeks)**
16. Move team management to top-level `/team-overview`.
17. `Task` entity + task CRUD + task-linkage throughout modules.
18. Add "My Tasks" + Open Tasks summary on Dashboard.

**P7 — Regulations (1-2 weeks)**
19. Regulation entity + CRUD + list/detail + filter.
20. Static regulation seed data for EU + PT (Maxtil's jurisdictions).

**P8 — AI + Imports (2-3 weeks)**
21. Rules-based insight generator on Dashboard (no LLM).
22. CSV/Excel import with column mapper + validator.
23. In-app assistant via Anthropic API.
24. AI-assisted regulations summaries.

**P9 — Compliance docs (parallel)**
25. Privacy Policy, Terms of Service, Data Processing Agreement, Subprocessor list, Security overview — before commercial rollout to Maxtil.

---

## 7. Key Files and Paths (for the gap-fix work)

Schema: `prisma/schema.prisma`
Auth: `src/lib/auth.ts`, `src/lib/session.ts`
Carbon calcs: `src/lib/carbon.ts`
Dashboard aggregation: `src/lib/dashboard.ts`
Sidebar nav: `src/components/app-sidebar.tsx`, `src/components/nav-main.tsx`
Carbon tabs: `src/components/carbon/carbon-tabs-nav.tsx`
Carbon actions: `src/app/(app)/carbon-footprint/actions.ts`
Waste flow actions: `src/app/(app)/waste-flows/actions.ts`
Settings/team actions: `src/app/(app)/settings/team/actions.ts`
Settings/sites actions: `src/app/(app)/settings/sites/actions.ts`
Admin actions: `src/app/admin/actions.ts`
Emission factor seed: `prisma/seeds/emission-factors.ts`
Seed orchestrator: `prisma/seed.ts`

Stub pages that need real implementations:
- `src/app/(app)/documents/page.tsx` → Documentation module
- `src/app/(app)/reporting/page.tsx` → Analysis module (rename route)
- `src/app/(app)/valorization/page.tsx` → delete
- `src/app/(app)/carbon-footprint/production/page.tsx` → Production EF module
- `src/app/(app)/carbon-footprint/value-chain/page.tsx` → Scope 3 module
- `src/app/(app)/carbon-footprint/overview/page.tsx` → delete (content → Dashboard)
- `src/app/(app)/carbon-footprint/waste-impact/page.tsx` → move to Scope 3 "Waste Generated in Operations"
- `src/app/(app)/settings/team/page.tsx` → migrate to `/team-overview`

New pages to create:
- `/regulations` + `/regulations/new` + `/regulations/[id]`
- `/team-overview` + `/team-overview/[userId]`
- `/analysis`
- `/documentation`
- `/carbon-footprint/scope-3` (replacing value-chain)
- `/carbon-footprint/production-emission-factor` (replacing production stub)
- Every module needs `/[module]/[id]/edit` for the missing Edit flows.

---

## 8. How to Verify This Analysis

1. Open `specs/RenAI_Specs.pdf` alongside this document.
2. For any row marked DONE, open the referenced file path and confirm the feature actually works (don't trust the column — trust the code).
3. For any row marked WRONG, compare the spec section to the code citation — should be unambiguous divergence.
4. For MISSING items, grep the codebase to confirm absence: `rg "Scope3"` → no results except the stub page; `rg "ActivityLog"` → nothing; `rg "Regulation"` → nothing.
5. End-to-end sanity check: try to attach a document to a waste flow in the running app. You can't — proves Documentation module is needed.
6. End-to-end sanity check 2: create two Scope 2 entries for the same month, then check the record — only one `kgCo2e` stored, confirming the dual-calc gap.
