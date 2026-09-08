import { describe, expect, it } from "vitest";
import { sma, ema, rsi, atr, donchian, type Candle } from "@/packages/core/src/indicators";
import { backtestPatterns, livePatterns, DEFAULT_PATTERN_CONFIG } from "@/packages/core/src/patterns";

function candlesFromCloses(cl: number[]): Candle[] {
  return cl.map((c, i) => ({
    openTime: i * 3_600_000,
    open: i === 0 ? c : cl[i - 1],
    high: c * 1.004,
    low: c * 0.996,
    close: c,
    volume: 1000,
  }));
}

describe("indicators", () => {
  it("sma matches a hand calculation", () => {
    const s = sma([1, 2, 3, 4, 5], 3);
    expect(s[2]).toBeCloseTo(2, 9);
    expect(s[4]).toBeCloseTo(4, 9);
    expect(Number.isNaN(s[1])).toBe(true);
  });

  it("ema is seeded and deterministic", () => {
    const e = ema([1, 2, 3, 4, 5, 6], 3);
    expect(Number.isNaN(e[1])).toBe(true);
    expect(e[2]).toBeCloseTo(2, 9); // seed = sma of first 3
    expect(ema([1, 2, 3, 4, 5, 6], 3)).toEqual(e); // deterministic
  });

  it("rsi stays within [0,100] and reads ~100 on a pure uptrend", () => {
    const up = Array.from({ length: 40 }, (_, i) => 100 + i);
    const r = rsi(up, 14);
    const last = r[r.length - 1];
    expect(last).toBeGreaterThan(90);
    expect(last).toBeLessThanOrEqual(100);
  });

  it("atr and donchian produce values once seeded", () => {
    const c = candlesFromCloses(Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 5));
    const a = atr(c, 14);
    const d = donchian(c, 20);
    expect(a[a.length - 1]).toBeGreaterThan(0);
    expect(d.upper[d.upper.length - 1]).toBeGreaterThan(d.lower[d.lower.length - 1]);
  });
});

describe("pattern engine", () => {
  // A series that dips then trends up hard → produces oversold bounce, golden
  // cross, and breakouts, all with positive forward returns.
  const closesArr = [
    ...Array.from({ length: 25 }, (_, i) => 100 - i * 0.8), // decline
    ...Array.from({ length: 60 }, (_, i) => 80 + i * 1.2), // recovery + trend up
  ];
  const candles = candlesFromCloses(closesArr);

  it("is deterministic", () => {
    const a = backtestPatterns(candles, "1h");
    const b = backtestPatterns(candles, "1h");
    expect(a).toEqual(b);
  });

  it("learns per-pattern outcomes with counted occurrences", () => {
    const bt = backtestPatterns(candles, "1h");
    expect(bt.bars).toBe(candles.length);
    expect(bt.horizon).toBe(DEFAULT_PATTERN_CONFIG.horizon);
    expect(bt.stats.length).toBeGreaterThan(0);
    for (const s of bt.stats) {
      expect(s.occurrences).toBeGreaterThan(0);
      expect(s.hitRate).toBeGreaterThanOrEqual(0);
      expect(s.hitRate).toBeLessThanOrEqual(1);
      expect(Number.isFinite(s.expectancyPct)).toBe(true);
    }
  });

  it("detects a breakout during the uptrend and scores it as a winning long", () => {
    const bt = backtestPatterns(candles, "1h");
    const breakout = bt.stats.find((s) => s.id === "donchian_breakout");
    expect(breakout).toBeDefined();
    expect(breakout!.direction).toBe("long");
    // In a clean uptrend, breakouts should have followed through more often than not.
    expect(breakout!.hitRate).toBeGreaterThan(0.5);
  });

  it("reports live patterns on the last bar with attached history", () => {
    const bt = backtestPatterns(candles, "1h");
    const live = livePatterns(candles, bt);
    // Every live pattern carries a label + direction; history is present when it
    // occurred earlier in the window.
    for (const p of live) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(["long", "avoid"]).toContain(p.direction);
    }
  });

  it("classifies a failed breakout as an avoid setup", () => {
    // Break above a prior high, then immediately close back below it.
    const trap = candlesFromCloses([
      ...Array.from({ length: 22 }, () => 100),
      108, // breakout bar
      99, // slams back inside → failed breakout on this bar
      ...Array.from({ length: 12 }, () => 98),
    ]);
    const bt = backtestPatterns(trap, "1h");
    const failed = bt.stats.find((s) => s.id === "failed_breakout");
    expect(failed).toBeDefined();
    expect(failed!.direction).toBe("avoid");
  });
});
