import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, parseQuery } from "@/lib/api/http";
import { stockErrorResponse } from "@/lib/api/documents";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { createAdjustment } from "@/lib/stock/operations";
import { adjustmentCreateSchema, documentListQuerySchema } from "@/lib/validation/stock";

/**
 * GET /api/adjustments?page=&limit= — any signed-in user. Newest first.
 * Each item carries its product, location, recorded vs counted snapshot and
 * the signed delta (+ found / − lost).
 */
export async function GET(req: Request) {
  const { response: denied } = await requireUser();
  if (denied) return denied;
  const { data: q, response } = parseQuery(req, documentListQuerySchema);
  if (response) return response;

  const where = { type: "ADJUSTMENT" as const, ...(q.status && { status: q.status }) };
  const [docs, total] = await prisma.$transaction([
    prisma.stockDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        createdBy: { select: { name: true } },
        moves: {
          include: {
            product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
            sourceLocation: { select: { id: true, name: true, type: true } },
            destLocation: { select: { id: true, name: true, type: true } },
          },
        },
      },
    }),
    prisma.stockDocument.count({ where }),
  ]);

  const adjustments = docs.map(({ moves, ...doc }) => {
    const move = moves[0];
    // The physical location is whichever end of the move is INTERNAL.
    const increase = move.destLocation.type === "INTERNAL";
    return {
      ...doc,
      product: move.product,
      location: increase ? move.destLocation : move.sourceLocation,
      delta: increase ? move.quantity : -move.quantity,
    };
  });

  return NextResponse.json({
    adjustments,
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  });
}

/**
 * POST /api/adjustments — MANAGER only.
 * { productId, locationId, countedQuantity, reason }
 *
 * Reconciles the system's recorded stock with a physical count by booking ONE
 * corrective move, created and validated (DONE) in a single transaction.
 * Route = input checks + location lookup; the booking lives in createAdjustment().
 */
export async function POST(req: Request) {
  const { user, response: denied } = await requireManager();
  if (denied) return denied;
  const { data, response } = await parseBody(req, adjustmentCreateSchema);
  if (response) return response;

  const [product, location] = await Promise.all([
    prisma.product.findUnique({ where: { id: data.productId }, select: { id: true, sku: true, unitOfMeasure: true } }),
    prisma.location.findUnique({ where: { id: data.locationId }, include: { warehouse: { select: { id: true, code: true } } } }),
  ]);
  if (!product) return jsonError("Product not found", 400);
  if (!location) return jsonError("Location not found", 400);
  if (location.type !== "INTERNAL") {
    return jsonError("Adjustments apply to INTERNAL locations (where stock is physically counted)", 400);
  }

  // The virtual counterpart for the correction. Prefer a loss location inside
  // the same warehouse (per-site shrinkage reporting), else the global one.
  const lossLocation = await prisma.location.findFirst({
    where: { type: "INVENTORY_LOSS", OR: [{ warehouseId: location.warehouseId }, { warehouseId: null }] },
    orderBy: { warehouseId: { sort: "asc", nulls: "last" } },
  });
  if (!lossLocation) {
    return jsonError("No INVENTORY_LOSS location is configured. Add one under Warehouses first.", 409);
  }

  try {
    // See planAdjustment() in lib/stock/operations.ts for the delta logic
    // (recorded vs counted → direction of the corrective move).
    const adjustment = await prisma.$transaction((tx) =>
      createAdjustment(tx, {
        productId: product.id,
        unitOfMeasure: product.unitOfMeasure,
        locationId: location.id,
        warehouseCode: location.warehouse!.code,
        lossLocationId: lossLocation.id,
        countedQuantity: data.countedQuantity,
        reason: data.reason,
        userId: user.id,
      })
    );
    return NextResponse.json({ adjustment }, { status: 201 });
  } catch (err) {
    return stockErrorResponse(err);
  }
}
