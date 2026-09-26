import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/guards";
import { profileUpdateSchema } from "@/lib/auth/validation";

/** GET /api/profile — the signed-in user's own profile. */
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  return NextResponse.json({ user });
}

/**
 * PATCH /api/profile { name } — update your own display name.
 * Email and role are deliberately NOT editable here: email is the login
 * identity, and a user must never be able to change their own role.
 */
export async function PATCH(req: Request) {
  const { user, response: denied } = await requireUser();
  if (denied) return denied;
  const { data, response } = await parseBody(req, profileUpdateSchema);
  if (response) return response;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: data.name },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json({ user: updated });
}
