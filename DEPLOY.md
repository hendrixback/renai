# Deploying Renai to Railway

This guide walks through connecting the GitHub repo to a fresh Railway
project, attaching a managed Postgres plugin, and getting a public URL.

> Target stack: Next.js 16 + Prisma 7 (pg driver adapter) + Postgres 17,
> containerised via the root `Dockerfile`.

## Prerequisites

- GitHub repo pushed (e.g. `github.com/hendrixback/renai`)
- Railway account (free tier is fine to start)
- `railway` CLI is optional — the dashboard is enough

---

## 1. Create the project

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** →
   pick `hendrixback/renai`.
2. Railway reads `railway.toml` + `Dockerfile` and starts building.
3. The first build will boot but the app will error on missing
   `DATABASE_URL` + `SESSION_SECRET` — expected. Fix in step 2.

## 2. Attach Postgres

1. In the project, click **+ Create** → **Database** → **Add PostgreSQL**.
2. Open the Postgres service → **Variables** tab → copy the value of
   `DATABASE_URL` (the plugin exposes it automatically).
3. Open the **web** service (the one from GitHub) → **Variables** →
   add a **reference** variable:

   | Key            | Value                                          |
   |----------------|------------------------------------------------|
   | `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` (reference)      |

   Using the reference form means Railway auto-updates this if the
   Postgres connection string rotates.

## 3. Set the session secret

Generate a cryptographically random string locally:

```bash
openssl rand -base64 32
```

In the web service → **Variables**, add:

| Key              | Value                              |
|------------------|------------------------------------|
| `SESSION_SECRET` | *(paste the random value)*          |

Never reuse the dev-env secret. Rotating this logs everyone out.

## 4. Run the initial schema push + seed

Railway gives each service a shell. Open the web service → **Settings**
→ **Service** → **Custom Start Command** is **empty** (the Dockerfile's
`CMD` handles it). To run the one-off migrations:

**Option A — Railway shell (recommended):**

Open the web service → **⋮** menu → **Shell** and run:

```bash
npx prisma db push
npm run db:seed
```

**Option B — Local with production DATABASE_URL:**

```bash
export DATABASE_URL="<paste the Postgres URL from step 2>"
npx prisma db push
npm run db:seed
```

> ⚠️ The seed creates `admin@renai.local` / `admin12345`.
> **Change it** in `prisma/seed.ts` before running in prod, or sign
> in once and then create a real admin + delete the default one.

## 5. Expose a public URL

Web service → **Settings** → **Networking** → **Generate Domain**.
You'll get something like `https://renai-production.up.railway.app`.

Custom domain? Same panel → **Add Custom Domain** → follow DNS steps.

## 6. Verify

- `https://<your-url>/login` → should render the login page
- Sign in with your seeded admin → should reach `/dashboard`
- `/waste-flows` → seeded LoW codes should appear in the combobox on
  `/waste-flows/new`

---

## Environment variables — full reference

| Key               | Required | Notes                                      |
|-------------------|----------|--------------------------------------------|
| `DATABASE_URL`    | Yes      | Postgres connection (Railway plugin ref).  |
| `DIRECT_URL`      | No       | Non-pooled URL for migrations if you add PgBouncer later. |
| `SESSION_SECRET`  | Yes      | 32+ random bytes. Rotating logs users out. |
| `NODE_ENV`        | Auto     | Set to `production` by the Dockerfile.     |
| `PORT`            | Auto     | Railway injects; Dockerfile defaults to 3000. |

---

## Ongoing deploys

Every push to `main` in the GitHub repo triggers a Railway rebuild.
No manual steps. Schema changes require running `prisma db push` (or a
proper `prisma migrate deploy` workflow when you add migrations).

## Future additions the next maintainer will want

- **File storage** for the `/documents` page — Cloudflare R2 is the
  cheapest S3-compatible option and has free egress. Set
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET`.
- **AI provider key** when the AI features land — e.g. `ANTHROPIC_API_KEY`
  or `GOOGLE_GENERATIVE_AI_API_KEY`.
- **Workers service** — a second Railway service pointing to the same
  repo can run background jobs (AI extraction, cron). Same Dockerfile,
  different start command.
- **Prisma Migrate** — swap `db:push` for a migrations workflow before
  the schema is mutable by other engineers.
