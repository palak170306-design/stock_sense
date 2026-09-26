import "dotenv/config";

/**
 * Where the test suite's database lives.
 *
 *   TEST_DATABASE_URL     Postgres to test against (falls back to DATABASE_URL)
 *   TEST_DATABASE_SCHEMA  schema to (re)create for tests (default stocksense_test)
 *
 * Only that schema is ever dropped/recreated, never "public".
 */
export function testDatabase() {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL (or DATABASE_URL) to run the tests.");
  const schema = process.env.TEST_DATABASE_SCHEMA ?? "stocksense_test";
  if (!/^[a-z_][a-z0-9_]*$/.test(schema) || schema === "public") {
    throw new Error(`Refusing to use schema "${schema}" for tests.`);
  }
  // Prisma CLI selects the schema through the ?schema= URL parameter.
  const withSchema = new URL(url);
  withSchema.searchParams.set("schema", schema);
  return { url, schema, prismaCliUrl: withSchema.toString() };
}
