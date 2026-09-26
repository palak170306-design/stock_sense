import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api/http";
import { stockErrorResponse } from "@/lib/api/documents";
import { requireManager } from "@/lib/auth/guards";
import { cancelDocument } from "@/lib/stock/documents";

/**
 * POST /api/transfers/:id/cancel — MANAGER only.
 * Only open transfers can be canceled; a validated one has already moved
 * stock (reverse it with a new transfer instead). Canceled documents and
 * their moves stay in the ledger for the audit trail.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/transfers/[id]/cancel">) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const exists = await prisma.stockDocument.count({ where: { id, type: "INTERNAL" } });
  if (!exists) return jsonError("Transfer not found", 404);

  try {
    const transfer = await prisma.$transaction((tx) => cancelDocument(tx, id));
    return NextResponse.json({ transfer });
  } catch (err) {
    return stockErrorResponse(err);
  }
}
