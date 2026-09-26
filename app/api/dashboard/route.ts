import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseQuery } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/guards";
import { getReorderAlerts, getStockLevels } from "@/lib/stock/levels";

const OPEN = ["DRAFT", "WAITING", "READY"] as const;

const querySchema = z.object({
  // Browser's Date#getTimezoneOffset() (minutes, UTC − local; IST = −330) so
  // "last 7 days" means the viewer's calendar days, not UTC's.
  tz: z.coerce.number().int().min(-840).max(840).default(0),
});

/**
 * GET /api/dashboard?tz= — every KPI in one call. Any signed-in user.
 *
 * All numbers derive from the StockMove / StockDocument tables:
 *   productsInStock   products with total on-hand > 0
 *   lowStock          0 < on-hand ≤ reorderLevel   (+ the product list)
 *   outOfStock        on-hand ≤ 0                   (+ the product list)
 *   pendingReceipts   RECEIPT documents not DONE/CANCELED
 *   pendingDeliveries DELIVERY documents not DONE/CANCELED
 *   scheduledTransfers INTERNAL documents not DONE/CANCELED
 *   movesLast7Days    DONE moves per local day, with a per-type breakdown
 *
 * Queries are independent, so they run together; each is a single
 * aggregate (no per-product loops — see lib/stock/levels.ts).
 */
export async function GET(req: Request) {
  const { response: denied } = await requireUser();
  if (denied) return denied;
  const { data: q, response } = parseQuery(req, querySchema);
  if (response) return response;

  // Local midnight six days ago → a 7-day window including today.
  const nowLocal = new Date(Date.now() - q.tz * 60_000);
  const startLocalDay = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() - 6);
  const windowStart = new Date(startLocalDay + q.tz * 60_000);

  const [levels, pendingByType, dailyMoves] = await Promise.all([
    getStockLevels(),
    // One GROUP BY over documents instead of three separate counts.
    prisma.stockDocument.groupBy({
      by: ["type"],
      where: { status: { in: [...OPEN] } },
      _count: { _all: true },
    }),
    // DONE moves bucketed by the viewer's local day and type. Shifting doneAt
    // by the offset before truncating to a date gives local calendar days.
    prisma.$queryRaw<{ day: string; type: string; count: number }[]>`
      SELECT to_char(("doneAt" - make_interval(mins => ${q.tz}::int))::date, 'YYYY-MM-DD') AS day,
             "documentType"::text AS type,
             COUNT(*)::int AS count
      FROM "StockMove"
      WHERE status = 'DONE' AND "doneAt" >= ${windowStart}
      GROUP BY 1, 2`,
  ]);

  const alerts = await getReorderAlerts(levels);
  const pending = (type: string) => pendingByType.find((p) => p.type === type)?._count._all ?? 0;

  // Fill all 7 days (days with no moves still get a zero bar).
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startLocalDay + i * 86_400_000).toISOString().slice(0, 10);
    const rows = dailyMoves.filter((r) => r.day === date);
    return {
      date,
      count: rows.reduce((s, r) => s + r.count, 0),
      byType: Object.fromEntries(rows.map((r) => [r.type, r.count])),
    };
  });

  const low = alerts.filter((a) => a.status === "LOW");
  const out = alerts.filter((a) => a.status === "OUT");

  return NextResponse.json({
    kpis: {
      totalProducts: levels.length,
      productsInStock: levels.filter((l) => l.onHand > 0).length,
      lowStock: low.length,
      outOfStock: out.length,
      pendingReceipts: pending("RECEIPT"),
      pendingDeliveries: pending("DELIVERY"),
      scheduledTransfers: pending("INTERNAL"),
    },
    lowStock: low,
    outOfStock: out,
    movesLast7Days: days,
  });
}
