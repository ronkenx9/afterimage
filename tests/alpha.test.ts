import { describe, expect, it } from "vitest";
import { surfaceAlphas, scoreSymbol, DEFAULT_ALPHA_CONFIG, type AlphaInput } from "@/packages/core/src/alpha";
import { capturedUniverse } from "@/packages/integrations/src/market-universe";

// Real captured Agent OS data (2026-09-08). Deterministic across runs.
function universe(): AlphaInput[] {
  return capturedUniverse().map((r) => ({
    symbol: r.symbol, base: r.base, quote: r.quote, assetClass: r.assetClass,
    last: r.last, changePct: r.changePct, weightedAvg: r.weightedAvg,
    high: r.high, low: r.low, quoteVolume: r.quoteVolume, bid: r.bid, ask: r.ask,
    observedAt: r.observedAt, source: r.source,
  }));
}

describe("alpha engine", () => {
  it("is deterministic — identical inputs, identical ranking", () => {
    const a = surfaceAlphas(universe());
    const b = surfaceAlphas(universe());
    expect(a.actionable.map((s) => s.symbol)).toEqual(b.actionable.map((s) => s.symbol));
    expect(a.actionable.map((s) => s.score)).toEqual(b.actionable.map((s) => s.score));
  });

  it("ranks INJ (+7.35%, liquid) as the top momentum long", () => {
    const scan = surfaceAlphas(universe());
    expect(scan.actionable[0].symbol).toBe("INJUSDT");
    expect(scan.actionable[0].strategy).toBe("momentum");
    expect(scan.actionable[0].side).toBe("BUY");
    expect(scan.actionable[0].score).toBeGreaterThan(scan.actionable[1].score);
  });

  it("classifies SUI (below VWAP, near low) as a mean-reversion buy", () => {
    const sui = surfaceAlphas(universe()).actionable.find((s) => s.symbol === "SUIUSDT");
    expect(sui).toBeDefined();
    expect(sui!.strategy).toBe("mean-reversion");
    expect(sui!.side).toBe("BUY");
    expect(sui!.signals.vwapGapPct).toBeLessThan(0);
  });

  it("gates out illiquid names below the liquidity floor", () => {
    const thin: AlphaInput = {
      symbol: "THINUSDT", base: "THIN", quote: "USDT", last: "1.10", changePct: "9.0",
      weightedAvg: "1.00", high: "1.12", low: "0.98", quoteVolume: "100000", bid: "1.099", ask: "1.101",
      observedAt: "2026-09-08T00:00:00.000Z", source: "test",
    };
    const s = scoreSymbol(thin);
    expect(s.actionable).toBe(false);
    expect(s.blockedReason).toMatch(/illiquid/i);
  });

  it("gates out wide-spread names even with strong momentum", () => {
    const wide: AlphaInput = {
      symbol: "WIDEUSDT", base: "WIDE", quote: "USDT", last: "10.0", changePct: "8.0",
      weightedAvg: "9.5", high: "10.2", low: "9.0", quoteVolume: "50000000", bid: "9.90", ask: "10.10",
      observedAt: "2026-09-08T00:00:00.000Z", source: "test",
    };
    const s = scoreSymbol(wide);
    expect(s.actionable).toBe(false);
    expect(s.blockedReason).toMatch(/spread/i);
  });

  it("never marks a SELL/fade actionable when the agent holds no inventory", () => {
    const scan = surfaceAlphas(universe(), { ...DEFAULT_ALPHA_CONFIG, allowSellWithoutInventory: false });
    expect(scan.actionable.every((s) => s.side === "BUY")).toBe(true);
  });

  it("attaches an explanatory rationale to every surfaced alpha", () => {
    for (const s of surfaceAlphas(universe()).actionable) {
      expect(s.rationale.length).toBeGreaterThan(0);
      expect(s.rationale[0].length).toBeGreaterThan(10);
    }
  });
});
