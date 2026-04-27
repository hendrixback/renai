/**
 * Standalone seed script — populate the starter regulation register
 * for a single company. Useful when onboarding a new tenant whose
 * Regulations module needs a head start, without re-running the full
 * dev seed (which seeds the renai-demo company and admin).
 *
 * Usage:
 *   npx tsx prisma/seeds/seed-regulations-for-company.ts --slug=<company-slug>
 *   npx tsx prisma/seeds/seed-regulations-for-company.ts --id=<companyId>
 *
 * Behaviour:
 *  - Finds the company by slug or id; aborts if neither resolves.
 *  - Idempotent: refuses to insert if the company already has any
 *    non-deleted regulation. Re-runs are safe no-ops.
 *  - Attributes createdBy/updatedBy to the company's first OWNER
 *    membership (or any ADMIN, falling back to any membership). The
 *    audit trail picks a real human, not a system user.
 *  - Refuses to run in NODE_ENV=production unless ALLOW_PROD_SEED=1
 *    is set explicitly. The intended workflow against Railway is to
 *    set DATABASE_URL to the prod URL on a one-off invocation; the
 *    extra env flip is a deliberate "yes I mean it" guard.
 *
 * Examples:
 *   # Local dev (against the docker-compose Postgres)
 *   npx tsx prisma/seeds/seed-regulations-for-company.ts --slug=renai-demo
 *
 *   # Railway prod (READ THE PROJECT README BEFORE RUNNING)
 *   DATABASE_URL="postgresql://…railway…" \
 *     ALLOW_PROD_SEED=1 \
 *     NODE_ENV=production \
 *     npx tsx prisma/seeds/seed-regulations-for-company.ts --slug=maxtil
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { regulationsSeed } from "./regulations";

function parseArgs(): { slug?: string; id?: string } {
  const out: { slug?: string; id?: string } = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--(slug|id)=(.+)$/);
    if (m) {
      const key = m[1] as "slug" | "id";
      out[key] = m[2];
    }
  }
  return out;
}

async function main() {
  const { slug, id } = parseArgs();
  if (!slug && !id) {
    console.error(
      "Pass --slug=<company-slug> or --id=<companyId> to identify the target company.",
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
    console.error(
      "Refusing to run against a production-tagged environment. Set ALLOW_PROD_SEED=1 to override.",
    );
    process.exit(1);
  }

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL (or DIRECT_URL) is not set.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const company = id
      ? await prisma.company.findUnique({ where: { id } })
      : await prisma.company.findUnique({ where: { slug: slug! } });

    if (!company) {
      console.error(
        `No company found with ${id ? `id=${id}` : `slug=${slug}`}.`,
      );
      process.exit(1);
    }

    const existing = await prisma.regulation.count({
      where: { companyId: company.id, deletedAt: null },
    });
    if (existing > 0) {
      console.log(
        `⏭  ${company.name} (${company.slug}) already has ${existing} regulation(s). No-op.`,
      );
      return;
    }

    // Pick a real user to attribute the seed to. Prefer OWNER → ADMIN →
    // anyone with a membership in this company. The audit trail wants a
    // human, not a system user.
    const membership = await prisma.membership.findFirst({
      where: { companyId: company.id },
      orderBy: [{ role: "asc" }], // OWNER < ADMIN < MEMBER < VIEWER alphabetically — good enough fallback
      select: { userId: true, role: true },
    });
    if (!membership) {
      console.error(
        `Company ${company.name} has no memberships — can't attribute the seed to a user. Invite an Owner first.`,
      );
      process.exit(1);
    }

    for (const reg of regulationsSeed) {
      await prisma.regulation.create({
        data: {
          companyId: company.id,
          createdById: membership.userId,
          updatedById: membership.userId,
          title: reg.title,
          type: reg.type,
          geography: reg.geography,
          topic: reg.topic,
          summary: reg.summary,
          sourceReference: reg.sourceReference,
          effectiveDate: reg.effectiveDate,
          regulatoryStatus: reg.regulatoryStatus,
          appliesToUs: reg.appliesToUs,
          priorityLevel: reg.priorityLevel,
        },
      });
    }

    console.log(
      `✓ Seeded ${regulationsSeed.length} starter regulations for ${company.name} (${company.slug}). Attributed to user ${membership.userId} (${membership.role}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
