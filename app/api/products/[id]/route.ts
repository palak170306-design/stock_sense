import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, prismaErrorResponse } from "@/lib/api/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { productUpdateSchema } from "@/lib/validation/inventory";

type Ctx = RouteContext<"/api/products/[id]">;

const withCategory = { category: { select: { id: true, name: true } } } as const;

/** GET /api/products/:id — any signed-in user. */
export async function GET(_req: Request, ctx: Ctx) {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id }, include: withCategory });
  if (!product) return jsonError("Product not found", 404);
  return NextResponse.json({ product });
}

/** PATCH /api/products/:id { any product field } — MANAGER only. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { data, response } = await parseBody(req, productUpdateSchema);
  if (response) return response;

  if (data.sku) {
    // Same SKU on a *different* product is a conflict; keeping your own is fine.
    const dupe = await prisma.product.findFirst({
      where: { sku: data.sku, NOT: { id } },
      select: { name: true },
    });
    if (dupe) return jsonError(`SKU ${data.sku} is already used by "${dupe.name}"`, 409);
  }
  if (data.categoryId) {
    const exists = await prisma.category.count({ where: { id: data.categoryId } });
    if (!exists) return jsonError("Selected category does not exist", 400);
  }

  try {
    const product = await prisma.product.update({ where: { id }, data, include: withCategory });
    return NextResponse.json({ product });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2002: `SKU ${data.sku} is already in use`,
      P2003: "Selected category does not exist",
      P2025: "Product not found",
    });
  }
}

/**
 * DELETE /api/products/:id — MANAGER only.
 *
 * Only products with NO stock moves can be deleted. Moves are the stock
 * ledger; deleting a product would have to delete its history too, silently
 * rewriting past stock levels. Products that have ever moved should be
 * retired in a later phase (e.g. an "archived" flag) rather than deleted.
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { stockMoves: true } } },
  });
  if (!product) return jsonError("Product not found", 404);

  if (product._count.stockMoves > 0) {
    return jsonError(
      `Can't delete "${product.name}": it has ${product._count.stockMoves} stock move(s) in its history.`,
      409
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2003: "Can't delete this product: it has stock history",
      P2025: "Product not found",
    });
  }
}
