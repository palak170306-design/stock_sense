import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { parseQuery } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/guards";

const querySchema = z.object({
  type: z.enum(["RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"]).optional(),
  // OPEN = any not-yet-final status (DRAFT | WAITING | READY): "pending".
  status: z.enum(["OPEN", "DRAFT", "WAITING", "READY", "DONE", "CANCELED"]).optional(),
  warehouse: z.string().trim().optional(),
  location: z.string().trim().optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * GET /api/documents — stock documents of every type (the dashboard's
 * activity / pending list). Any signed-in user.
 *
 * Filters combine with AND:
 *   type       RECEIPT | DELIVERY | INTERNAL | ADJUSTMENT
 *   status     a status, or OPEN for anything pending
 *   warehouse  documents touching any location in that warehouse
 *   location   documents touching that location
 *   category   documents with at least one line for a product in that category
 *
 * "Touching" checks both the document's header locations and every line's
 * locations, so documents whose lines differ from the header still match.
 */
export async function GET(req: Request) {
  const { response: denied } = await requireUser();
  if (denied) return denied;
  const { data: q, response } = parseQuery(req, querySchema);
  if (response) return response;

  const and: Prisma.StockDocumentWhereInput[] = [];
  if (q.type) and.push({ type: q.type });
  if (q.status) and.push({ status: q.status === "OPEN" ? { in: ["DRAFT", "WAITING", "READY"] } : q.status });
  if (q.location) {
    and.push({
      OR: [
        { sourceLocationId: q.location },
        { destLocationId: q.location },
        { moves: { some: { OR: [{ sourceLocationId: q.location }, { destLocationId: q.location }] } } },
      ],
    });
  }
  if (q.warehouse) {
    const inWarehouse = { warehouseId: q.warehouse };
    and.push({
      OR: [
        { sourceLocation: inWarehouse },
        { destLocation: inWarehouse },
        { moves: { some: { OR: [{ sourceLocation: inWarehouse }, { destLocation: inWarehouse }] } } },
      ],
    });
  }
  if (q.category) and.push({ moves: { some: { product: { categoryId: q.category } } } });
  const where: Prisma.StockDocumentWhereInput = { AND: and };

  const [docs, total] = await prisma.$transaction([
    prisma.stockDocument.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        sourceLocation: { select: { id: true, name: true, type: true } },
        destLocation: { select: { id: true, name: true, type: true } },
        createdBy: { select: { name: true } },
        moves: { select: { quantity: true, product: { select: { sku: true, name: true } } } },
      },
    }),
    prisma.stockDocument.count({ where }),
  ]);

  return NextResponse.json({
    documents: docs.map(({ moves, ...d }) => ({
      ...d,
      lineCount: moves.length,
      totalQuantity: moves.reduce((s, m) => s + m.quantity, 0),
      // Short human summary for the table: "ELEC-001, OFF-002 +1".
      productsSummary:
        moves.slice(0, 2).map((m) => m.product.sku).join(", ") + (moves.length > 2 ? ` +${moves.length - 2}` : ""),
    })),
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  });
}
