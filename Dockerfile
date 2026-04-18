# syntax=docker/dockerfile:1.7
# Multi-stage production Dockerfile for Next.js 16 + Prisma 7 (pg adapter).
# Runtime stage uses Next.js `standalone` output for a minimal image.

# ── 1. Base ────────────────────────────────────────────────────────
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ── 2. Dependencies ────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `postinstall` runs `prisma generate` which needs the schema present.
RUN npm ci

# ── 3. Build ───────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Regenerate the Prisma client with the current schema so it lives inside
# the build's node_modules/.prisma (picked up by the standalone output).
RUN npx prisma generate
RUN npm run build

# ── 4. Runtime ─────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Static assets + standalone server output.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma CLI + engines for running migrations at container startup.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=deps /app/node_modules/@prisma/engines-version ./node_modules/@prisma/engines-version
COPY --from=deps /app/node_modules/@prisma/config ./node_modules/@prisma/config
COPY --from=deps /app/node_modules/dotenv ./node_modules/dotenv

USER nextjs
EXPOSE 3000

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
