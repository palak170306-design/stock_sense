import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, prismaErrorResponse } from "@/lib/api/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { locationUpdateSchema } from "@/lib/validation/inventory";

type Ctx = RouteContext<"/api/locations/[id]">;

const withWarehouse = { warehouse: { select: { id: true, name: true, code: true } } } as const;
const moveCount = { _count: { select: { incomingMoves: true, outgoingMoves: true } } } as const;

/** GET /api/locations/:id — any signed-in user. */
export async function GET(_req: Request, ctx: Ctx) {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  const location = await prisma.location.findUnique({ where: { id }, include: withWarehouse });
  if (!location) return jsonError("Location not found", 404);
  return NextResponse.json({ location });
}

/**
 * PATCH /api/locations/:id { name?, type?, warehouseId? } — MANAGER only.
 *
 * Renaming is always allowed. Changing the TYPE or WAREHOUSE of a location
 * that already has stock moves is not: it would retroactively change what
 * past moves meant (e.g. a receipt INTO an internal location would suddenly
 * become a move into a customer).
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { data, response } = await parseBody(req, locationUpdateSchema);
  if (response) return response;

  const current = await prisma.location.findUnique({ where: { id }, include: moveCount });
  if (!current) return jsonError("Location not found", 404);

  // Validate the merged result, since the rule spans two fields.
  const type = data.type ?? current.type;
  const warehouseId = data.warehouseId !== undefined ? data.warehouseId : current.warehouseId;
  if (type === "INTERNAL" && !warehouseId) {
    return jsonError("Internal locations must belong to a warehouse", 400);
  }

  const structural =
    (data.type !== undefined && data.type !== current.type) ||
    (data.warehouseId !== undefined && data.warehouseId !== current.warehouseId);
  const moves = current._count.incomingMoves + current._count.outgoingMoves;
  if (structural && moves > 0) {
    return jsonError("Can't change the type or warehouse of a location that has stock moves. Rename it instead.", 409);
  }

  if (data.warehouseId) {
    const exists = await prisma.warehouse.count({ where: { id: data.warehouseId } });
    if (!exists) return jsonError("Selected warehouse does not exist", 400);
  }

  try {
    const location = await prisma.location.update({ where: { id }, data, include: withWarehouse });
    return NextResponse.json({ location });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2003: "Selected warehouse does not exist",
      P2025: "Location not found",
    });
  }
}

/**
 * DELETE /api/locations/:id — MANAGER only.
 * Refuses if any stock move references the location (it's part of the ledger).
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const location = await prisma.location.findUnique({ where: { id }, include: moveCount });
  if (!location) return jsonError("Location not found", 404);

  const moves = location._count.incomingMoves + location._count.outgoingMoves;
  if (moves > 0) {
    return jsonError(`Can't delete "${location.name}": it has ${moves} stock move(s) in its history.`, 409);
  }

  try {
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2003: "Can't delete this location: it has stock history",
      P2025: "Location not found",
    });
  }
}
