import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, prismaErrorResponse } from "@/lib/api/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { categoryCreateSchema } from "@/lib/validation/inventory";

/** GET /api/categories — all categories with their product counts. Any signed-in user. */
export async function GET() {
  const { response } = await requireUser();
  if (response) return response;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    // `_count` asks Postgres for COUNT(*) of the relation instead of loading rows.
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categories });
}

/** POST /api/categories { name, description? } — MANAGER only. */
export async function POST(req: Request) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { data, response } = await parseBody(req, categoryCreateSchema);
  if (response) return response;

  // Case-insensitive duplicate check ("Tools" vs "tools") for a friendly message.
  const clash = await prisma.category.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
  });
  if (clash) return jsonError(`Category "${clash.name}" already exists`, 409);

  try {
    const category = await prisma.category.create({ data });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return prismaErrorResponse(err, { P2002: "A category with this name already exists" });
  }
}
