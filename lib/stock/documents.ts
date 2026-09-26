import type { Prisma } from "@/lib/generated/prisma/client";
import { getStockOnHand } from "@/lib/stock";

/**
 * The stock-document engine: numbering, locking, validation and cancellation
 * shared by every operation (transfers and adjustments today; receipts and
 * deliveries plug into the same functions later).
 *
 * THE VALIDATE PATTERN
 * Validation is what turns paperwork into real stock change: it flips a
 * document's moves from DRAFT to DONE, and only DONE moves count in
 * getStockOnHand(). It must be all-or-nothing and race-free, so it always runs
 * inside `prisma.$transaction(async (tx) => ...)`:
 *
 *   1. Lock the document row (SELECT … FOR UPDATE) so two clicks on "Validate"
 *      can't both succeed.
 *   2. Lock every (product, source location) pair the document draws stock
 *      from, so two DIFFERENT documents can't both pass the availability
 *      check against the same stock and drive it negative.
 *   3. Check availability with getStockOnHand(…, tx): reads inside the lock
 *      see everything committed before us.
 *   4. Flip moves + document to DONE. Any error rolls back steps 1–4.
 *
 * All functions take `tx` and must never touch the global `prisma` client:
 * with a single-connection pool that would wait forever for the connection
 * the transaction is holding.
 */

type Tx = Prisma.TransactionClient;

/** A business-rule failure with the HTTP status the API should return. */
export class StockError extends Error {
  constructor(message: string, readonly status: number = 409) {
    super(message);
  }
}

/** Reference prefixes, e.g. "WH/INT/" → "WH/INT/0001". */
export const REFERENCE_CODES = {
  RECEIPT: "IN",
  DELIVERY: "OUT",
  INTERNAL: "INT",
  ADJUSTMENT: "ADJ",
} as const;

/**
 * Next sequential reference for a prefix. The upsert is a single atomic
 * INSERT … ON CONFLICT DO UPDATE SET value = value + 1, so concurrent callers
 * always receive distinct numbers.
 */
export async function nextReference(
  tx: Tx,
  warehouseCode: string,
  type: keyof typeof REFERENCE_CODES
): Promise<string> {
  const prefix = `${warehouseCode}/${REFERENCE_CODES[type]}/`;
  const seq = await tx.documentSequence.upsert({
    where: { prefix },
    create: { prefix, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}${String(seq.value).padStart(4, "0")}`;
}

/**
 * Serialise all stock-changing work on the given (product, location) pairs
 * until the transaction ends. Uses Postgres transaction-level advisory locks
 * keyed by a hash of "productId:locationId". Keys are sorted so two
 * transactions locking overlapping sets always lock in the same order and
 * can't deadlock.
 */
export async function lockStock(tx: Tx, pairs: { productId: string; locationId: string }[]) {
  const keys = [...new Set(pairs.map((p) => `${p.productId}:${p.locationId}`))].sort();
  for (const key of keys) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}

const OPEN_STATUSES = ["DRAFT", "WAITING", "READY"] as const;

/** Lock the document row and return it; 404/409 if it can't be changed. */
async function lockOpenDocument(tx: Tx, documentId: string, action: string) {
  const rows = await tx.$queryRaw<{ id: string; status: string; reference: string }[]>`
    SELECT id, status::text AS status, reference
    FROM "StockDocument" WHERE id = ${documentId} FOR UPDATE`;
  const doc = rows[0];
  if (!doc) throw new StockError("Document not found", 404);
  if (doc.status === "DONE") throw new StockError(`${doc.reference} is already validated and can't be ${action}.`);
  if (doc.status === "CANCELED") throw new StockError(`${doc.reference} is canceled and can't be ${action}.`);
  return doc;
}

/**
 * Validate a document: check stock, then mark all its open moves DONE.
 * Throws StockError (409) listing every shortfall if any source location
 * doesn't have enough on hand.
 */
export async function validateDocument(tx: Tx, documentId: string, userId: string) {
  const doc = await lockOpenDocument(tx, documentId, "validated");

  const moves = await tx.stockMove.findMany({
    where: { documentId, status: { in: [...OPEN_STATUSES] } },
    include: {
      product: { select: { sku: true, unitOfMeasure: true } },
      sourceLocation: { select: { name: true, type: true } },
    },
  });
  if (moves.length === 0) throw new StockError(`${doc.reference} has no lines to validate.`);

  // Total quantity each (product, source) pair must supply. Only INTERNAL
  // sources hold real stock; VENDOR / INVENTORY_LOSS sources are the virtual
  // "outside world" and can always supply (a receipt can't be "out of stock").
  const required = new Map<string, { productId: string; locationId: string; qty: number; label: string; unit: string }>();
  for (const m of moves) {
    if (m.sourceLocation.type !== "INTERNAL") continue;
    const key = `${m.productId}:${m.sourceLocationId}`;
    const entry = required.get(key) ?? {
      productId: m.productId,
      locationId: m.sourceLocationId,
      qty: 0,
      label: `${m.product.sku} at ${m.sourceLocation.name}`,
      unit: m.product.unitOfMeasure,
    };
    entry.qty += m.quantity;
    required.set(key, entry);
  }

  await lockStock(tx, [...required.values()]);

  const shortfalls: string[] = [];
  for (const r of required.values()) {
    const onHand = await getStockOnHand(r.productId, r.locationId, tx);
    if (onHand < r.qty) shortfalls.push(`${r.label}: ${onHand} on hand, ${r.qty} ${r.unit} needed`);
  }
  if (shortfalls.length) {
    throw new StockError(`Insufficient stock — ${shortfalls.join("; ")}`);
  }

  const now = new Date();
  await tx.stockMove.updateMany({
    where: { documentId, status: { in: [...OPEN_STATUSES] } },
    data: { status: "DONE", doneAt: now },
  });
  return tx.stockDocument.update({
    where: { id: documentId },
    data: { status: "DONE", validatedAt: now, validatedById: userId },
  });
}

/** Cancel a not-yet-validated document and all its moves (kept for audit). */
export async function cancelDocument(tx: Tx, documentId: string) {
  await lockOpenDocument(tx, documentId, "canceled");
  await tx.stockMove.updateMany({
    where: { documentId, status: { in: [...OPEN_STATUSES] } },
    data: { status: "CANCELED" },
  });
  return tx.stockDocument.update({ where: { id: documentId }, data: { status: "CANCELED" } });
}
