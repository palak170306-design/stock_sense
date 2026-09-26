import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { parseQuery } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/guards";
import { movesQuerySchema } from "@/lib/validation/stock";

/**
 * GET /api/moves — the STOCK LEDGER. Any signed-in user.
 *
 * One read-only view over every StockMove: receipts, deliveries, transfers
 * and adjustments all write the same table, so they all appear here with no
 * extra work. This is the audit trail behind every on-hand number: summing
 * the DONE rows for a product/location reproduces getStockOnHand() exactly.
 *
 * Filters (all optional, ANDed):
 *   product   product id
 *   location  location id; matches moves INTO or OUT OF it
 *   document  stock document id (all lines of one transfer/adjustment)
 *   type      RECEIPT | DELIVERY | INTERNAL | ADJUSTMENT
 *   status    DRAFT | WAITING | READY | DONE | CANCELED
 *   from, to  date range on the move's effective date (see below)
 *   page, limit (default 25, max 100)
 *
 * EFFECTIVE DATE = doneAt for completed moves (when stock actually changed),
 * createdAt for anything not yet done. Ordering: open moves first (they are
 * "pending"), then completed ones newest-first.
 */
export async function GET(req: Request) {
  const { response: denied } = await requireUser();
  if (denied) return denied;
  const { data: q, response } = parseQuery(req, movesQuerySchema);
  if (response) return response;

  // Each filter contributes one condition; the array is ANDed.
  const and: Prisma.StockMoveWhereInput[] = [];
  if (q.product) and.push({ productId: q.product });
  if (q.location) and.push({ OR: [{ sourceLocationId: q.location }, { destLocationId: q.location }] });
  if (q.document) and.push({ documentId: q.document });
  if (q.type) and.push({ documentType: q.type });
  if (q.status) and.push({ status: q.status });
  if (q.start || q.end) {
    // Prisma can't filter on COALESCE(doneAt, createdAt) directly, so spell
    // it out: "done within range" OR "not done and created within range".
    const range = { ...(q.start && { gte: q.start }), ...(q.end && { lt: q.end }) };
    and.push({ OR: [{ doneAt: range }, { doneAt: null, createdAt: range }] });
  }
  const where: Prisma.StockMoveWhereInput = { AND: and };

  const [moves, total] = await prisma.$transaction([
    prisma.stockMove.findMany({
      where,
      orderBy: [{ doneAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
        sourceLocation: { select: { id: true, name: true, type: true } },
        destLocation: { select: { id: true, name: true, type: true } },
        document: { select: { id: true, reference: true, type: true, note: true } },
      },
    }),
    prisma.stockMove.count({ where }),
  ]);

  return NextResponse.json({
    moves: moves.map((m) => ({ ...m, date: m.doneAt ?? m.createdAt })),
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  });
}
