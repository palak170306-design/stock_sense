import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, prismaErrorResponse } from "@/lib/api/http";
import { requireManager } from "@/lib/auth/guards";
import { categoryUpdateSchema } from "@/lib/validation/inventory";

type Ctx = RouteContext<"/api/categories/[id]">;

/** PATCH /api/categories/:id { name?, description? } — MANAGER only. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { data, response } = await parseBody(req, categoryUpdateSchema);
  if (response) return response;

  if (data.name) {
    const clash = await prisma.category.findFirst({
      where: { name: { equals: data.name, mode: "insensitive" }, NOT: { id } },
    });
    if (clash) return jsonError(`Category "${clash.name}" already exists`, 409);
  }

  try {
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ category });
  } catch (err) {
    return prismaErrorResponse(err, { P2025: "Category not found" });
  }
}

/**
 * DELETE /api/categories/:id — MANAGER only.
 *
 * Refuses while any product still uses the category: deleting it would leave
 * products without a category. (The FK is ON DELETE RESTRICT, so the DB
 * would refuse too; the pre-check just gives a clearer message with a count.)
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { response: denied } = await requireManager();
  if (denied) return denied;

  const { id } = await ctx.params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return jsonError("Category not found", 404);

  const n = category._count.products;
  if (n > 0) {
    return jsonError(
      `Can't delete "${category.name}": ${n} product${n === 1 ? " is" : "s are"} still in this category. Move or delete ${n === 1 ? "it" : "them"} first.`,
      409
    );
  }

  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return prismaErrorResponse(err, {
      P2003: "Can't delete this category: products still reference it",
      P2025: "Category not found",
    });
  }
}
