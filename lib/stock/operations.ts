import type { DocumentType, Prisma } from "@/lib/generated/prisma/client";
import { getStockOnHand } from "@/lib/stock";
import { lockStock, nextReference, StockError } from "@/lib/stock/documents";

/**
 * Stock operations as plain functions over a transaction client, shared by
 * the API routes and the test suite so both exercise exactly the same code.
 * Every function here takes `tx` and must be called inside
 * `prisma.$transaction(async (tx) => …)`.
 */

type Tx = Prisma.TransactionClient;

// ─── Documents ──────────────────────────────────────────────────────────────

export type NewDocument = {
  type: DocumentType;
  warehouseCode: string; // reference prefix, e.g. "WH" → "WH/INT/0001"
  sourceLocationId: string;
  destLocationId: string;
  lines: { productId: string; quantity: number }[];
  note?: string;
  createdById?: string | null;
};

/**
 * Create a DRAFT document with one DRAFT move per line. Nothing changes
 * stock until validateDocument() flips the moves to DONE. Works for every
 * document type: RECEIPT (vendor → internal), DELIVERY (internal → customer),
 * INTERNAL (internal → internal).
 */
export async function createStockDocument(tx: Tx, doc: NewDocument) {
  const reference = await nextReference(tx, doc.warehouseCode, doc.type);
  return tx.stockDocument.create({
    data: {
      reference,
      type: doc.type,
      status: "DRAFT",
      note: doc.note ?? "",
      sourceLocationId: doc.sourceLocationId,
      destLocationId: doc.destLocationId,
      createdById: doc.createdById ?? null,
      // Nested create: the document and all its move lines in one write.
      moves: {
        create: doc.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          sourceLocationId: doc.sourceLocationId,
          destLocationId: doc.destLocationId,
          documentType: doc.type,
          status: "DRAFT" as const,
          reference,
        })),
      },
    },
  });
}

// ─── Adjustments ────────────────────────────────────────────────────────────

export type AdjustmentPlan = {
  delta: number; // signed: + found, − missing
  quantity: number; // always positive (move quantities are never negative)
  sourceLocationId: string;
  destLocationId: string;
};

/**
 * THE ADJUSTMENT DELTA LOGIC (pure: no I/O, unit-tested).
 *
 *   recorded = what the ledger says is at the location (sum of DONE moves)
 *   counted  = what someone physically counted
 *   delta    = counted − recorded
 *
 * Nothing is overwritten (there is no quantity column). We book the
 * DIFFERENCE as one move to/from the virtual INVENTORY_LOSS location, so that
 * afterwards getStockOnHand() == counted:
 *
 *   delta > 0  found more than recorded (recorded 10, counted 12)
 *              → move 2 FROM inventory_loss TO the location   (stock ↑)
 *   delta < 0  found less than recorded (recorded 10, counted 7)
 *              → move 3 FROM the location TO inventory_loss   (stock ↓)
 *   delta = 0  nothing to correct → null (a move must have quantity > 0)
 *
 * The move quantity is |delta|; the DIRECTION carries the sign. Over time
 * INVENTORY_LOSS accumulates net shrinkage, which is itself a useful report.
 */
export function planAdjustment(
  recorded: number,
  counted: number,
  locationId: string,
  lossLocationId: string
): AdjustmentPlan | null {
  const delta = counted - recorded;
  if (delta === 0) return null;
  return delta > 0
    ? { delta, quantity: delta, sourceLocationId: lossLocationId, destLocationId: locationId }
    : { delta, quantity: -delta, sourceLocationId: locationId, destLocationId: lossLocationId };
}

export type NewAdjustment = {
  productId: string;
  unitOfMeasure: string;
  locationId: string;
  warehouseCode: string;
  lossLocationId: string;
  countedQuantity: number;
  reason: string;
  userId?: string | null;
};

/**
 * Book an adjustment: read recorded stock, plan the correction, and create
 * the document + move directly as DONE (the physical count IS the
 * confirmation, so adjustments are one-step).
 *
 * The (product, location) lock is taken BEFORE reading recorded stock, so no
 * concurrent transfer/delivery can change it between our read and our write,
 * which would make the delta wrong.
 */
export async function createAdjustment(tx: Tx, a: NewAdjustment) {
  await lockStock(tx, [{ productId: a.productId, locationId: a.locationId }]);

  const recorded = await getStockOnHand(a.productId, a.locationId, tx);
  const plan = planAdjustment(recorded, a.countedQuantity, a.locationId, a.lossLocationId);
  if (!plan) {
    throw new StockError(`Counted quantity matches recorded stock (${recorded} ${a.unitOfMeasure}); nothing to adjust.`, 400);
  }

  const reference = await nextReference(tx, a.warehouseCode, "ADJUSTMENT");
  const now = new Date();
  // No availability check needed: a decrease is at most `recorded` (counted ≥ 0).
  const doc = await tx.stockDocument.create({
    data: {
      reference,
      type: "ADJUSTMENT",
      status: "DONE",
      note: a.reason,
      sourceLocationId: plan.sourceLocationId,
      destLocationId: plan.destLocationId,
      recordedQuantity: recorded,
      countedQuantity: a.countedQuantity,
      createdById: a.userId ?? null,
      validatedById: a.userId ?? null,
      validatedAt: now,
      moves: {
        create: {
          productId: a.productId,
          quantity: plan.quantity,
          sourceLocationId: plan.sourceLocationId,
          destLocationId: plan.destLocationId,
          documentType: "ADJUSTMENT",
          status: "DONE",
          doneAt: now,
          reference,
        },
      },
    },
    include: { moves: true },
  });
  return { ...doc, delta: plan.delta };
}
