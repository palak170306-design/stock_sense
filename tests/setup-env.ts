import { testDatabase } from "./test-db";

/**
 * Runs in each test worker BEFORE test files are imported, so when
 * lib/prisma.ts creates its client it already points at the test schema.
 */
const { url, schema } = testDatabase();
process.env.DATABASE_URL = url;
process.env.DATABASE_SCHEMA = schema;
// One connection: tests are sequential, and the local `prisma dev` server
// is single-session.
process.env.DATABASE_POOL_MAX = "1";
