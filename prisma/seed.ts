/**
 * Seed script — run with `npx prisma db seed` (or `npm run seed`).
 * On a non-empty database: `SEED_RESET=true npm run seed`.
 *
 * Wipes and re-creates reference data: one warehouse, internal + virtual
 * locations, categories, products, and opening stock. Users are left alone.
 *
 * Opening stock is seeded as one DONE receipt document (VENDOR -> INTERNAL), not
 * as a number on the product: even initial stock goes through the ledger, so
 * getStockOnHand() is correct from day one.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { getStockOnHand } from "../lib/stock";
import { nextReference } from "../lib/stock/documents";

async function main() {
  // Safety: seeding WIPES products, stock history, warehouses and locations.
  // Refuse to do that to a database that already has data unless explicitly
  // told to, so pointing DATABASE_URL at production by mistake is harmless.
  const existing = await prisma.product.count();
  if (existing > 0 && process.env.SEED_RESET !== "true") {
    console.error(
      `Refusing to seed: the database already has ${existing} product(s) and seeding would delete them and all stock history.\n` +
        `Re-run with SEED_RESET=true to wipe and re-seed (users are kept).`
    );
    process.exitCode = 1;
    return;
  }

  // Delete children before parents (FKs use ON DELETE RESTRICT).
  await prisma.stockMove.deleteMany();
  await prisma.stockDocument.deleteMany();
  await prisma.documentSequence.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();

  // Nested write: create the warehouse and its internal locations in one call.
  // Prisma fills in Location.warehouseId from the parent automatically.
  const warehouse = await prisma.warehouse.create({
    data: {
      name: "Main Warehouse",
      code: "WH",
      locations: {
        create: [
          { name: "WH/Stock", type: "INTERNAL" },
          { name: "WH/Stock/Shelf A", type: "INTERNAL" },
          { name: "WH/Stock/Shelf B", type: "INTERNAL" },
        ],
      },
    },
    include: { locations: true },
  });
  const mainStock = warehouse.locations.find((l) => l.name === "WH/Stock")!;

  // Virtual locations: no warehouse. They are the "other side" of receipts,
  // deliveries and adjustments.
  const vendor = await prisma.location.create({
    data: { name: "Partners/Vendors", type: "VENDOR" },
  });
  await prisma.location.createMany({
    data: [
      { name: "Partners/Customers", type: "CUSTOMER" },
      { name: "Virtual/Inventory Loss", type: "INVENTORY_LOSS" },
    ],
  });

  const [electronics, office, furniture] = await Promise.all([
    prisma.category.create({ data: { name: "Electronics", description: "Devices and accessories" } }),
    prisma.category.create({ data: { name: "Office Supplies", description: "Consumables for daily office use" } }),
    prisma.category.create({ data: { name: "Furniture", description: "Desks, chairs and storage" } }),
  ]);

  // [product, opening quantity]. The chair starts below its reorder level so
  // low-stock alerts have something to show later.
  const catalogue = [
    [{ name: "Wireless Mouse", sku: "ELEC-001", categoryId: electronics.id, unitOfMeasure: "pcs", reorderLevel: 20 }, 45],
    [{ name: "USB-C Charger 65W", sku: "ELEC-002", categoryId: electronics.id, unitOfMeasure: "pcs", reorderLevel: 10 }, 12],
    [{ name: "A4 Copy Paper", sku: "OFF-001", categoryId: office.id, unitOfMeasure: "ream", reorderLevel: 50 }, 120],
    [{ name: "Ballpoint Pen (Blue)", sku: "OFF-002", categoryId: office.id, unitOfMeasure: "box", reorderLevel: 15 }, 30],
    [{ name: "Ergonomic Office Chair", sku: "FURN-001", categoryId: furniture.id, unitOfMeasure: "pcs", reorderLevel: 5 }, 3],
  ] as const;

  const products: Awaited<ReturnType<typeof prisma.product.create>>[] = [];
  for (const [data] of catalogue) {
    products.push(await prisma.product.create({ data }));
  }

  // One validated receipt document with a line per product, numbered through
  // the same sequence the app uses (so the next receipt will be WH/IN/0002).
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, "WH", "RECEIPT");
    await tx.stockDocument.create({
      data: {
        reference,
        type: "RECEIPT",
        status: "DONE",
        note: "Opening stock",
        sourceLocationId: vendor.id,
        destLocationId: mainStock.id,
        validatedAt: now,
        moves: {
          create: products.map((p, i) => ({
            productId: p.id,
            quantity: catalogue[i][1],
            sourceLocationId: vendor.id,
            destLocationId: mainStock.id,
            documentType: "RECEIPT" as const,
            status: "DONE" as const,
            doneAt: now,
            reference,
          })),
        },
      },
    });
  });

  for (const product of products) {
    const onHand = await getStockOnHand(product.id, mainStock.id);
    console.log(`  ${product.sku.padEnd(9)} ${product.name.padEnd(24)} on hand @ WH/Stock: ${onHand}`);
  }

  console.log("Seeded 1 warehouse, 6 locations, 3 categories, 5 products, 1 opening receipt (WH/IN/0001).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
