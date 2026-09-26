import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/http";
import { stockErrorResponse } from "@/lib/api/documents";
import { requireManager } from "@/lib/auth/guards";
import { validateDocument } from "@/lib/stock/documents";

/**
 * POST /api/transfers/:id/validate — MANAGER only.
 *
 * Marks every line DONE in one transaction (see validateDocument for the
 * locking + availability check). Each line is a single move source → dest,
 * so the source loses exactly what the destination gains and the product's
 * total on-hand across locations is unchanged.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/transfers/[id]/validate">) {
  const { user, response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const exists = await prisma.stockDocument.count({ where: { id, type: "INTERNAL" } });
  if (!exists) return jsonError("Transfer not found", 404);

  try {
    const transfer = await prisma.$transaction((tx) => validateDocument(tx, id, user.id));
    return NextResponse.json({ transfer });
  } catch (err) {
    return stockErrorResponse(err);
  }
}
