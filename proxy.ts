import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

/**
 * Route protection (Next.js 16 "proxy", formerly `middleware.ts`).
 *
 * Runs BEFORE every matched request is routed. It reads the session cookie
 * and verifies the JWT's signature + expiry — a cheap, DB-free check:
 *   - no valid session on a protected page   -> redirect to /login?next=<path>
 *   - no valid session on a protected API    -> 401 JSON (APIs shouldn't redirect)
 *   - valid session on /login, /signup, ...   -> redirect to /dashboard
 *
 * This is an optimistic first gate, not the only one. Pages and route
 * handlers that act on data must still call getCurrentUser(), which also
 * confirms the user still exists in the database.
 */

// Pages reachable without logging in.
const PUBLIC_PAGES = ["/login", "/signup", "/forgot-password"];

// The auth API must be public, or nobody could log in in the first place.
const PUBLIC_API_PREFIX = "/api/auth/";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  if (isPublicPage || pathname.startsWith(PUBLIC_API_PREFIX)) {
    // Already logged in? Skip the login/signup screens.
    if (session && isPublicPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Remember where the user was going so login can send them back.
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + search);
  const res = NextResponse.redirect(loginUrl);
  // A present-but-invalid (expired/tampered) cookie is useless; drop it.
  if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  // Run on everything except Next internals and static files, so CSS, JS,
  // images and the favicon still load on the login page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
