import "server-only";
import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/http";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";

/**
 * Role checks for route handlers.
 *
 * WHY CHECK HERE AND NOT (ONLY) IN THE UI?
 * Hiding the "Add Product" button from STAFF is a convenience, not security:
 * anyone can call the API directly with curl or devtools. The API is the only
 * place a permission check actually protects data, so every write handler
 * starts with `requireManager()`.
 *
 * WHY getCurrentUser() AND NOT THE ROLE IN THE JWT?
 * The JWT's `role` was true when the token was issued (up to 7 days ago).
 * getCurrentUser() reads the user from the DB, so a demotion or deleted
 * account takes effect on the very next request.
 *
 * Usage:
 *   const { user, response } = await requireManager();
 *   if (response) return response;
 */

type Guard = { user: CurrentUser; response?: never } | { user?: never; response: NextResponse };

/** Any signed-in user (MANAGER or STAFF). Used by read-only endpoints. */
export async function requireUser(): Promise<Guard> {
  const user = await getCurrentUser();
  // proxy.ts normally blocks anonymous API calls first; this covers the
  // "valid JWT but user deleted" case.
  if (!user) return { response: jsonError("Not authenticated", 401) };
  return { user };
}

/** Signed-in MANAGER only. Used by every create/update/delete endpoint. */
export async function requireManager(): Promise<Guard> {
  const result = await requireUser();
  if (result.response) return result;
  if (result.user.role !== "MANAGER") {
    // 403 (not 401): we know who you are; you just aren't allowed.
    return { response: jsonError("Only managers can make changes", 403) };
  }
  return result;
}
