import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/api/http";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";

/**
 * POST /api/auth/login  { email, password }
 *
 * On success, issues a JWT { userId, role } in an httpOnly cookie. The
 * response body never contains the token: the browser stores and sends it
 * automatically, and page JS never needs to touch it.
 */
export async function POST(req: Request) {
  const { data, response } = await parseBody(req, loginSchema);
  if (response) return response;

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const ok = await verifyPassword(data.password, user?.passwordHash);

  // One generic message for both cases so the endpoint doesn't reveal which
  // emails are registered.
  if (!user || !ok) return jsonError("Invalid email or password", 401);

  await setSessionCookie({ userId: user.id, role: user.role, sv: user.sessionVersion });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
