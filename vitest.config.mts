import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Test runner config.
 *
 * - Database tests run against an ISOLATED Postgres schema (default
 *   "stocksense_test") that global-setup recreates from the migrations on
 *   every run, so tests never touch dev or production data.
 * - Files run one at a time (fileParallelism: false) because they share that
 *   one schema and reset it between tests.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
