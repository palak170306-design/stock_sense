import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/api/http";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { signupSchema } from "@/lib/auth/validation";

/**
 * POST /api/auth/signup  { name, email, password }
 *
 * Creates the account and logs the user straight in (sets the session cookie).
 *
 * Role is NOT accepted from the client, or anyone could sign up as a manager.
 * The very first account becomes MANAGER so a fresh install has an admin;
 * everyone after that starts as STAFF (promotion comes in a later phase).
 */
export async function POST(req: Request) {
  const { data, response } = await parseBody(req, signupSchema);
  if (response) return response;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return jsonError("An account with this email already exists", 409);

  const passwordHash = await hashPassword(data.password);
  const isFirstUser = (await prisma.user.count()) === 0;

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: isFirstUser ? "MANAGER" : "STAFF",
    },
    select: { id: true, name: true, email: true, role: true, sessionVersion: true },
  });

  await setSessionCookie({ userId: user.id, role: user.role, sv: user.sessionVersion });
  const { sessionVersion: _sv, ...publicUser } = user;
  void _sv;
  return NextResponse.json({ user: publicUser }, { status: 201 });
}
