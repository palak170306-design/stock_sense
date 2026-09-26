import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getReorderAlerts } from "@/lib/stock/levels";

/**
 * GET /api/alerts — low-stock alerts. Any signed-in user.
 *
 * Every product whose total on-hand is at or below its reorder level
 * (status LOW) or at zero (status OUT), most urgent first, with current qty,
 * reorder level and shortfall. Also powers the badge in the top nav.
 */
export async function GET() {
  const { response: denied } = await requireUser();
  if (denied) return denied;

  const alerts = await getReorderAlerts();
  return NextResponse.json({
    count: alerts.length,
    outOfStock: alerts.filter((a) => a.status === "OUT").length,
    alerts,
  });
}
