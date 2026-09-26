import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { jsonError, parseBody, parseQuery } from "@/lib/api/http";
import { documentInclude, stockErrorResponse } from "@/lib/api/documents";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { createStockDocument } from "@/lib/stock/operations";
import { documentListQuerySchema, transferCreateSchema } from "@/lib/validation/stock";

/**
 * GET /api/transfers?status=&page=&limit= — any signed-in user.
 * Newest first, with locations, line count and total quantity.
 */
export async function GET(req: Request) {
  const { response: denied } = await requireUser();
  if (denied) return denied;
  const { data: q, response } = parseQuery(req, documentListQuerySchema);
  if (response) return response;

  const where: Prisma.StockDocumentWhereInput = { type: "INTERNAL", ...(q.status && { status: q.status }) };
  const [transfers, total] = await prisma.$transaction([
    prisma.stockDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        sourceLocation: { select: { id: true, name: true } },
        destLocation: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        moves: { select: { quantity: true } },
      },
    }),
    prisma.stockDocument.count({ where }),
  ]);

  return NextResponse.json({
    transfers: transfers.map(({ moves, ...t }) => ({
      ...t,
      lineCount: moves.length,
      totalQuantity: moves.reduce((s, m) => s + m.quantity, 0),
    })),
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  });
}

/**
 * POST /api/transfers — MANAGER only.
 * { sourceLocationId, destLocationId, note?, lines: [{ productId, quantity }] }
 *
 * Creates an INTERNAL document with one DRAFT move per line. Nothing changes
 * stock yet: a transfer only moves stock when validated. Availability is
 * therefore checked at validation, not here (stock may change in between).
 */
export async function POST(req: Request) {
  const { user, response: denied } = await requireManager();
  if (denied) return denied;
  const { data, response } = await parseBody(req, transferCreateSchema);
  if (response) return response;

  const locations = await prisma.location.findMany({
    where: { id: { in: [data.sourceLocationId, data.destLocationId] } },
    include: { warehouse: { select: { code: true } } },
  });
  const source = locations.find((l) => l.id === data.sourceLocationId);
  const dest = locations.find((l) => l.id === data.destLocationId);
  if (!source || !dest) return jsonError("Source or destination location not found", 400);
  // Transfers only reposition stock you own: both ends must be physical.
  // Stock entering/leaving the company goes through receipts/deliveries, and
  // count corrections through adjustments.
  if (source.type !== "INTERNAL" || dest.type !== "INTERNAL") {
    return jsonError("Transfers must be between two INTERNAL locations", 400);
  }

  const productIds = data.lines.map((l) => l.productId);
  const found = await prisma.product.count({ where: { id: { in: productIds } } });
  if (found !== productIds.length) return jsonError("One or more products do not exist", 400);

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      const doc = await createStockDocument(tx, {
        type: "INTERNAL",
        warehouseCode: source.warehouse!.code,
        sourceLocationId: source.id,
        destLocationId: dest.id,
        lines: data.lines,
        note: data.note,
        createdById: user.id,
      });
      return tx.stockDocument.findUniqueOrThrow({ where: { id: doc.id }, include: documentInclude });
    });
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (err) {
    return stockErrorResponse(err);
  }
}
