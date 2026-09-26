import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Db } from "@/lib/stock";

/**
 * Total on-hand for MANY products in ONE query — the reporting counterpart of
 * getStockOnHand().
 *
 * WHY NOT LOOP getStockOnHand()?
 * getStockOnHand(product, location) is perfect for one number, but a
 * dashboard needs every product's total across every internal location.
 * Looping would cost products × locations × 2 aggregate queries (5 products ×
 * 3 locations × 2 = 30 round-trips today; 2,000 products × 20 locations ×
 * 2 = 80,000 at modest scale), each re-scanning the same rows. Instead we let
 * Postgres read the DONE moves once and GROUP BY product, returning one row
 * per product: a single round-trip whose cost grows with the number of moves,
 * not with products × locations.
 *
 * THE MATH (same definition as getStockOnHand, summed over all INTERNAL
 * locations): a move adds to a product's total if it goes INTO an internal
 * location, and subtracts if it comes OUT OF one. So:
 *   receipt   vendor   → internal : +qty
 *   delivery  internal → customer : −qty
 *   transfer  internal → internal : +qty −qty = 0   (totals unchanged ✔)
 *   adjust    loss    ↔ internal  : ±qty
 * Virtual locations never count as stock you own.
 *
 * The LEFT JOIN from Product means products with no moves at all still come
 * back, with onHand 0, so "out of stock" includes never-stocked items.
 *
 * Index support: StockMove(status) narrows to DONE rows; the joins hit
 * Location's primary key.
 */

export type StockStatus = "OUT" | "LOW" | "OK";

export type StockLevel = {
  productId: string;
  reorderLevel: number;
  onHand: number;
  status: StockStatus;
};

/**
 * OUT: nothing on hand (≤ 0).
 * LOW: something on hand but at or below the reorder level.
 * OK:  above the reorder level.
 * OUT and LOW are disjoint so KPI counts never double-count a product.
 */
export function stockStatus(onHand: number, reorderLevel: number): StockStatus {
  if (onHand <= 0) return "OUT";
  if (onHand <= reorderLevel) return "LOW";
  return "OK";
}

/**
 * @param productIds limit to these products (e.g. one page of a list);
 *                   omit for all products.
 */
export async function getStockLevels(productIds?: string[], db: Db = prisma): Promise<StockLevel[]> {
  if (productIds && productIds.length === 0) return [];
  const onlyThese = productIds ? Prisma.sql`WHERE p.id IN (${Prisma.join(productIds)})` : Prisma.empty;

  const rows = await db.$queryRaw<{ productId: string; reorderLevel: number; onHand: number }[]>`
    WITH totals AS (
      SELECT m."productId",
             SUM(CASE WHEN dst.type = 'INTERNAL' THEN m.quantity ELSE 0 END)
           - SUM(CASE WHEN src.type = 'INTERNAL' THEN m.quantity ELSE 0 END) AS on_hand
      FROM "StockMove" m
      JOIN "Location" src ON src.id = m."sourceLocationId"
      JOIN "Location" dst ON dst.id = m."destLocationId"
      WHERE m.status = 'DONE'
      GROUP BY m."productId"
    )
    SELECT p.id AS "productId",
           p."reorderLevel" AS "reorderLevel",
           COALESCE(t.on_hand, 0)::int AS "onHand"
    FROM "Product" p
    LEFT JOIN totals t ON t."productId" = p.id
    ${onlyThese}`;

  return rows.map((r) => ({ ...r, status: stockStatus(r.onHand, r.reorderLevel) }));
}

/** Convenience: productId → level. */
export async function getStockLevelMap(productIds?: string[], db: Db = prisma) {
  return new Map((await getStockLevels(productIds, db)).map((l) => [l.productId, l]));
}

/**
 * Products needing reorder (OUT or LOW), most urgent first: out-of-stock,
 * then by how far below the reorder level they are (on hand ÷ reorder level).
 * Shared by /api/alerts and /api/dashboard so both always agree.
 * Pass `allLevels` if you already fetched them, to avoid a second query.
 */
export async function getReorderAlerts(allLevels?: StockLevel[]) {
  const levels = (allLevels ?? (await getStockLevels())).filter((l) => l.status !== "OK");
  if (levels.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: levels.map((l) => l.productId) } },
    select: { id: true, name: true, sku: true, unitOfMeasure: true, category: { select: { id: true, name: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const urgency = (l: StockLevel) => (l.status === "OUT" ? -1 : l.onHand / Math.max(l.reorderLevel, 1));
  return levels
    .sort((a, b) => urgency(a) - urgency(b))
    .map((l) => ({
      ...byId.get(l.productId)!,
      onHand: l.onHand,
      reorderLevel: l.reorderLevel,
      // Units needed to get back up to the reorder level.
      shortfall: Math.max(l.reorderLevel - l.onHand, 0),
      status: l.status as "OUT" | "LOW",
    }));
}
