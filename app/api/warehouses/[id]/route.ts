import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, prismaErrorResponse } from "@/lib/api/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { warehouseUpdateSchema } from "@/lib/validation/inventory";

type Ctx = RouteContext<"/api/warehouses/[id]">;

/** GET /api/warehouses/:id — any signed-in user. */
export async function GET(_req: Request, ctx: Ctx) {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const { id } = await ctx.params;
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { locations: { orderBy: { name: "asc" } } },
  });
  if (!warehouse) return jsonError("Warehouse not found", 404);
  return NextResponse.json({ warehouse });
}

/** PATCH /api/warehouses/:id { name?, code? } — MANAGER only. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { data, response } = await parseBody(req, warehouseUpdateSchema);
  if (response) return response;

  if (data.code) {
    const dupe = await prisma.warehouse.findFirst({ where: { code: data.code, NOT: { id } } });
    if (dupe) return jsonError(`Warehouse code ${data.code} is already used by "${dupe.name}"`, 409);
  }

  try {
    const warehouse = await prisma.warehouse.update({ where: { id }, data });
    return NextResponse.json({ warehouse });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2002: `Warehouse code ${data.code} is already in use`,
      P2025: "Warehouse not found",
    });
  }
}

/**
 * DELETE /api/warehouses/:id — MANAGER only.
 * Refuses while the warehouse still has locations (delete those first), so a
 * warehouse can never disappear from under stock that sits in it.
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { _count: { select: { locations: true } } },
  });
  if (!warehouse) return jsonError("Warehouse not found", 404);

  const n = warehouse._count.locations;
  if (n > 0) {
    return jsonError(
      `Can't delete "${warehouse.name}": it still has ${n} location${n === 1 ? "" : "s"}. Delete ${n === 1 ? "it" : "them"} first.`,
      409
    );
  }

  try {
    await prisma.warehouse.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2003: "Can't delete this warehouse: locations still reference it",
      P2025: "Warehouse not found",
    });
  }
}
