import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 *
 * Deletes the session cookie. JWTs are stateless, so this is what "logging
 * out" means: the browser no longer has a token to send. (A copied token
 * would stay valid until it expires; revocation would need a server-side
 * denylist or a per-user token version — out of scope for now.)
 */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
