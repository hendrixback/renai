import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Lazy Prisma client — deferred instantiation on first property access.
 *
 * Why: Next.js `next build` imports every page module to collect route
 * metadata. If the module-level `new PrismaClient()` runs during build,
 * it throws when DATABASE_URL isn't set (Railway only injects env vars
 * at runtime, not at build time). The Proxy defers construction until
 * the first real call at request time.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    const value = Reflect.get(globalForPrisma.prisma, prop);
    if (typeof value === "function") {
      return value.bind(globalForPrisma.prisma);
    }
    return value;
  },
});
