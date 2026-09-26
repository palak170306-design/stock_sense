import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/guards";
import { getStockOnHand } from "@/lib/stock";

/**
 * GET /api/products/:id/stock — read-only, any signed-in user.
 *
 * On-hand quantity of one product at every INTERNAL location, computed with
 * getStockOnHand() (sum of DONE moves in minus out). Nothing is read from a
 * stored quantity column, because none exists: a product with no moves
 * reports 0 everywhere, and the numbers change only when moves are recorded.
 *
 * Virtual locations (VENDOR/CUSTOMER/INVENTORY_LOSS) are excluded: their
 * "balance" is just the mirror image of receipts/deliveries/adjustments
 * (e.g. the vendor location goes negative as goods are received), not stock
 * you own.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/products/[id]/stock">) {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, sku: true, unitOfMeasure: true, reorderLevel: true },
  });
  if (!product) return jsonError("Product not found", 404);

  const locations = await prisma.location.findMany({
    where: { type: "INTERNAL" },
    include: { warehouse: { select: { id: true, name: true, code: true } } },
    orderBy: [{ warehouse: { name: "asc" } }, { name: "asc" }],
  });

  // Sequential on purpose: one location at a time keeps connection use flat
  // regardless of how many locations exist. Fine at this scale; a single
  // GROUP BY query is the optimisation if location counts grow large.
  const byLocation = [];
  for (const location of locations) {
    byLocation.push({
      locationId: location.id,
      locationName: location.name,
      warehouse: location.warehouse,
      onHand: await getStockOnHand(product.id, location.id),
    });
  }

  const totalOnHand = byLocation.reduce((sum, l) => sum + l.onHand, 0);
  return NextResponse.json({
    product,
    totalOnHand,
    isLowStock: totalOnHand <= product.reorderLevel,
    locations: byLocation,
  });
}
