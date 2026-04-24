# RenAI — Railway deployment checklist

Required setup on the Railway service **before** (or on the first)
deploy of the v0.2 branch. Skipping any of these causes a specific,
predictable failure — noted per item.

---

## 1. Postgres plugin (required)

You already have this — it's what ran migration 0001. No action needed.

`DATABASE_URL` is injected into the Next.js service automatically.
Migrations 0002, 0003, 0004 apply on the next container boot via the
Dockerfile CMD (`prisma migrate deploy && node server.js`).

**What you'll see in the deploy log:**
```
▶ Running database migrations…
Applying migration `20260424_phase1_foundation`
Applying migration `20260424_documentation`
Applying migration `20260424_scope2_dual_calc`
✓ Migrations up to date. Starting server…
```

**If a migration fails:** container exits non-zero → Railway retries
(up to 3 per `railway.toml`) → deploy fails with the Prisma error
visible in the Railway deploy log. No code changes needed; the
migration is idempotent, so fixing the issue and redeploying picks up
where it left off.

---

## 2. Persistent Volume for file storage (required before customers upload)

Documentation module needs durable disk. Without this, uploads land
in the container's `/tmp` and vanish on every redeploy.

**Steps in the Railway dashboard:**

1. Open the Next.js service.
2. **Volumes** tab → **+ New Volume**.
3. Mount path: `/data/storage` (or any absolute path; remember what
   you pick).
4. Size: start at 5GB — plenty for ~1000 PDFs. Grow later.
5. **Variables** tab on the same service → add:
   - `STORAGE_ROOT=/data/storage` (match the volume's mount path).

**How the app behaves if you skip this:**
- Uploads still succeed to the container's local `/tmp`.
- A loud `storage.config.missing_root` error is logged to Sentry / Axiom
  on the first upload request after boot so you can't miss it.
- Files disappear on every redeploy — customers who uploaded will
  see 404 the next time they try to download.

---

## 3. Session secret (required)

Session cookies are HMAC-signed with `SESSION_SECRET`. If not set the
app throws on first auth attempt.

**Steps:**
1. Generate a random 48+ char secret:
   `openssl rand -base64 48`
2. Service **Variables** → add `SESSION_SECRET=<that value>`.

If already set from v0.1, leave it — rotating invalidates existing
sessions (forces all users to re-log-in).

---

## 4. App origin URL (required for invitation emails)

Team invitations include a signup URL. The app reads it from env:

- `PUBLIC_APP_URL=https://your-railway-domain.up.railway.app`

If unset, invitations fall back to a relative `/signup?token=…` URL
which breaks the moment an Admin copies the link into a different
tab / email client.

---

## 5. Optional — feature flags

Everything listed below is a post-MVP module currently stubbed behind
a flag. Leave unset (default off) unless you want to preview an
in-progress module:

| Env var | Default | When to enable |
|---|---|---|
| `NEXT_PUBLIC_FLAG_SCOPE3` | off | Once Scope 3 forms ship. |
| `NEXT_PUBLIC_FLAG_PRODUCTION_INTENSITY` | off | Once PEF module ships. |
| `NEXT_PUBLIC_FLAG_ANALYSIS` | off | Once Analysis module ships. |
| `NEXT_PUBLIC_FLAG_REGULATIONS` | off | Once Regulations CRUD ships. |
| `NEXT_PUBLIC_FLAG_TEAM_OVERVIEW` | off | Once Team Overview ships. |
| `NEXT_PUBLIC_FLAG_TASKS` | off | Once Tasks land. |
| `NEXT_PUBLIC_FLAG_AI_ASSISTANT` | off | Once AI chat lands. |
| `NEXT_PUBLIC_FLAG_IMPORT_EXPORT` | off | Once bulk import lands. |
| `NEXT_PUBLIC_FLAG_DOCUMENTATION_DISABLED` | off | **Emergency kill-switch for Documentation** — set to `true` to hide the module without a redeploy. |

---

## 6. Optional — observability

Not blocking deploy but recommended before shipping to a real
customer. All optional.

| Env var | What it enables |
|---|---|
| `SENTRY_DSN` | Server-side error reporting. |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser error reporting. |
| `AXIOM_TOKEN` / `AXIOM_DATASET` | Structured log ingestion (Pino JSON output on stdout is already emitted; Axiom or any log collector picks it up). |

---

## Deploy preflight (quick visual)

Before you click Deploy on Railway:

- [ ] Postgres plugin attached, `DATABASE_URL` populated.
- [ ] Persistent Volume mounted at `/data/storage` on the Next.js service.
- [ ] `STORAGE_ROOT=/data/storage` set.
- [ ] `SESSION_SECRET` set (≥ 48 random chars).
- [ ] `PUBLIC_APP_URL` set to the service's public domain.
- [ ] (Optional) Sentry / Axiom env vars if you want production visibility.

First deploy after merging the v0.2 branch will:
1. Build the Docker image (≈ 3–5 min).
2. Start the container, run `prisma migrate deploy` (applies 0002 +
   0003 + 0004).
3. Start Next.js.
4. Hit `/login` for health check.
5. Route traffic to the new container.

Total downtime from redeploy start → new container serving: ≈ 30s.
