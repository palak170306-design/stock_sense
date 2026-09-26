import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, prismaErrorResponse } from "@/lib/api/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { warehouseCreateSchema } from "@/lib/validation/inventory";

/** GET /api/warehouses — all warehouses with their locations. Any signed-in user. */
export async function GET() {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
    include: { locations: { orderBy: { name: "asc" } } },
  });
  return NextResponse.json({ warehouses });
}

/** POST /api/warehouses { name, code } — MANAGER only. */
export async function POST(req: Request) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { data, response } = await parseBody(req, warehouseCreateSchema);
  if (response) return response;

  const dupe = await prisma.warehouse.findUnique({ where: { code: data.code } });
  if (dupe) return jsonError(`Warehouse code ${data.code} is already used by "${dupe.name}"`, 409);

  try {
    const warehouse = await prisma.warehouse.create({ data, include: { locations: true } });
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (err) {
    return prismaErrorResponse(err, { P2002: `Warehouse code ${data.code} is already in use` });
  }
}
