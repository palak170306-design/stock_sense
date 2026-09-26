import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { jsonError, parseBody, parseQuery, prismaErrorResponse } from "@/lib/api/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { getStockLevelMap, getStockLevels, type StockLevel } from "@/lib/stock/levels";
import { productCreateSchema, productListQuerySchema } from "@/lib/validation/inventory";

/**
 * GET /api/products?q=&category=&page=&limit=  — any signed-in user.
 *
 *   q        case-insensitive substring match on name OR sku
 *   category category id to filter by
 *   stock    in | low | out | alert: filter by DERIVED stock status
 *   page     1-based page number (default 1)
 *   limit    page size, 1–100 (default 20)
 *
 * Response: { products: [...with category, onHand, stockStatus], pagination: { page, limit, total, totalPages } }
 */
export async function GET(req: Request) {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const { data: query, response } = parseQuery(req, productListQuerySchema);
  if (response) return response;
  const { q, category, stock, page, limit } = query;

  // Build the WHERE clause from whichever filters were supplied. Filters are
  // ANDed together; the search term itself is an OR across two columns.
  //
  //   WHERE ("name" ILIKE '%q%' OR "sku" ILIKE '%q%')   -- only if q given
  //     AND "categoryId" = :category                     -- only if category given
  //
  // `mode: "insensitive"` makes Prisma use ILIKE on Postgres, so "mouse"
  // finds "Wireless Mouse" and "elec" finds "ELEC-001". Prisma parameterises
  // the value, so user input can't inject SQL.
  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.categoryId = category;

  // Stock status isn't a column (stock is derived), so it can't be a plain
  // WHERE. Compute every product's level in one grouped query, keep the ids
  // whose status matches, and add "id IN (...)" to the Prisma filter. Search,
  // category, sort and pagination then work unchanged on top.
  if (stock) {
    const matches: Record<typeof stock, (l: StockLevel) => boolean> = {
      in: (l) => l.onHand > 0,
      low: (l) => l.status === "LOW",
      out: (l) => l.status === "OUT",
      alert: (l) => l.status !== "OK",
    };
    where.id = { in: (await getStockLevels()).filter(matches[stock]).map((l) => l.productId) };
  }

  // Offset pagination: skip whole pages before this one. Page data and the
  // total count run in one transaction so they come from the same snapshot
  // (the total can't disagree with the rows returned).
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      // Secondary sort on id keeps page boundaries stable when names tie.
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  // On-hand for just this page's products (one grouped query).
  const levels = await getStockLevelMap(products.map((p) => p.id));

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      onHand: levels.get(p.id)?.onHand ?? 0,
      stockStatus: levels.get(p.id)?.status ?? "OUT",
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** POST /api/products { name, sku, categoryId, unitOfMeasure, reorderLevel } — MANAGER only. */
export async function POST(req: Request) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { data, response } = await parseBody(req, productCreateSchema);
  if (response) return response;

  // Friendly pre-checks. The DB's unique index / FK remain the real guarantee
  // (see prismaErrorResponse below for the race where two requests collide).
  const [dupe, category] = await Promise.all([
    prisma.product.findUnique({ where: { sku: data.sku }, select: { name: true } }),
    prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
  ]);
  if (dupe) return jsonError(`SKU ${data.sku} is already used by "${dupe.name}"`, 409);
  if (!category) return jsonError("Selected category does not exist", 400);

  try {
    const product = await prisma.product.create({
      data,
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2002: `SKU ${data.sku} is already in use`,
      P2003: "Selected category does not exist",
    });
  }
}
