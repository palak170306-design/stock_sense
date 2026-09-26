import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot-reloads modules on every edit. Creating a new
 * PrismaClient at module scope would open a fresh connection pool on each
 * reload and quickly exhaust Postgres's connection limit. Caching the client
 * on `globalThis` (which survives module reloads) means every reload reuses
 * the same pool.
 *
 * Prisma 7 talks to Postgres through a driver adapter; `PrismaPg` wraps the
 * standard `pg` driver.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // Postgres schema, "public" unless DATABASE_SCHEMA says otherwise (the test
  // suite uses its own schema so it never touches dev data). Two settings are
  // needed: `schema` makes Prisma's generated queries target it, and
  // search_path makes our raw SQL (unqualified table names in lib/stock)
  // resolve to it too. search_path is set EXPLICITLY even for "public": the
  // local PGlite-based `prisma dev` server shares one session across
  // connections, so a value left behind by another client must not leak in.
  const schema = process.env.DATABASE_SCHEMA || "public";
  const adapter = new PrismaPg(
    {
      connectionString: process.env.DATABASE_URL,
      // Optional pool cap. The local `prisma dev` server is single-session
      // and needs 1; leave unset for hosted Postgres (pg default: 10).
      max: process.env.DATABASE_POOL_MAX ? Number(process.env.DATABASE_POOL_MAX) : undefined,
      options: `-c search_path="${schema}"`,
    },
    { schema }
  );
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// In production each module is loaded once, so caching is unnecessary there.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
