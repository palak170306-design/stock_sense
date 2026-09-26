# StockSense

Inventory management for small warehouses: products, warehouses and locations,
internal transfers, stock adjustments, a complete stock ledger, and a KPI
dashboard with low-stock alerts. Two roles: **managers** change things,
**staff** see everything.

**Stack:** Next.js 16 (App Router, TypeScript) · PostgreSQL · Prisma 7 · Tailwind CSS 4 · Vitest

---

## The one idea: everything is a stock move

StockSense never stores "quantity on hand". There is no `quantity` column to
increment or decrement anywhere. Every change in stock is recorded as a
**StockMove**: *N units of product P went from location A to location B*.

```
receipt     Vendors (virtual)    → WH/Stock            +50
delivery    WH/Stock             → Customers (virtual) −20
transfer    WH/Stock             → WH/Shelf A           10 (total unchanged)
adjustment  WH/Stock             → Inventory Loss       −3 (count was short)
```

**Stock on hand is derived:** the sum of `DONE` moves into a location minus
the sum of `DONE` moves out of it (`getStockOnHand()` in `lib/stock/index.ts`).

Why this design:

- **One source of truth.** A stored counter can drift from reality (a crashed
  request, two updates racing, a manual edit). A ledger can't, because the
  number *is* the history.
- **A free audit trail.** "Why is stock 17?" is answered by *Move history*.
- **Time travel.** Stock on any past date = the sum of moves up to that date.
- **One model for every operation.** Receipts, deliveries, transfers and
  adjustments differ only in which locations they use.

Supporting concepts:

| Concept | What it is |
|---|---|
| **Location types** | `INTERNAL` locations (shelves, zones) hold stock you own. `VENDOR`, `CUSTOMER` and `INVENTORY_LOSS` are *virtual*: the other side of stock entering, leaving, or being written off. Quantity is never created or destroyed; it only moves. |
| **StockDocument** | The paperwork around moves (e.g. transfer `WH/INT/0003` with 3 lines). Users create, validate or cancel documents; each line is a StockMove. |
| **Status** | `DRAFT → WAITING → READY → DONE`, or `CANCELED`. **Only `DONE` moves count.** Validation flips a document's moves to `DONE` in one transaction. |
| **Adjustment** | You enter a physical count. The app books the *difference* (counted − recorded) as one move to or from `INVENTORY_LOSS`, so on-hand equals the count afterwards. |

### Correctness under concurrency

Validation (`lib/stock/documents.ts`) runs in a single Postgres transaction:

1. `SELECT … FOR UPDATE` on the document, so a double click can't validate twice.
2. A transaction-level advisory lock per *(product, source location)*, so two
   documents can't both pass the availability check against the same stock.
3. The availability check, using `getStockOnHand(…, tx)`.
4. Mark the moves and the document `DONE`. Any failure rolls back everything.

The database enforces the ledger's invariants too, via CHECK constraints in
the migrations: quantity > 0, source ≠ destination, `DONE` ⇒ `doneAt` set,
and internal locations must belong to a warehouse.

### Reporting at scale

The dashboard needs every product's total. Instead of calling
`getStockOnHand()` once per product and location (N×M queries), one grouped
SQL query (`lib/stock/levels.ts`) sums `DONE` moves per product. Its cost
grows with the number of moves, not with products × locations.

---

## Features

- **Dashboard**: KPI cards (in stock / low / out / pending receipts, deliveries,
  transfers), each linking to the filtered list behind it; a needs-reorder
  table; a 7-day activity chart; a document activity list with combinable
  filters. A low-stock badge sits in the top bar.
- **Products**: search, category and stock-status filters, pagination, on-hand
  per location. SKUs are unique (case-insensitive). Products with stock
  history can't be deleted.
- **Transfers**: draft → validate or cancel. The source must have enough stock.
- **Adjustments**: count-based corrections with a required reason, showing
  recorded vs counted before saving.
- **Move history**: the full ledger, filterable by product, location, type,
  status and date range.
- **Settings**: warehouses and locations, reordering rules (reorder level per
  product), categories.
- **Auth**: signup and login (JWT in an httpOnly cookie), password reset by OTP,
  profile (rename, change password). Changing or resetting a password signs out
  all other sessions.
- **Roles**: the first account is a `MANAGER`, later ones are `STAFF`. Every
  write route re-checks the role on the server (`requireManager()`).

---

## Local setup

Requirements: **Node.js ≥ 20.19**.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then edit .env (see below)
```

### 1. A Postgres database

Pick one:

- **No install:** Prisma's local Postgres (PGlite based):
  ```bash
  npx prisma dev -d -n stocksense     # starts in the background
  ```
  In `.env`, set:
  ```
  DATABASE_URL="postgres://postgres:postgres@localhost:51218/template1?sslmode=disable"
  SHADOW_DATABASE_URL="postgres://postgres:postgres@localhost:51219/template1?sslmode=disable"
  DATABASE_POOL_MAX=1
  ```
  This local server is single-session and occasionally drops connections. If
  it stops responding, run `npx prisma dev stop stocksense`, then start it again.
- **Any Postgres 14+** (Docker, a local install, or a Neon dev branch): set
  `DATABASE_URL` only.

### 2. Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Put the output in `JWT_SECRET` in `.env`.

### 3. Schema, sample data, run

```bash
npx prisma migrate dev      # create the tables
npm run seed                # sample warehouse, locations, 5 products, opening stock
npm run dev                 # http://localhost:3000
```

Sign up. **The first account becomes the manager.** The seed refuses to run
on a database that already has products (it would wipe them); use
`SEED_RESET=true npm run seed` to deliberately reset sample data (users are kept).

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Runtime connection. On Neon/Supabase, use the **pooled** URL. |
| `DIRECT_URL` | hosted DBs | **Unpooled** URL for `prisma migrate` (the pooler breaks its locks). Falls back to `DATABASE_URL`. |
| `JWT_SECRET` | yes | Signs session tokens. Rotating it signs everyone out. |
| `SHADOW_DATABASE_URL` | local `prisma dev` | Shadow DB for `prisma migrate dev`. |
| `DATABASE_POOL_MAX` | local `prisma dev` | Set `1`. Leave unset for hosted Postgres. |
| `TEST_DATABASE_URL` / `TEST_DATABASE_SCHEMA` | no | Test database and schema (defaults: `DATABASE_URL`, `stocksense_test`). |

---

## Tests

```bash
npm test
```

The suite creates its own Postgres schema (`stocksense_test`) in the test
database, applies all migrations to it, and never touches `public`.

With the local `prisma dev` server, run the tests against a **separate
instance**. PGlite shares one database session per server, so session
settings from the test run would leak into a running app:

```bash
npx prisma dev -d -n stocksense-test
# .env: TEST_DATABASE_URL="postgres://postgres:postgres@localhost:51221/template1?sslmode=disable"
```

(Use the port printed by the command.) Against a regular Postgres server,
the separate schema is enough, and TEST_DATABASE_URL can stay unset.

| File | What it verifies |
|---|---|
| `tests/unit/adjustment-plan.test.ts` | The adjustment delta logic (recorded vs counted → direction and size of the corrective move), stock-status classification, and input validation edge cases (self-transfer, zero or negative quantities). |
| `tests/db/stock-on-hand.test.ts` | `getStockOnHand()`: only `DONE` moves count, in − out, isolation between products and locations, reads inside transactions, the DB CHECK constraints, and that the grouped dashboard query agrees with it. |
| `tests/db/core-loop.test.ts` | The core loop through the real engine: receipt +50 → delivery −20 → transfer 10 → adjustment −3. Asserts the final on-hand (17 + 10 = 27) and the exact ledger rows. Also covers the guard rails: insufficient stock, double validation, cancellation. |

---

## Deploy (Vercel + Neon)

1. **Database: Neon** (or Supabase). Create a project, then copy two connection
   strings:
   - the **pooled** one (host contains `-pooler`) → `DATABASE_URL`
   - the **direct** one → `DIRECT_URL`
2. **App: Vercel.** Import the repository and set these environment variables
   (Production, and Preview if you use preview deployments):
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (a new random value, not your local one).
3. **Build.** Vercel runs `npm run vercel-build`:
   `prisma generate && prisma migrate deploy && next build`. Pending migrations
   are applied to the production database on every deploy before the new code
   goes live. Migrations are additive, so this is safe to repeat.
4. **First run.** Open the site and sign up; the first account is the manager.
   Optionally, load sample data once from your machine:
   ```bash
   DATABASE_URL="<neon direct url>" npm run seed
   ```
   (It refuses to run if products already exist.)

Notes:
- Preview deployments run `migrate deploy` too. Give Preview its own database
  (e.g. a Neon branch) so previews can't migrate production.
- `.env` is git-ignored; secrets live only in the Vercel dashboard.
- Security headers are set in `next.config.ts`; session cookies are
  `httpOnly`, `SameSite=Lax`, and `Secure` in production.

---

## Project layout

```
app/(auth)/          login, signup, forgot-password pages
app/(app)/           signed-in pages (sidebar shell): dashboard, products, transfers,
                     adjustments, moves, categories, settings, profile
app/api/             route handlers; every one validates input with zod
lib/stock/           the stock engine: getStockOnHand, documents (validate/cancel,
                     locking), operations (create documents, adjustments),
                     levels (grouped reporting)
lib/auth/            JWT, session cookie, guards (requireUser / requireManager)
lib/validation/      zod schemas
prisma/              schema, migrations, seed
proxy.ts             route protection (Next 16's renamed middleware)
tests/               Vitest suites
```

Receipts and deliveries are fully supported by the engine (and covered by the
core-loop test) but don't have their own screens yet.
