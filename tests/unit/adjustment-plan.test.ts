/**
 * UNIT TESTS: pure logic, no database.
 *
 * planAdjustment() turns (recorded, counted) into the one corrective move an
 * adjustment books. These tests pin down the sign → direction rule that
 * makes derived stock equal the physical count afterwards.
 */
import { describe, expect, it } from "vitest";
import { planAdjustment } from "@/lib/stock/operations";
import { stockStatus } from "@/lib/stock/levels";
import { adjustmentCreateSchema, transferCreateSchema } from "@/lib/validation/stock";

const SHELF = "shelf";
const LOSS = "loss";

describe("planAdjustment (recorded vs counted → corrective move)", () => {
  it("counted > recorded: books the surplus FROM inventory loss INTO the location", () => {
    // Recorded 10, found 12 → +2 must flow into the shelf.
    expect(planAdjustment(10, 12, SHELF, LOSS)).toEqual({
      delta: 2,
      quantity: 2,
      sourceLocationId: LOSS,
      destLocationId: SHELF,
    });
  });

  it("counted < recorded: books the shortfall FROM the location INTO inventory loss", () => {
    // Recorded 10, found 7 → 3 must leave the shelf. Quantity stays positive;
    // the direction carries the minus sign.
    expect(planAdjustment(10, 7, SHELF, LOSS)).toEqual({
      delta: -3,
      quantity: 3,
      sourceLocationId: SHELF,
      destLocationId: LOSS,
    });
  });

  it("counted = recorded: nothing to book (a move can't have quantity 0)", () => {
    expect(planAdjustment(5, 5, SHELF, LOSS)).toBeNull();
  });

  it("counting an empty shelf writes off everything recorded", () => {
    expect(planAdjustment(8, 0, SHELF, LOSS)).toMatchObject({ delta: -8, quantity: 8, sourceLocationId: SHELF });
  });

  it("recovers from a negative recorded balance (e.g. bad historic data)", () => {
    // Recorded −2, counted 3 → +5, so on-hand ends at exactly 3.
    expect(planAdjustment(-2, 3, SHELF, LOSS)).toMatchObject({ delta: 5, quantity: 5, destLocationId: SHELF });
  });

  it("applying the plan always lands on the counted number", () => {
    // Property-style check over a grid of values: recorded ± move == counted.
    for (let recorded = 0; recorded <= 20; recorded += 4) {
      for (let counted = 0; counted <= 20; counted += 3) {
        const plan = planAdjustment(recorded, counted, SHELF, LOSS);
        const after = !plan ? recorded : plan.destLocationId === SHELF ? recorded + plan.quantity : recorded - plan.quantity;
        expect(after).toBe(counted);
      }
    }
  });
});

describe("stockStatus (dashboard / alerts classification)", () => {
  it("OUT at zero or below, LOW at or below reorder level, OK above", () => {
    expect(stockStatus(0, 5)).toBe("OUT");
    expect(stockStatus(-1, 5)).toBe("OUT");
    expect(stockStatus(5, 5)).toBe("LOW"); // "at or below" is inclusive
    expect(stockStatus(1, 5)).toBe("LOW");
    expect(stockStatus(6, 5)).toBe("OK");
    expect(stockStatus(1, 0)).toBe("OK"); // reorder level 0 → only OUT alerts
  });
});

describe("input validation edge cases (zod)", () => {
  const base = { sourceLocationId: "a", destLocationId: "b", lines: [{ productId: "p", quantity: 1 }] };

  it("rejects a self-transfer (same source and destination)", () => {
    expect(transferCreateSchema.safeParse({ ...base, destLocationId: "a" }).success).toBe(false);
  });
  it("rejects zero, negative and fractional transfer quantities", () => {
    for (const quantity of [0, -5, 1.5]) {
      expect(transferCreateSchema.safeParse({ ...base, lines: [{ productId: "p", quantity }] }).success).toBe(false);
    }
  });
  it("rejects the same product twice in one transfer", () => {
    const lines = [{ productId: "p", quantity: 1 }, { productId: "p", quantity: 2 }];
    expect(transferCreateSchema.safeParse({ ...base, lines }).success).toBe(false);
  });
  it("accepts a zero count but rejects negative counts and a missing reason", () => {
    const adj = { productId: "p", locationId: "l", countedQuantity: 0, reason: "cycle count" };
    expect(adjustmentCreateSchema.safeParse(adj).success).toBe(true);
    expect(adjustmentCreateSchema.safeParse({ ...adj, countedQuantity: -1 }).success).toBe(false);
    expect(adjustmentCreateSchema.safeParse({ ...adj, reason: "  " }).success).toBe(false);
  });
});
