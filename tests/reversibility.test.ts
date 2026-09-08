import { describe, expect, it } from "vitest";
import { planReversal, DEFAULT_REVERSAL } from "@/packages/core/src/reversibility";
import type { OrderPlan, SymbolFilter } from "@/packages/core/src/trade";

const injFilter: SymbolFilter = {
  symbol: "INJUSDT", base: "INJ", quote: "USDT",
  minNotional: "5", minQty: "0.01", stepSize: "0.01", tickSize: "0.001",
};

const entry: OrderPlan = {
  symbol: "INJUSDT", side: "BUY", type: "MARKET",
  price: "6.427", baseQuantity: "15.55", notional: "99.94", estimatedFee: "0.10", maxSpend: "99.94",
};

describe("reversibility", () => {
  it("unwind is the exact inverse of the entry", () => {
    const r = planReversal(entry, { filter: injFilter, spreadBps: 1.5 });
    expect(r.unwind.side).toBe("SELL");
    expect(r.unwind.type).toBe("MARKET");
    expect(r.unwind.baseQuantity).toBe(entry.baseQuantity);
    expect(r.unwind.symbol).toBe(entry.symbol);
  });

  it("places the protective stop below entry for a long, on the tick grid", () => {
    const r = planReversal(entry, { filter: injFilter, spreadBps: 1.5 });
    expect(Number(r.protectiveStop.stopPrice)).toBeLessThan(Number(entry.price));
    expect(r.protectiveStop.side).toBe("SELL");
    // 2% stop => ~6.298, rounded to 0.001 tick.
    expect(Number(r.protectiveStop.stopPrice)).toBeCloseTo(6.298, 2);
    expect(r.protectiveStop.triggerPct).toBe("-2.00");
  });

  it("places the protective stop above entry for a short", () => {
    const shortEntry: OrderPlan = { ...entry, side: "SELL" };
    const r = planReversal(shortEntry, { filter: injFilter, spreadBps: 1.5 });
    expect(Number(r.protectiveStop.stopPrice)).toBeGreaterThan(Number(entry.price));
    expect(r.protectiveStop.side).toBe("BUY");
    expect(r.unwind.side).toBe("BUY");
  });

  it("charges a two-leg round-trip cost that grows with spread", () => {
    const tight = planReversal(entry, { filter: injFilter, spreadBps: 1 });
    const wide = planReversal(entry, { filter: injFilter, spreadBps: 40 });
    expect(Number(wide.roundTripCostBps)).toBeGreaterThan(Number(tight.roundTripCostBps));
    // 2 legs * (10bps fee + 5bps slip) = 30bps minimum, plus spread.
    expect(Number(tight.roundTripCostBps)).toBeGreaterThanOrEqual(30);
  });

  it("scores tight/liquid markets as more reversible than wide ones", () => {
    const tight = planReversal(entry, { filter: injFilter, spreadBps: 1 });
    const wide = planReversal(entry, { filter: injFilter, spreadBps: 60 });
    expect(tight.reversibilityScore).toBeGreaterThan(wide.reversibilityScore);
    expect(tight.reversibilityScore).toBeGreaterThan(0);
    expect(tight.reversibilityScore).toBeLessThanOrEqual(1);
  });

  it("bounds max loss by the stop distance plus round-trip cost", () => {
    const r = planReversal(entry, { filter: injFilter, spreadBps: 1.5 });
    const stopLoss = Number(entry.baseQuantity) * (Number(entry.price) - Number(r.protectiveStop.stopPrice));
    expect(Number(r.maxLossQuote)).toBeGreaterThan(stopLoss);
    expect(Number(r.maxLossQuote)).toBeLessThan(Number(entry.notional)); // stop caps it well under total
  });

  it("sets a time-boxed auto-unwind horizon", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");
    const r = planReversal(entry, { filter: injFilter, now });
    expect(r.timeBoxMinutes).toBe(DEFAULT_REVERSAL.timeBoxMinutes);
    expect(new Date(r.unwindBy).getTime()).toBe(now.getTime() + DEFAULT_REVERSAL.timeBoxMinutes * 60_000);
  });
});
