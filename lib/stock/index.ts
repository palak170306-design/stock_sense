import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Either the global client or the `tx` handle inside `prisma.$transaction`. */
export type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Stock on hand for one product at one location — THE single source of truth
 * for stock levels.
 *
 *   onHand = Σ quantity of DONE moves INTO the location
 *          − Σ quantity of DONE moves OUT OF the location
 *
 * No table stores a running quantity; every screen, report and validation
 * that needs a stock level must go through this computation. Only DONE moves
 * count: drafts, moves in progress and canceled moves haven't physically
 * happened. A move can't be both incoming and outgoing for the same location
 * because the DB forbids source = dest.
 *
 * Pass `db = tx` when calling inside a transaction, so the read sees the
 * transaction's own writes and runs on its connection (see lib/stock/documents.ts).
 */
export async function getStockOnHand(
  productId: string,
  locationId: string,
  db: Db = prisma
): Promise<number> {
  const [incoming, outgoing] = await Promise.all([
    db.stockMove.aggregate({
      _sum: { quantity: true },
      where: { productId, destLocationId: locationId, status: "DONE" },
    }),
    db.stockMove.aggregate({
      _sum: { quantity: true },
      where: { productId, sourceLocationId: locationId, status: "DONE" },
    }),
  ]);

  // `_sum` is null when no rows match.
  return (incoming._sum.quantity ?? 0) - (outgoing._sum.quantity ?? 0);
}
