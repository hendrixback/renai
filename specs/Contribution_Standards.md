# RenAI — Contribution Standards

> **Purpose**: the non-negotiables every contributor (human or AI) follows. If code does not meet these standards, it is not merged.
> **Principle**: consistency is a feature. When every module looks the same, onboarding is fast, bugs are rare, and refactors are safe.

---

## 1. Non-negotiables (zero-tolerance list)

These are hard rules. Breaking any of them blocks merge:

1. **No mocks in production code**. Mocks live only in `tests/`. No `if (process.env.NODE_ENV === 'development')` shortcuts that return fake data.
2. **No hardcoded IDs, tokens, or URLs**. Use env, config, or DB seed.
3. **No `@ts-ignore` or `@ts-expect-error`** without a linked issue number and explanation.
4. **No `any` types** except when interfacing with an untyped third-party lib (isolated to a single-line cast, comment explaining why).
5. **No committed secrets.** `.env` is git-ignored. Pre-commit hook scans for common secret patterns.
6. **No `console.log`** in committed code. Use `logger` from `lib/logger.ts`.
7. **No hardcoded user-facing strings** outside `messages/en.json`. Wrap in `t('key')`.
8. **No direct Prisma imports in components.** DB access goes through `lib/services/`.
9. **No destructive prod actions** without explicit approval (migrations, bulk updates, deletes).
10. **No `git push --force` to main/master.** Rebases on feature branches OK.
11. **No merge without passing CI** (types + lint + tests + e2e smoke). No `--no-verify` bypasses.
12. **No schema change without a migration file** and a reversible plan documented in the PR.

---

## 2. Every new entity checklist

When adding a new Prisma model:

- [ ] `id String @id @default(cuid())`
- [ ] `companyId String` (FK to Company, `onDelete: Cascade`) — unless it's a system-wide entity
- [ ] Indexes on common query fields, especially `@@index([companyId, ...])` patterns
- [ ] `createdAt DateTime @default(now())`
- [ ] `updatedAt DateTime @updatedAt`
- [ ] `createdById String?` + relation (`onDelete: SetNull`)
- [ ] `updatedById String?` + relation (`onDelete: SetNull`)
- [ ] `deletedAt DateTime?` (soft-delete) unless entity is ephemeral
- [ ] `recordStatus` enum if the entity has a lifecycle (DRAFT / ACTIVE / ARCHIVED)
- [ ] `reportingYear Int?` + `reportingMonth Int?` if the entity represents time-bound data
- [ ] Migration file reviewed as SQL before applying
- [ ] Zod schema in `lib/schemas/{entity}.schema.ts`
- [ ] Service in `lib/services/{entity}.ts` (never access Prisma from components/actions directly)
- [ ] Factory in `tests/factories/{entity}.factory.ts`
- [ ] Seeded sample in `prisma/seed.ts` for local dev

---

## 3. Every new server action template

```typescript
// app/(app)/{module}/actions.ts
"use server";

import { requireContext } from "@/lib/auth";
import { requireRole } from "@/lib/auth/require-role";
import { logActivity } from "@/lib/activity/log-activity";
import { revalidatePath } from "next/cache";
import { someEntitySchema } from "@/lib/schemas/some-entity.schema";
import { SomeEntityService } from "@/lib/services/some-entity";
import type { SomeEntityInput } from "@/lib/schemas/some-entity.schema";

export async function createSomeEntity(data: SomeEntityInput) {
  // 1. Context + permission
  const ctx = await requireContext();
  requireRole(ctx, "COLLABORATOR");

  // 2. Validate
  const parsed = someEntitySchema.parse(data);

  // 3. Delegate to service
  const entity = await SomeEntityService.create(ctx, parsed);

  // 4. Audit
  await logActivity(ctx, {
    type: "RECORD_CREATED",
    module: "some-module",
    recordId: entity.id,
    description: `Created ${entity.name}`,
  });

  // 5. Revalidate
  revalidatePath("/some-module");

  // 6. Return
  return entity;
}
```

**Checklist per action**:
- [ ] `"use server"` directive
- [ ] `requireContext()` at top
- [ ] `requireRole(ctx, minRole)` permission check
- [ ] Zod validation on input (from `lib/schemas/`)
- [ ] Delegated to service (no direct Prisma)
- [ ] `logActivity` called inside the same logical operation
- [ ] `revalidatePath` called after mutations
- [ ] Returns typed data (or throws typed error)
- [ ] Unit test for happy path + permission denied + validation error
- [ ] No business logic in the action — that's the service's job

---

## 4. Every new module checklist

When adding a new module (e.g. `/regulations`):

### Routes
- [ ] `/{module}/page.tsx` — list page (uses `<ResourceListPage>`)
- [ ] `/{module}/[id]/page.tsx` — detail page (uses `<ResourceDetailPage>`)
- [ ] `/{module}/[id]/edit/page.tsx` — edit page (uses `<ResourceEditForm>`)
- [ ] `/{module}/new/page.tsx` — create page (uses `<ResourceEditForm>`)
- [ ] `/{module}/layout.tsx` — if sub-navigation needed
- [ ] `/{module}/loading.tsx` — skeleton loader
- [ ] `/{module}/error.tsx` — error boundary with report-to-sentry

### Actions (server)
- [ ] `createX`, `updateX`, `deleteX`, `archiveX` (if applicable)
- [ ] Each follows the template in §3

### Service
- [ ] `lib/services/{module}.ts` with domain logic
- [ ] All DB access here; nowhere else

### Schema
- [ ] `lib/schemas/{module}.schema.ts` with Zod schemas
- [ ] Export `type {Module}Input = z.infer<typeof ...>` for reuse

### Components
- [ ] `src/components/{module}/` for module-specific components
- [ ] Each component has a display name and is typed
- [ ] Forms use react-hook-form + zodResolver (no uncontrolled forms for complex data)

### Tests
- [ ] Unit tests for service methods (≥ 80% coverage)
- [ ] Unit tests for calculations (≥ 90% coverage)
- [ ] Integration test for each action
- [ ] E2E test for the golden path

### Navigation
- [ ] Added to `nav-main.tsx` with proper icon + role gate
- [ ] Feature flag guard for pre-release modules

### i18n
- [ ] All strings in `messages/en.json`
- [ ] Component uses `useTranslations()` or `getTranslations()`

### Accessibility
- [ ] All interactive elements reachable by keyboard
- [ ] Semantic HTML (button vs div onClick)
- [ ] aria-labels on icon-only buttons
- [ ] axe passes with zero violations

### Documentation attachments (if applicable)
- [ ] Detail page includes `<DocumentAttachments module="..." recordId={id} />`
- [ ] Activity history slot: `<ActivityHistoryList module="..." recordId={id} />`
- [ ] Related tasks slot: `<RelatedTasks module="..." recordId={id} />`

### Export
- [ ] List page has `<ExportMenu>` (CSV / Excel / PDF)

---

## 5. Testing standards

### Coverage targets (enforced in CI)
- `lib/calculations/**`: ≥ 90% line coverage
- `lib/services/**`: ≥ 80%
- `app/**/actions.ts`: ≥ 70%
- `src/components/**`: ≥ 50% (smoke tests on complex components)
- **Overall**: ≥ 70%

### Unit tests
- One test file per source file.
- `{file}.test.ts` alongside source.
- Arrange-Act-Assert structure.
- Factories over mocks where possible (`userFactory()` not `jest.mock('./user')`).
- No test should depend on another test's side effects.

### Integration tests
- Hit a real DB (test database).
- Each test wrapped in a transaction that rolls back.
- Don't mock Prisma.

### E2E tests (Playwright)
- Golden paths only — don't replicate unit coverage.
- Use `data-testid` for stable selectors (never CSS classes).
- Seed data via factories before test, clean after.
- Run on chromium for CI speed; chromium + firefox + webkit on pre-release.

### Test data
- No real customer data in tests, ever.
- Use realistic ranges (emissions between 0–10000 kgCO₂e, not 999999999).
- Seed the factor catalog in test setup.

---

## 6. Security checklist (per PR)

- [ ] Every server action has `requireContext` + `requireRole`
- [ ] Every DB query is scoped by `companyId` where applicable
- [ ] No SQL concatenation (use Prisma or parameterised queries)
- [ ] No raw HTML injection — sanitise all untrusted content via DOMPurify before rendering
- [ ] User input validated via Zod
- [ ] File uploads: MIME check + size cap + tenant prefix
- [ ] File downloads: permission check before signed URL generation
- [ ] Secrets not committed (pre-commit hook check)
- [ ] CSP header not weakened
- [ ] Rate limit applied to new mutation endpoints

---

## 7. Performance budget (per-page, p95)

- First Contentful Paint < 1.2s
- Largest Contentful Paint < 2.0s
- Time to Interactive < 3.0s
- Total Blocking Time < 300ms
- Cumulative Layout Shift < 0.1
- First-load JS per route < 300KB gzipped
- DB query time < 100ms (individual query)
- Full server response < 500ms (p95)

PRs that regress any metric must include justification or improvement plan.

---

## 8. Accessibility standards

### Required for every page
- Semantic HTML5 (`<main>`, `<nav>`, `<article>`, `<section>`)
- One `<h1>` per page
- Alt text on all informational images
- ARIA labels on icon-only buttons
- Form labels associated with inputs (`<label htmlFor>`)
- Focus visible on all interactive elements
- Keyboard navigation works end-to-end
- Colour contrast meets WCAG AA (4.5:1 body, 3:1 large text)

### Forbidden
- `onClick` on non-button elements without keyboard handler + role
- `autofocus` on non-modal fields
- Negative `tabIndex` except for managed focus
- `div` with `onClick` — use `<button>` with styling

### Tooling
- `eslint-plugin-jsx-a11y` enforced
- axe-core in E2E suite
- Manual keyboard walkthrough per phase

---

## 9. Git hygiene

### Commit messages
Format: `type(scope): subject`
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `style`
- Scope: module or area (e.g. `scope1`, `auth`, `docs`)
- Subject: imperative, < 72 chars
- Body (optional): why, not what

Examples:
```
feat(scope3): add polymorphic schema for Scope 3 entries
fix(auth): prevent session fixation via HMAC rotation
refactor(carbon): extract emission factor lookup to dedicated service
```

### Branches
- `main`: protected; no direct pushes
- `feat/{scope}-{short-description}`: feature branches
- `fix/{scope}-{short-description}`: bug fix branches

### PRs
- Title follows commit convention
- Description includes: what, why, how verified, screenshots/GIFs for UI, migration notes if schema changed
- Linked issue
- Checklist: tests added, types pass, lint passes, a11y checked, i18n strings added
- At least one approval before merge (self-approval on solo sessions OK with discipline)
- Squash-merge (one commit per feature in main)

---

## 10. Error handling

### Server actions
- Validated user errors → throw `UserFacingError` with safe message
- Unexpected errors → let them propagate; middleware catches + Sentry-reports + generic "something went wrong" to client
- Never expose stack traces to browser in prod

### Components
- Error boundaries at page level (`error.tsx`)
- Form errors displayed inline next to the field
- Network errors: show retry button + "check your connection" message

### Logging
- `logger.info({ event, ...context })` for business events
- `logger.warn({ event, ...context })` for recoverable weirdness
- `logger.error({ event, err, ...context })` for unexpected — auto-Sentry
- Never log secrets or PII at info level

---

## 11. Dependency hygiene

### Adding a dependency
- [ ] Does the std lib / existing dep solve it?
- [ ] What's the bundle size delta? (use `pnpm why` + `bundlephobia`)
- [ ] Is it actively maintained? (last commit < 6 months, > 100 stars, reasonable issue rate)
- [ ] License compatible? (MIT/Apache/ISC good; GPL needs review)
- [ ] Does it run server-side only or client-side too?
- [ ] Link ADR if it's a significant choice

### Updating a dependency
- Major version bumps: separate PR with changelog review
- Minor/patch: can be grouped; verify CI green
- Dependabot / Renovate automates patch updates; major requires human

---

## 12. Code review guidance

Reviewers ask:

1. **Correctness**: does it do what the PR says? Any edge cases missed?
2. **Security**: any auth / tenant-isolation leaks?
3. **Performance**: any N+1 query? Unnecessary re-render? Large bundle?
4. **Testability**: can this be tested? Are the tests meaningful?
5. **Clarity**: would a new dev understand this in 6 months?
6. **Consistency**: does it follow the patterns in this doc?
7. **Audit**: is `logActivity` called?
8. **i18n**: hardcoded strings?
9. **a11y**: interactive elements keyboard-reachable?

Reviewers do **not** rewrite. Suggest changes; let the author own the code.

---

## 13. Documentation expectations

- Every public function (exported from `lib/`) has a JSDoc `@param`, `@returns`, `@throws`.
- Every non-trivial module (Scope 3, Analysis, Documentation) has a `README.md` explaining its data flow, calc methodology, and edge cases.
- Every emission factor in seed data cites source (DEFRA, EPA, IEA, etc.).
- Every schema migration has a top-comment explaining what + why + rollback plan.

---

## 14. Release process

- Feature PRs merge to main via squash-merge.
- Main auto-deploys to staging.
- After QA on staging (manual or automated E2E), tag release: `v0.X.Y`.
- Tag triggers prod deploy (with approval gate).
- Prod deploy posts release notes to Slack / email / whatever channel the team uses.
- Any hotfix: branch off main, PR, fast review, merge, tag.

---

## 15. Onboarding new devs (future)

A new dev should be able to:
- Day 1: Run locally, seed DB, see login screen.
- Day 2: Understand the architecture from `Architecture_Decisions.md`.
- Day 3: Ship their first PR (simple fix or copy tweak).
- Week 2: Own a module start-to-finish.

If onboarding takes longer, this doc is broken and needs updating.
