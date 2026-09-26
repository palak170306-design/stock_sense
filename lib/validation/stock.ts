import { z } from "zod";

/** zod schemas for stock operations (transfers, adjustments) and the ledger. */

const DOCUMENT_TYPES = ["RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"] as const;
const MOVE_STATUSES = ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"] as const;

const id = (label: string) => z.string().trim().min(1, `${label} is required`);
const qty = z.coerce.number().int("Quantity must be a whole number");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// ─── Transfers ──────────────────────────────────────────────────────────────

export const transferCreateSchema = z
  .object({
    sourceLocationId: id("Source location"),
    destLocationId: id("Destination location"),
    note: z.string().trim().max(500).default(""),
    lines: z
      .array(z.object({ productId: id("Product"), quantity: qty.min(1, "Quantity must be at least 1") }))
      .min(1, "Add at least one product line")
      .max(100, "At most 100 lines per transfer"),
  })
  .refine((v) => v.sourceLocationId !== v.destLocationId, {
    message: "Source and destination must be different locations",
    path: ["destLocationId"],
  })
  // One line per product keeps the document readable; the UI merges quantities.
  .refine((v) => new Set(v.lines.map((l) => l.productId)).size === v.lines.length, {
    message: "Each product can appear only once per transfer",
    path: ["lines"],
  });

export const documentListQuerySchema = z.object({
  status: z.enum(MOVE_STATUSES).optional(),
  ...pagination,
});

// ─── Adjustments ────────────────────────────────────────────────────────────

export const adjustmentCreateSchema = z.object({
  productId: id("Product"),
  locationId: id("Location"),
  // The PHYSICAL count. Zero is valid ("the shelf is empty").
  countedQuantity: qty.min(0, "Counted quantity can't be negative"),
  reason: z.string().trim().min(1, "A reason is required for adjustments").max(500),
});

// ─── Ledger ─────────────────────────────────────────────────────────────────

/**
 * Accepts "YYYY-MM-DD" (a whole UTC day) or a full ISO datetime (an exact
 * instant; the UI sends local-midnight instants so "today" means the user's
 * day, not UTC's). Output: { start, end } with `end` EXCLUSIVE.
 *   from=2026-09-01            → start 2026-09-01T00:00Z
 *   to=2026-09-30              → end   2026-10-01T00:00Z (whole last day included)
 *   to=2026-09-30T18:30:00Z    → end   exactly that instant
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const dateParam = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date (use YYYY-MM-DD or an ISO datetime)");
const DAY_MS = 24 * 60 * 60 * 1000;

export const movesQuerySchema = z
  .object({
    product: z.string().trim().optional(),
    location: z.string().trim().optional(),
    document: z.string().trim().optional(),
    type: z.enum(DOCUMENT_TYPES).optional(),
    status: z.enum(MOVE_STATUSES).optional(),
    from: dateParam.optional(),
    to: dateParam.optional(),
    ...pagination,
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .transform(({ from, to, ...rest }) => ({
    ...rest,
    start: from ? new Date(from) : undefined,
    end: to ? new Date(new Date(to).getTime() + (DATE_ONLY.test(to) ? DAY_MS : 0)) : undefined,
  }))
  .refine((v) => !v.start || !v.end || v.start < v.end, {
    message: "'From' date must be on or before 'to' date",
    path: ["to"],
  });
