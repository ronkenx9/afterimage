// Pattern-engine runtime: pull real historical candles for the universe, learn
// what each setup did, and report what is firing NOW with its learned edge —
// including cross-symbol breadth ("who else was firing when this worked").

import {
  backtestPatterns,
  livePatterns,
  DEFAULT_PATTERN_CONFIG,
  type LivePattern,
  type PatternBacktest,
  type PatternId,
} from "@/packages/core/src/patterns";
import { loadKlines, DEFAULT_UNIVERSE } from "@/packages/integrations/src/market-universe";

export type SymbolPatterns = {
  symbol: string;
  bars: number;
  backtest: PatternBacktest;
  firingNow: LivePattern[];
};

export type BreadthEntry = { id: PatternId; label: string; firingSymbols: string[]; count: number };

export type PatternScan = {
  scannedAt: string;
  interval: string;
  source: "live" | "unavailable";
  symbols: SymbolPatterns[];
  /** Which patterns are firing across MULTIPLE names right now — market breadth. */
  breadth: BreadthEntry[];
};

/**
 * Scan the universe. Deterministic given the candle data. When candles are
 * unavailable (offline/geo-blocked with no cache) it returns an empty, labeled
 * scan rather than fabricating history.
 */
export async function scanPatterns(
  symbols: readonly string[] = DEFAULT_UNIVERSE,
  interval = "1h",
  limit = 240,
): Promise<PatternScan> {
  const now = new Date().toISOString();
  const series = await Promise.all(
    symbols.map(async (symbol) => ({ symbol, candles: await loadKlines(symbol, interval, limit) })),
  );

  const symbolsOut: SymbolPatterns[] = [];
  const breadthMap = new Map<PatternId, { label: string; symbols: string[] }>();

  for (const { symbol, candles } of series) {
    if (!candles || candles.length < 40) continue;
    const backtest = backtestPatterns(candles, interval, DEFAULT_PATTERN_CONFIG);
    const firingNow = livePatterns(candles, backtest, DEFAULT_PATTERN_CONFIG);
    symbolsOut.push({ symbol, bars: candles.length, backtest, firingNow });
    for (const p of firingNow) {
      const b = breadthMap.get(p.id) ?? { label: p.label, symbols: [] };
      b.symbols.push(symbol);
      breadthMap.set(p.id, b);
    }
  }

  const breadth: BreadthEntry[] = [...breadthMap.entries()]
    .map(([id, b]) => ({ id, label: b.label, firingSymbols: b.symbols, count: b.symbols.length }))
    .sort((a, b) => b.count - a.count);

  return {
    scannedAt: now,
    interval,
    source: symbolsOut.length > 0 ? "live" : "unavailable",
    symbols: symbolsOut,
    breadth,
  };
}

/**
 * Look up the strongest live pattern for one symbol — used by the agent to back
 * a proposal with learned evidence. Returns null if nothing is firing / no data.
 */
export function bestLivePattern(sp: SymbolPatterns | undefined): LivePattern | null {
  if (!sp || sp.firingNow.length === 0) return null;
  // Prefer a firing pattern that has learned history, ranked by |expectancy|.
  const withHistory = sp.firingNow
    .filter((p) => p.history)
    .sort((a, b) => Math.abs(b.history!.expectancyPct) - Math.abs(a.history!.expectancyPct));
  return withHistory[0] ?? sp.firingNow[0];
}
