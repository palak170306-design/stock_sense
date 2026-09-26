import { z } from "zod";

/**
 * zod schemas for the master-data API (categories, products, warehouses,
 * locations). "Create" schemas define required fields; "update" schemas are
 * `.partial()` so PATCH can change any subset, but must change something.
 */

const nonEmpty = (label: string, max = 100) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const id = (label: string) => z.string().trim().min(1, `${label} is required`);

const atLeastOneField = <T extends z.ZodObject>(schema: T) =>
  schema.partial().refine((v) => Object.keys(v).length > 0, "Nothing to update");

// ─── Categories ─────────────────────────────────────────────────────────────

export const categoryCreateSchema = z.object({
  name: nonEmpty("Name"),
  description: z.string().trim().max(500).default(""),
});
export const categoryUpdateSchema = atLeastOneField(
  categoryCreateSchema.extend({ description: z.string().trim().max(500) })
);

// ─── Products ───────────────────────────────────────────────────────────────

export const productCreateSchema = z.object({
  name: nonEmpty("Name", 200),
  // Normalised to upper case so "elec-001" and "ELEC-001" can't coexist.
  sku: nonEmpty("SKU", 64)
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9._-]+$/, "SKU may only contain letters, digits, '.', '_' and '-'")),
  categoryId: id("Category"),
  unitOfMeasure: nonEmpty("Unit of measure", 20),
  // Forms send strings; coerce "10" -> 10.
  reorderLevel: z.coerce.number().int("Reorder level must be a whole number").min(0, "Reorder level can't be negative"),
});
export const productUpdateSchema = atLeastOneField(productCreateSchema);

/**
 * GET /api/products query string. Everything is optional; bad values are
 * rejected rather than silently ignored so client bugs surface quickly.
 */
export const productListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().optional(),
  // Derived-stock filter: in (on hand > 0), low (0 < on hand ≤ reorder),
  // out (on hand ≤ 0), alert (low OR out: "needs reorder").
  stock: z.enum(["in", "low", "out", "alert"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Warehouses ─────────────────────────────────────────────────────────────

export const warehouseCreateSchema = z.object({
  name: nonEmpty("Name"),
  code: nonEmpty("Code", 10)
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]+$/, "Code may only contain letters and digits")),
});
export const warehouseUpdateSchema = atLeastOneField(warehouseCreateSchema);

// ─── Locations ──────────────────────────────────────────────────────────────

export const LOCATION_TYPES = ["INTERNAL", "VENDOR", "CUSTOMER", "INVENTORY_LOSS"] as const;

/**
 * INTERNAL locations are physical and must belong to a warehouse. Virtual
 * ones (VENDOR/CUSTOMER/INVENTORY_LOSS) may be global (warehouseId null).
 * The DB has the same rule as a CHECK constraint; this gives a clear message.
 */
export const locationCreateSchema = z
  .object({
    name: nonEmpty("Name"),
    type: z.enum(LOCATION_TYPES, "Type must be INTERNAL, VENDOR, CUSTOMER or INVENTORY_LOSS"),
    warehouseId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((v) => v.type !== "INTERNAL" || !!v.warehouseId, {
    message: "Internal locations must belong to a warehouse",
    path: ["warehouseId"],
  });

// For PATCH the INTERNAL/warehouse rule depends on the stored row, so the
// route handler checks it after merging with the existing values.
export const locationUpdateSchema = z
  .object({
    name: nonEmpty("Name"),
    type: z.enum(LOCATION_TYPES),
    warehouseId: z.string().trim().min(1).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const locationListQuerySchema = z.object({
  warehouse: z.string().trim().optional(),
  type: z.enum(LOCATION_TYPES).optional(),
});
