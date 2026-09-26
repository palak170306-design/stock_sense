import { execSync } from "node:child_process";
import { Client } from "pg";
import { testDatabase } from "./test-db";

/**
 * Runs once before the whole suite: drop and recreate the test schema, then
 * apply every migration to it with `prisma migrate deploy`, exactly as a
 * production deploy would. Tests therefore run against the real schema,
 * including the CHECK constraints added in raw migration SQL.
 */
export default async function setup() {
  const { url, schema, prismaCliUrl } = testDatabase();

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.end();

  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: prismaCliUrl, DIRECT_URL: prismaCliUrl },
  });
}
