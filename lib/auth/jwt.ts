import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/generated/prisma/client";

/**
 * JWT signing/verification.
 *
 * The session is a stateless JWT: the server signs { userId, role } with
 * JWT_SECRET and hands it to the browser in a cookie. On each request we only
 * need to check the signature and expiry — no session table lookup — to know
 * who the user is. Anyone can READ a JWT's payload (it is base64, not
 * encrypted), so it contains no secrets; what they cannot do is FORGE or
 * ALTER one without the secret.
 *
 * `jose` is used (rather than `jsonwebtoken`) because it relies only on Web
 * Crypto, so the same code runs in route handlers and in proxy.ts.
 *
 * This file must not import Prisma: proxy.ts imports it and should stay a
 * fast, DB-free check.
 */

export const SESSION_COOKIE = "stocksense_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * `sv` = the user's sessionVersion when the token was issued. Changing the
 * password bumps the stored version, which invalidates older tokens.
 */
export type SessionPayload = { userId: string; role: Role; sv: number };

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Returns the payload if the token is authentic and unexpired, else null. */
export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    // Pinning the algorithm prevents "alg: none" / algorithm-confusion tricks.
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string") return null;
    if (payload.role !== "MANAGER" && payload.role !== "STAFF") return null;
    // Tokens issued before session versioning count as version 0.
    const sv = typeof payload.sv === "number" ? payload.sv : 0;
    return { userId: payload.userId, role: payload.role, sv };
  } catch {
    // Bad signature, expired, malformed — all mean "not logged in".
    return null;
  }
}
