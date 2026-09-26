import type { Prisma } from "@/lib/generated/prisma/client";
import { jsonError } from "@/lib/api/http";
import { StockError } from "@/lib/stock/documents";

/** Shared Prisma `include` for returning a document with its lines. */
export const documentInclude = {
  sourceLocation: { select: { id: true, name: true, type: true } },
  destLocation: { select: { id: true, name: true, type: true } },
  createdBy: { select: { id: true, name: true } },
  validatedBy: { select: { id: true, name: true } },
  moves: {
    orderBy: { createdAt: "asc" },
    include: {
      product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
      sourceLocation: { select: { id: true, name: true, type: true } },
      destLocation: { select: { id: true, name: true, type: true } },
    },
  },
} satisfies Prisma.StockDocumentInclude;

/** Map engine errors to HTTP; rethrow anything unexpected (→ 500). */
export function stockErrorResponse(err: unknown) {
  if (err instanceof StockError) return jsonError(err.message, err.status);
  throw err;
}
