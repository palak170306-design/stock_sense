// Prisma CLI configuration (migrate, generate, seed, studio).
// The CLI does not load .env on its own, hence the dotenv import.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Run by `npx prisma db seed`.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrations) should use a DIRECT connection. On Neon/Supabase
    // the app's DATABASE_URL is usually the *pooled* (PgBouncer) URL, which
    // breaks the session-level advisory lock `migrate` takes; set DIRECT_URL
    // to the unpooled URL there. Locally DATABASE_URL is already direct.
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
    // Optional. Only needed where Prisma cannot CREATE DATABASE its own
    // temporary shadow DB (e.g. the local `prisma dev` server).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
