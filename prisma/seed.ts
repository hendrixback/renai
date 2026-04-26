import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { emissionFactors } from "./seeds/emission-factors";
import { wasteCategories } from "./seeds/waste-categories";
import { wasteCodes, CATALOG_VERSION } from "./seeds/waste-codes";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL (or DIRECT_URL) is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedCatalog() {
  // WasteCategory — idempotent upsert on slug.
  for (const c of wasteCategories) {
    await prisma.wasteCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: {
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
      },
    });
  }
  console.log(`✓ Seeded ${wasteCategories.length} waste categories`);

  // WasteCode — idempotent upsert on code (primary key).
  for (const w of wasteCodes) {
    await prisma.wasteCode.upsert({
      where: { code: w.code },
      create: { ...w, catalogVersion: CATALOG_VERSION },
      update: {
        displayCode: w.displayCode,
        description: w.description,
        chapterCode: w.chapterCode,
        subChapterCode: w.subChapterCode,
        isHazardous: w.isHazardous,
        isMirrorEntry: w.isMirrorEntry,
        catalogVersion: CATALOG_VERSION,
      },
    });
  }
  console.log(`✓ Seeded ${wasteCodes.length} waste codes (${CATALOG_VERSION})`);

  // Emission factors — idempotent via findFirst + update/create (Prisma 7
  // rejects null in composite-unique `where`, so we can't upsert directly
  // when companyId is null).
  for (const ef of emissionFactors) {
    const existing = await prisma.emissionFactor.findFirst({
      where: {
        category: ef.category,
        subtype: ef.subtype,
        region: ef.region,
        year: ef.year,
        companyId: null,
      },
      select: { id: true },
    });
    const data = {
      unit: ef.unit,
      kgCo2ePerUnit: ef.kgCo2ePerUnit,
      source: ef.source,
      notes: ef.notes ?? null,
    };
    if (existing) {
      await prisma.emissionFactor.update({ where: { id: existing.id }, data });
    } else {
      await prisma.emissionFactor.create({
        data: {
          category: ef.category,
          subtype: ef.subtype,
          region: ef.region,
          year: ef.year,
          ...data,
        },
      });
    }
  }
  console.log(`✓ Seeded ${emissionFactors.length} emission factors`);
}

async function seedAdminAndCompany() {
  // Defense-in-depth: this seed is dev-only by design (the production
  // Dockerfile only runs `prisma migrate deploy`, not `db:seed`). If
  // someone wires it into a prod task by mistake, fail loudly rather
  // than create a known-credential admin in customer infra.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "seedAdminAndCompany() refuses to run in NODE_ENV=production. This script is dev-only.",
    );
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@renai.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
  const passwordSource = process.env.SEED_ADMIN_PASSWORD
    ? "env (SEED_ADMIN_PASSWORD)"
    : "default";
  const companySlug = "renai-demo";

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10),
    },
    update: {},
  });

  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    create: {
      slug: companySlug,
      name: "RenAI Demo Co.",
      country: "PT",
    },
    update: {},
  });

  await prisma.membership.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    create: {
      userId: user.id,
      companyId: company.id,
      role: "OWNER",
    },
    update: {},
  });

  // Default site so the WasteFlow form has something to select.
  const existingSite = await prisma.site.findFirst({
    where: { companyId: company.id, name: "Main Plant" },
  });
  if (!existingSite) {
    await prisma.site.create({
      data: {
        companyId: company.id,
        name: "Main Plant",
        city: "Lisbon",
        country: "PT",
      },
    });
  }

  // Never echo the password — credentials in CI logs are an audit
  // finding waiting to happen. Devs who rely on the default know it's
  // documented in this file; everyone else sets SEED_ADMIN_PASSWORD.
  console.log(`✓ Admin user: ${email} (password source: ${passwordSource})`);
  console.log(`✓ Company: ${company.name} (${company.slug})`);
}

async function main() {
  await seedCatalog();
  await seedAdminAndCompany();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
