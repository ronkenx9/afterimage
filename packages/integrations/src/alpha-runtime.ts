// Runtime glue: pull the live universe and run the pure engine over it.
// Shared by the API routes, the server-rendered agent console, and the daemon.

import { surfaceAlphas, type AlphaConfig, type AlphaScan } from "@/packages/core/src/alpha";
import { runAgentCycle, type AgentConfig, type AgentCycleReport, type AgentObservation } from "@/packages/core/src/agent";
import { loadUniverse, DEFAULT_UNIVERSE, type MarketRow } from "@/packages/integrations/src/market-universe";
import { scanPatterns, bestLivePattern } from "@/packages/integrations/src/pattern-runtime";

function toObservations(rows: MarketRow[]): AgentObservation[] {
  return rows.map((r) => ({
    symbol: r.symbol,
    base: r.base,
    quote: r.quote,
    assetClass: r.assetClass,
    last: r.last,
    changePct: r.changePct,
    weightedAvg: r.weightedAvg,
    high: r.high,
    low: r.low,
    quoteVolume: r.quoteVolume,
    bid: r.bid,
    ask: r.ask,
    observedAt: r.observedAt,
    source: r.source,
    filter: r.filter,
  }));
}

export type UniverseMeta = {
  source: MarketRow["source"];
  symbols: string[];
  observedAt: string;
};

function meta(rows: MarketRow[]): UniverseMeta {
  return {
    source: rows[0]?.source ?? "captured-live",
    symbols: rows.map((r) => r.symbol),
    observedAt: rows[0]?.observedAt ?? new Date().toISOString(),
  };
}

/** Read the market and surface ranked alphas (no planning). */
export async function scanUniverse(
  symbols: readonly string[] = DEFAULT_UNIVERSE,
  alphaConfig?: AlphaConfig,
): Promise<{ meta: UniverseMeta; scan: AlphaScan }> {
  const rows = await loadUniverse(symbols);
  return { meta: meta(rows), scan: surfaceAlphas(toObservations(rows), alphaConfig) };
}

/**
 * Read the market and run a full agent cycle (alphas → plans → reversal → gated
 * proposals). Also scans the pattern engine over real historical candles and
 * attaches the strongest firing pattern (with its learned edge) to each proposal
 * as advisory evidence — post-hash, so it never alters the approved order.
 * `patterns` is best-effort: if candles are unavailable it is simply absent.
 */
export async function runCycle(
  agentConfig?: AgentConfig,
  symbols: readonly string[] = DEFAULT_UNIVERSE,
): Promise<{ meta: UniverseMeta; report: AgentCycleReport; patternBreadth: Awaited<ReturnType<typeof scanPatterns>>["breadth"] }> {
  const [rows, patterns] = await Promise.all([
    loadUniverse(symbols),
    scanPatterns(symbols).catch(() => null),
  ]);
  const report = runAgentCycle(toObservations(rows), agentConfig);
  if (patterns) {
    const bySymbol = new Map(patterns.symbols.map((s) => [s.symbol, s]));
    for (const p of report.proposals) {
      const evidence = bestLivePattern(bySymbol.get(p.alpha.symbol));
      if (evidence) p.patternEvidence = evidence;
    }
  }
  return { meta: meta(rows), report, patternBreadth: patterns?.breadth ?? [] };
}

/** Read historical candles and learn what each setup did — the pattern scan. */
export async function runPatternScan(symbols: readonly string[] = DEFAULT_UNIVERSE, interval = "1h") {
  return scanPatterns(symbols, interval);
}
