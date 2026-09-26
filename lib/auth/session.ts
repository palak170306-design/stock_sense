import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/jwt";

/**
 * Session cookie handling.
 *
 * Why an httpOnly cookie (and not localStorage)?
 *  - httpOnly: page JavaScript cannot read it, so an XSS bug can't steal the
 *    token.
 *  - The browser attaches it to every same-site request automatically, so
 *    server components, route handlers and proxy.ts all see it without any
 *    client code passing tokens around.
 *  - sameSite=lax: not sent on cross-site POSTs, which blocks classic CSRF
 *    against our JSON endpoints.
 *  - secure (in production): only sent over HTTPS.
 */

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS, // match the JWT's own expiry
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * The logged-in user, or null. Use in server components and route handlers.
 *
 * proxy.ts already rejects requests without a valid JWT, but that's an
 * optimistic gate. This function is the authoritative check: it re-verifies
 * the token AND loads the user from the database, so a deleted user or a
 * changed role takes effect immediately rather than when the JWT expires.
 * It also rejects tokens revoked by a password change (sessionVersion).
 *
 * Wrapped in React `cache` so multiple calls during one render hit the DB once.
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    // Never select passwordHash / otp fields into general-purpose code.
    select: { id: true, name: true, email: true, role: true, sessionVersion: true },
  });
  // A password change since this token was issued revokes it.
  if (!user || user.sessionVersion !== session.sv) return null;
  const { sessionVersion: _sv, ...publicUser } = user;
  void _sv;
  return publicUser;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
