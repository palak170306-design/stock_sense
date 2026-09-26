import { NextResponse } from "next/server";
import type { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Small helpers shared by every route handler so the API behaves uniformly:
 * errors are always `{ error: string }` with a meaningful status code.
 */

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** First validation message, suitable for showing to the user. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

type Parsed<T> = { data: T; response?: never } | { data?: never; response: NextResponse };

/**
 * Parse a JSON request body against a zod schema.
 * Returns `{ data }` on success or `{ response }` (a 400) on failure.
 */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<Parsed<z.infer<T>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: jsonError("Request body must be JSON", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: jsonError(firstIssue(parsed.error), 400) };
  }
  return { data: parsed.data };
}

/** Parse URL query parameters (`?a=1&b=2`) against a zod schema. */
export function parseQuery<T extends z.ZodType>(
  req: Request,
  schema: T
): Parsed<z.infer<T>> {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return { response: jsonError(firstIssue(parsed.error), 400) };
  }
  return { data: parsed.data };
}

/**
 * Translate well-known Prisma errors into HTTP responses; rethrow anything
 * else (a genuine 500).
 *
 * Handlers still pre-check the common cases (duplicate SKU, category in use)
 * to give friendly messages. This is the safety net for races between the
 * check and the write, which the database constraints catch.
 *
 * @param messages optional overrides per Prisma error code
 */
export function prismaErrorResponse(
  err: unknown,
  messages: Partial<Record<"P2002" | "P2003" | "P2025", string>> = {}
): NextResponse {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // unique constraint
        return jsonError(messages.P2002 ?? "A record with this value already exists", 409);
      case "P2003": // foreign key: referenced row missing, or row still referenced
        return jsonError(messages.P2003 ?? "This record is linked to other records", 409);
      case "P2025": // record to update/delete not found
        return jsonError(messages.P2025 ?? "Not found", 404);
    }
  }
  throw err;
}
