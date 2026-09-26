import { prisma } from "@/lib/prisma";
import { validateDocument } from "@/lib/stock/documents";
import { createStockDocument, type NewDocument } from "@/lib/stock/operations";

/** Empty every table in the test schema (keeps the migrated structure). */
export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE "StockMove", "StockDocument", "DocumentSequence", "Product", "Category",
             "Location", "Warehouse", "User" RESTART IDENTITY CASCADE`);
}

/**
 * A minimal world: a manager, one warehouse (code WH) with two shelves, the three
 * virtual locations, one category and one product with reorder level 10.
 */
export async function seedWorld() {
  const user = await prisma.user.create({ data: { name: "Tester", email: "tester@test.dev", passwordHash: "x", role: "MANAGER" } });
  const wh = await prisma.warehouse.create({ data: { name: "Main", code: "WH" } });
  const loc = (name: string, type: "INTERNAL" | "VENDOR" | "CUSTOMER" | "INVENTORY_LOSS") =>
    prisma.location.create({ data: { name, type, warehouseId: type === "INTERNAL" ? wh.id : null } });
  const stock = await loc("WH/Stock", "INTERNAL");
  const shelf = await loc("WH/Shelf A", "INTERNAL");
  const vendor = await loc("Vendors", "VENDOR");
  const customer = await loc("Customers", "CUSTOMER");
  const loss = await loc("Inventory Loss", "INVENTORY_LOSS");
  const category = await prisma.category.create({ data: { name: "Test" } });
  const widget = await prisma.product.create({
    data: { name: "Widget", sku: "W-1", categoryId: category.id, unitOfMeasure: "pcs", reorderLevel: 10 },
  });
  return { user, wh, stock, shelf, vendor, customer, loss, category, widget };
}

/** Create a document and validate it, as the API does in two requests. */
export async function createAndValidate(doc: NewDocument, userId: string) {
  const created = await prisma.$transaction((tx) => createStockDocument(tx, doc));
  await prisma.$transaction((tx) => validateDocument(tx, created.id, userId));
  return created;
}
