/**
 * INTEGRATION TEST: the core inventory loop through the real engine
 * (createStockDocument → validateDocument, createAdjustment), in the same
 * transactions the API routes use:
 *
 *   receipt    +50  Vendors  → WH/Stock
 *   delivery   −20  WH/Stock → Customers
 *   transfer    10  WH/Stock → WH/Shelf A   (moves stock, total unchanged)
 *   adjustment  −3  WH/Stock → Inventory Loss (counted 17 vs recorded 20)
 *
 * Then asserts the derived on-hand everywhere AND that the ledger holds
 * exactly the four expected DONE moves. Also covers the guard rails:
 * insufficient stock, double validation, cancel.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getStockOnHand } from "@/lib/stock";
import { cancelDocument, StockError, validateDocument } from "@/lib/stock/documents";
import { getStockLevels } from "@/lib/stock/levels";
import { createAdjustment, createStockDocument } from "@/lib/stock/operations";
import { createAndValidate, resetDb, seedWorld } from "../helpers";

let w: Awaited<ReturnType<typeof seedWorld>>;
const onHand = (loc: { id: string }) => getStockOnHand(w.widget.id, loc.id);

describe("core loop: receipt → delivery → transfer → adjustment", () => {
  beforeAll(async () => {
    await resetDb();
    w = await seedWorld();
  });

  it("receipt +50 puts stock in WH/Stock", async () => {
    await createAndValidate(
      { type: "RECEIPT", warehouseCode: "WH", sourceLocationId: w.vendor.id, destLocationId: w.stock.id, lines: [{ productId: w.widget.id, quantity: 50 }] },
      w.user.id
    );
    expect(await onHand(w.stock)).toBe(50);
  });

  it("delivery −20 takes stock out to the customer", async () => {
    await createAndValidate(
      { type: "DELIVERY", warehouseCode: "WH", sourceLocationId: w.stock.id, destLocationId: w.customer.id, lines: [{ productId: w.widget.id, quantity: 20 }] },
      w.user.id
    );
    expect(await onHand(w.stock)).toBe(30);
  });

  it("transfer 10 moves stock between shelves without changing the total", async () => {
    await createAndValidate(
      { type: "INTERNAL", warehouseCode: "WH", sourceLocationId: w.stock.id, destLocationId: w.shelf.id, lines: [{ productId: w.widget.id, quantity: 10 }] },
      w.user.id
    );
    expect(await onHand(w.stock)).toBe(20);
    expect(await onHand(w.shelf)).toBe(10);
    expect((await getStockLevels([w.widget.id]))[0].onHand).toBe(30); // 50 − 20, unchanged by the transfer
  });

  it("adjustment: counted 17 vs recorded 20 books −3 to inventory loss", async () => {
    const adj = await prisma.$transaction((tx) =>
      createAdjustment(tx, {
        productId: w.widget.id, unitOfMeasure: "pcs", locationId: w.stock.id, warehouseCode: "WH",
        lossLocationId: w.loss.id, countedQuantity: 17, reason: "cycle count", userId: w.user.id,
      })
    );
    expect(adj).toMatchObject({ delta: -3, recordedQuantity: 20, countedQuantity: 17, status: "DONE" });
    expect(await onHand(w.stock)).toBe(17); // on-hand now equals the physical count
  });

  it("final on-hand: WH/Stock 17, Shelf A 10, total 27", async () => {
    expect(await onHand(w.stock)).toBe(17);
    expect(await onHand(w.shelf)).toBe(10);
    expect((await getStockLevels([w.widget.id]))[0]).toMatchObject({ onHand: 27, status: "OK" });
  });

  it("the ledger holds exactly the four expected DONE moves, in order", async () => {
    const moves = await prisma.stockMove.findMany({
      orderBy: { createdAt: "asc" },
      include: { sourceLocation: true, destLocation: true },
    });
    expect(
      moves.map((m) => [m.documentType, m.quantity, m.sourceLocation.name, m.destLocation.name, m.status, m.reference])
    ).toEqual([
      ["RECEIPT", 50, "Vendors", "WH/Stock", "DONE", "WH/IN/0001"],
      ["DELIVERY", 20, "WH/Stock", "Customers", "DONE", "WH/OUT/0001"],
      ["INTERNAL", 10, "WH/Stock", "WH/Shelf A", "DONE", "WH/INT/0001"],
      ["ADJUSTMENT", 3, "WH/Stock", "Inventory Loss", "DONE", "WH/ADJ/0001"],
    ]);
    expect(moves.every((m) => m.doneAt && m.documentId)).toBe(true);
  });

  it("replaying the ledger by hand reproduces on-hand (single source of truth)", async () => {
    const done = await prisma.stockMove.findMany({ where: { status: "DONE" } });
    const net = (locId: string) =>
      done.reduce((sum, m) => sum + (m.destLocationId === locId ? m.quantity : 0) - (m.sourceLocationId === locId ? m.quantity : 0), 0);
    expect(net(w.stock.id)).toBe(17);
    expect(net(w.shelf.id)).toBe(10);
    expect(net(w.loss.id)).toBe(3); // inventory loss has absorbed the shrinkage
  });
});

describe("guard rails", () => {
  beforeAll(async () => {
    await resetDb();
    w = await seedWorld();
    await createAndValidate(
      { type: "RECEIPT", warehouseCode: "WH", sourceLocationId: w.vendor.id, destLocationId: w.stock.id, lines: [{ productId: w.widget.id, quantity: 5 }] },
      w.user.id
    );
  });

  it("refuses to validate a delivery larger than on-hand, and changes nothing", async () => {
    const doc = await prisma.$transaction((tx) =>
      createStockDocument(tx, { type: "DELIVERY", warehouseCode: "WH", sourceLocationId: w.stock.id, destLocationId: w.customer.id, lines: [{ productId: w.widget.id, quantity: 8 }] })
    );
    const attempt = prisma.$transaction((tx) => validateDocument(tx, doc.id, w.user.id));
    await expect(attempt).rejects.toThrow(/Insufficient stock.*5 on hand, 8 pcs needed/);
    await expect(attempt).rejects.toBeInstanceOf(StockError);
    // Rolled back: still a draft, stock untouched.
    expect((await prisma.stockDocument.findUniqueOrThrow({ where: { id: doc.id } })).status).toBe("DRAFT");
    expect(await onHand(w.stock)).toBe(5);
  });

  it("refuses to validate the same document twice", async () => {
    const doc = await createAndValidate(
      { type: "INTERNAL", warehouseCode: "WH", sourceLocationId: w.stock.id, destLocationId: w.shelf.id, lines: [{ productId: w.widget.id, quantity: 1 }] },
      w.user.id
    );
    await expect(prisma.$transaction((tx) => validateDocument(tx, doc.id, w.user.id))).rejects.toThrow(/already validated/);
    expect(await onHand(w.shelf)).toBe(1); // not moved twice
  });

  it("canceled documents can't be validated and never affect stock", async () => {
    const doc = await prisma.$transaction((tx) =>
      createStockDocument(tx, { type: "INTERNAL", warehouseCode: "WH", sourceLocationId: w.stock.id, destLocationId: w.shelf.id, lines: [{ productId: w.widget.id, quantity: 2 }] })
    );
    await prisma.$transaction((tx) => cancelDocument(tx, doc.id));
    await expect(prisma.$transaction((tx) => validateDocument(tx, doc.id, w.user.id))).rejects.toThrow(/canceled/);
    expect(await prisma.stockMove.count({ where: { documentId: doc.id, status: "CANCELED" } })).toBe(1);
    expect(await onHand(w.shelf)).toBe(1);
  });

  it("an adjustment whose count matches the record is rejected (nothing to book)", async () => {
    const recorded = await onHand(w.stock);
    await expect(
      prisma.$transaction((tx) =>
        createAdjustment(tx, {
          productId: w.widget.id, unitOfMeasure: "pcs", locationId: w.stock.id, warehouseCode: "WH",
          lossLocationId: w.loss.id, countedQuantity: recorded, reason: "recount",
        })
      )
    ).rejects.toThrow(/nothing to adjust/);
  });
});
