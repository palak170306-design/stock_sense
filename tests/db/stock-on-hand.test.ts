/**
 * getStockOnHand() against a real Postgres (isolated test schema).
 *
 * It is THE definition of stock in this app, so these tests pin down its
 * rules: only DONE moves count, incoming adds, outgoing subtracts, and
 * nothing leaks across products or locations. The grouped reporting query
 * (getStockLevels) must agree with it.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getStockOnHand } from "@/lib/stock";
import { getStockLevels } from "@/lib/stock/levels";
import { resetDb, seedWorld } from "../helpers";

let w: Awaited<ReturnType<typeof seedWorld>>;

/** Insert one raw move (bypassing documents) to control status precisely. */
function move(
  from: { id: string },
  to: { id: string },
  quantity: number,
  status: "DRAFT" | "READY" | "DONE" | "CANCELED" = "DONE",
  productId = w.widget.id
) {
  return prisma.stockMove.create({
    data: {
      productId,
      quantity,
      sourceLocationId: from.id,
      destLocationId: to.id,
      documentType: "RECEIPT",
      status,
      doneAt: status === "DONE" ? new Date() : null,
    },
  });
}

beforeEach(async () => {
  await resetDb();
  w = await seedWorld();
});

describe("getStockOnHand", () => {
  it("is 0 for a product that has never moved", async () => {
    expect(await getStockOnHand(w.widget.id, w.stock.id)).toBe(0);
  });

  it("adds DONE moves into the location and subtracts DONE moves out of it", async () => {
    await move(w.vendor, w.stock, 50); // +50
    await move(w.stock, w.customer, 20); // −20
    await move(w.stock, w.shelf, 5); // −5 here, +5 on the shelf
    expect(await getStockOnHand(w.widget.id, w.stock.id)).toBe(25);
    expect(await getStockOnHand(w.widget.id, w.shelf.id)).toBe(5);
  });

  it("ignores moves that are not DONE (draft, ready, canceled haven't happened)", async () => {
    await move(w.vendor, w.stock, 50);
    await move(w.vendor, w.stock, 100, "DRAFT");
    await move(w.vendor, w.stock, 100, "READY");
    await move(w.stock, w.customer, 30, "CANCELED");
    expect(await getStockOnHand(w.widget.id, w.stock.id)).toBe(50);
  });

  it("isolates products and locations from each other", async () => {
    const other = await prisma.product.create({
      data: { name: "Other", sku: "O-1", categoryId: w.category.id, reorderLevel: 0 },
    });
    await move(w.vendor, w.stock, 40);
    await move(w.vendor, w.shelf, 7, "DONE", other.id);
    expect(await getStockOnHand(w.widget.id, w.shelf.id)).toBe(0);
    expect(await getStockOnHand(other.id, w.stock.id)).toBe(0);
    expect(await getStockOnHand(other.id, w.shelf.id)).toBe(7);
  });

  it("works inside a transaction and sees that transaction's own writes", async () => {
    const seen = await prisma.$transaction(async (tx) => {
      await tx.stockMove.create({
        data: {
          productId: w.widget.id, quantity: 9, sourceLocationId: w.vendor.id, destLocationId: w.stock.id,
          documentType: "RECEIPT", status: "DONE", doneAt: new Date(),
        },
      });
      return getStockOnHand(w.widget.id, w.stock.id, tx);
    });
    expect(seen).toBe(9);
  });
});

describe("the database guards the ledger (CHECK constraints)", () => {
  it("rejects zero/negative quantities and self-moves", async () => {
    await expect(move(w.vendor, w.stock, 0)).rejects.toThrow();
    await expect(move(w.vendor, w.stock, -3)).rejects.toThrow();
    await expect(move(w.stock, w.stock, 1)).rejects.toThrow();
  });
});

describe("getStockLevels (grouped totals for the dashboard)", () => {
  it("equals the sum of getStockOnHand over internal locations; transfers don't change totals", async () => {
    await move(w.vendor, w.stock, 30);
    await move(w.stock, w.shelf, 12); // internal → internal: total unchanged
    await move(w.shelf, w.customer, 4);
    const perLocation = (await getStockOnHand(w.widget.id, w.stock.id)) + (await getStockOnHand(w.widget.id, w.shelf.id));
    const [level] = await getStockLevels([w.widget.id]);
    expect(perLocation).toBe(26);
    expect(level).toMatchObject({ onHand: 26, status: "OK" });
  });

  it("classifies low and out of stock against the reorder level (10)", async () => {
    let [level] = await getStockLevels([w.widget.id]);
    expect(level.status).toBe("OUT"); // never stocked
    await move(w.vendor, w.stock, 10);
    [level] = await getStockLevels([w.widget.id]);
    expect(level.status).toBe("LOW"); // exactly at reorder level
  });
});
