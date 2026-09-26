import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/auth/validation";

/**
 * POST /api/profile/password { currentPassword, newPassword }
 *
 * Requires the CURRENT password even though the user is signed in, so a
 * borrowed/unlocked session can't silently take over the account.
 *
 * On success, sessionVersion is bumped: every other session (other browsers,
 * a stolen cookie) is revoked, and this browser gets a fresh cookie carrying
 * the new version so the user stays signed in here.
 */
export async function POST(req: Request) {
  const { user, response: denied } = await requireUser();
  if (denied) return denied;
  const { data, response } = await parseBody(req, changePasswordSchema);
  if (response) return response;

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await verifyPassword(data.currentPassword, record.passwordHash))) {
    // 400 rather than 401: the session is fine; the form input is wrong.
    return jsonError("Current password is incorrect", 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(data.newPassword), sessionVersion: { increment: 1 } },
    select: { id: true, role: true, sessionVersion: true },
  });
  await setSessionCookie({ userId: updated.id, role: updated.role, sv: updated.sessionVersion });

  return NextResponse.json({ message: "Password changed. Other sessions have been signed out." });
}
