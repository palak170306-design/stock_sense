import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/jwt";

/**
 * GET /api/auth/expired — clear a dead session cookie, then go to /login.
 *
 * A cookie can carry a validly SIGNED JWT that is nevertheless revoked (the
 * password changed elsewhere, or the user was deleted). proxy.ts only checks
 * the signature, so it would bounce that browser from /login to /dashboard,
 * whose layout (which checks the DB) would bounce it back: a redirect loop.
 * The layout sends such requests here instead; deleting the cookie breaks
 * the loop. (Server components can't modify cookies, so this needs a route.)
 */
export function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
