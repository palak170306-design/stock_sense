import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { jsonError, parseBody, parseQuery, prismaErrorResponse } from "@/lib/api/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { locationCreateSchema, locationListQuerySchema } from "@/lib/validation/inventory";

/**
 * GET /api/locations?warehouse=&type= — any signed-in user.
 * `warehouse=none` lists global (virtual) locations with no warehouse.
 */
export async function GET(req: Request) {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const { data: query, response } = parseQuery(req, locationListQuerySchema);
  if (response) return response;

  const where: Prisma.LocationWhereInput = {};
  if (query.warehouse) where.warehouseId = query.warehouse === "none" ? null : query.warehouse;
  if (query.type) where.type = query.type;

  const locations = await prisma.location.findMany({
    where,
    include: { warehouse: { select: { id: true, name: true, code: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ locations });
}

/** POST /api/locations { name, type, warehouseId? } — MANAGER only. */
export async function POST(req: Request) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { data, response } = await parseBody(req, locationCreateSchema);
  if (response) return response;

  if (data.warehouseId) {
    const exists = await prisma.warehouse.count({ where: { id: data.warehouseId } });
    if (!exists) return jsonError("Selected warehouse does not exist", 400);
  }

  try {
    const location = await prisma.location.create({
      data: { name: data.name, type: data.type, warehouseId: data.warehouseId ?? null },
      include: { warehouse: { select: { id: true, name: true, code: true } } },
    });
    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    return prismaErrorResponse(err, { P2003: "Selected warehouse does not exist" });
  }
}
