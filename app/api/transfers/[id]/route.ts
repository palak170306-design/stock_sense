import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/http";
import { documentInclude } from "@/lib/api/documents";
import { requireUser } from "@/lib/auth/guards";
import { getStockOnHand } from "@/lib/stock";

/**
 * GET /api/transfers/:id — any signed-in user.
 *
 * For open (not yet validated) transfers each line also carries
 * `availableAtSource`: the source's current on-hand, so the UI can warn about
 * shortfalls before anyone clicks Validate.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/transfers/[id]">) {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  const transfer = await prisma.stockDocument.findFirst({
    where: { id, type: "INTERNAL" },
    include: documentInclude,
  });
  if (!transfer) return jsonError("Transfer not found", 404);

  const open = transfer.status !== "DONE" && transfer.status !== "CANCELED";
  const moves = [];
  for (const m of transfer.moves) {
    moves.push({
      ...m,
      availableAtSource: open ? await getStockOnHand(m.productId, m.sourceLocationId) : null,
    });
  }
  return NextResponse.json({ transfer: { ...transfer, moves } });
}
