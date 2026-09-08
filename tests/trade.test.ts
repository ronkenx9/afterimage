import { describe, expect, it } from "vitest";
import { planOrder, type SymbolFilter } from "@/packages/core/src/trade";

const SOL: SymbolFilter = {
  symbol: "SOLUSDT",
  base: "SOL",
  quote: "USDT",
  minNotional: "5",
  minQty: "0.001",
  stepSize: "0.001",
  tickSize: "0.01",
};

describe("planOrder", () => {
  it("plans a MARKET BUY from a spend, flooring the lot without overspending", () => {
    const result = planOrder(
      { symbol: "SOLUSDT", side: "BUY", type: "MARKET", quoteAmount: "50" },
      { filter: SOL, referencePrice: "203.40" },
    );
    expect(result).toMatchObject({
      status: "eligible",
      plan: { side: "BUY", type: "MARKET", baseQuantity: "0.245", notional: "49.83", estimatedFee: "0.05" },
    });
  });

  it("plans a MARKET SELL from an explicit base quantity", () => {
    const result = planOrder(
      { symbol: "SOLUSDT", side: "SELL", type: "MARKET", baseQuantity: "0.5" },
      { filter: SOL, referencePrice: "203.40" },
    );
    expect(result).toMatchObject({ status: "eligible", plan: { side: "SELL", notional: "101.70" } });
  });

  it("prices a LIMIT order off the limit, not the mark", () => {
    const result = planOrder(
      { symbol: "SOLUSDT", side: "BUY", type: "LIMIT", baseQuantity: "0.1", limitPrice: "150" },
      { filter: SOL, referencePrice: "203.40" },
    );
    expect(result).toMatchObject({ status: "eligible", plan: { price: "150", notional: "15.00" } });
  });

  it("blocks below the symbol minimum notional", () => {
    const result = planOrder(
      { symbol: "SOLUSDT", side: "BUY", type: "MARKET", quoteAmount: "4" },
      { filter: SOL, referencePrice: "203.40" },
    );
    expect(result.status).toBe("blocked");
  });

  it("blocks above the per-order risk cap", () => {
    const result = planOrder(
      { symbol: "SOLUSDT", side: "BUY", type: "MARKET", quoteAmount: "300" },
      { filter: SOL, referencePrice: "203.40" },
    );
    expect(result.status).toBe("blocked");
  });

  it("blocks when the filter symbol does not match the request", () => {
    const result = planOrder(
      { symbol: "BTCUSDT", side: "BUY", type: "MARKET", quoteAmount: "50" },
      { filter: SOL, referencePrice: "203.40" },
    );
    expect(result.status).toBe("blocked");
  });
});
