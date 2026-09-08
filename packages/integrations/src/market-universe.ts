// Live multi-symbol market universe for the autonomous alpha agent.
//
// On a networked server this pulls the real 24h ticker + exchange filters from
// Binance's public Spot REST API. When the network is unavailable (e.g. an
// offline sandbox) it falls back to a frozen snapshot of REAL data captured from
// an authenticated Agent OS `spot_ticker24hr` / `spot_exchangeInfo` session on
// 2026-09-08, so the engine is always grounded in genuine numbers and stays
// deterministic in tests. Every row is labeled with its `source`.
//
// Market reads are public and read-only. No account, funds, or order are touched.

import { z } from "zod";
import type { SymbolFilter } from "@/packages/core/src/trade";

export type MarketSource = "live" | "captured-live" | "replay-fallback";

export type MarketRow = {
  symbol: string;
  base: string;
  quote: string;
  assetClass: "crypto" | "stock";
  last: string;
  changePct: string; // 24h price change %
  weightedAvg: string; // 24h VWAP
  high: string;
  low: string;
  quoteVolume: string; // 24h traded value in quote asset
  bid: string;
  ask: string;
  observedAt: string;
  source: MarketSource;
  filter: SymbolFilter;
  filterSource: "live" | "captured-live" | "default";
};

// Default crypto universe. Symbol-agnostic downstream — extend freely.
export const DEFAULT_UNIVERSE = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "SUIUSDT", "INJUSDT",
] as const;

// Tokenized-stock tickers the agent probes for a "creative equity sleeve". As of
// the capture these are NOT listed on the Agent OS Spot surface (Invalid symbol),
// so the sleeve is discovery-gated: it only surfaces equities the live
// exchangeInfo actually lists. Nothing here is fabricated.
export const STOCK_PROBE = ["AAPLUSDT", "TSLAUSDT", "COINUSDT", "NVDAUSDT", "MSTRUSDT"] as const;

const defaultFilter = (symbol: string, base: string, quote: string): SymbolFilter => ({
  symbol,
  base,
  quote,
  minNotional: "5",
  minQty: "0.00001",
  stepSize: "0.00001",
  tickSize: "0.00000001",
});

// ── Frozen REAL capture (authenticated Agent OS session, 2026-09-08T13:36Z) ──
const CAPTURED_AT = "2026-09-08T13:36:05.000Z";
type Cap = Omit<MarketRow, "source" | "filterSource" | "assetClass"> & { filterSource: "captured-live" | "default" };

const CAPTURED: Cap[] = [
  row("BTCUSDT", "BTC", "USDT", "78397.36", "-1.012", "78555.13349691", "79485.00", "77620.01", "1471239426.63", "78397.35", "78397.36", "default"),
  row("ETHUSDT", "ETH", "USDT", "2484.16", "-0.334", "2482.20139407", "2507.99", "2441.68", "629768799.19", "2484.15", "2484.16", "default"),
  row("SOLUSDT", "SOL", "USDT", "103.54", "-0.385", "103.41640702", "104.83", "101.72", "203793541.12", "103.54", "103.55", "default"),
  row("BNBUSDT", "BNB", "USDT", "748.90", "1.211", "750.38293000", "761.39", "736.06", "134335592.42", "748.89", "748.90", "default"),
  { ...row("XRPUSDT", "XRP", "USDT", "1.42960", "2.370", "1.40687417", "1.45070", "1.38120", "171331163.94", "1.42960", "1.42970", "captured-live"), filter: { symbol: "XRPUSDT", base: "XRP", quote: "USDT", minNotional: "5", minQty: "0.1", stepSize: "0.1", tickSize: "0.0001" } },
  row("DOGEUSDT", "DOGE", "USDT", "0.08956", "-0.500", "0.09002623", "0.09170", "0.08800", "80138606.48", "0.08955", "0.08956", "default"),
  row("AVAXUSDT", "AVAX", "USDT", "7.98", "-1.554", "8.05709846", "8.199", "7.83", "36600633.93", "7.979", "7.98", "default"),
  row("LINKUSDT", "LINK", "USDT", "12.63", "-0.941", "12.64941222", "12.84", "12.291", "30295743.25", "12.629", "12.63", "default"),
  { ...row("SUIUSDT", "SUI", "USDT", "0.81040", "-1.924", "0.81996959", "0.83690", "0.79550", "66887046.57", "0.81040", "0.81050", "captured-live"), filter: { symbol: "SUIUSDT", base: "SUI", quote: "USDT", minNotional: "5", minQty: "0.1", stepSize: "0.1", tickSize: "0.0001" } },
  { ...row("INJUSDT", "INJ", "USDT", "6.42700", "7.349", "6.34146766", "6.71400", "5.95500", "30390943.55", "6.42700", "6.42800", "captured-live"), filter: { symbol: "INJUSDT", base: "INJ", quote: "USDT", minNotional: "5", minQty: "0.01", stepSize: "0.01", tickSize: "0.001" } },
];

function row(
  symbol: string, base: string, quote: string,
  last: string, changePct: string, weightedAvg: string, high: string, low: string,
  quoteVolume: string, bid: string, ask: string, filterSource: "captured-live" | "default",
): Cap {
  return {
    symbol, base, quote, last, changePct, weightedAvg, high, low, quoteVolume, bid, ask,
    observedAt: CAPTURED_AT, filter: defaultFilter(symbol, base, quote), filterSource,
  };
}

export function capturedUniverse(): MarketRow[] {
  return CAPTURED.map((c) => ({ ...c, assetClass: "crypto", source: "captured-live" }));
}

// ── Live path ──
const tickerSchema = z.object({
  symbol: z.string(),
  lastPrice: z.string(),
  priceChangePercent: z.string(),
  weightedAvgPrice: z.string(),
  highPrice: z.string(),
  lowPrice: z.string(),
  quoteVolume: z.string(),
  bidPrice: z.string(),
  askPrice: z.string(),
  closeTime: z.number(),
});

const exFilterSchema = z.object({
  symbols: z.array(
    z.object({
      symbol: z.string(),
      baseAsset: z.string(),
      quoteAsset: z.string(),
      filters: z.array(z.record(z.string(), z.unknown())),
    }),
  ),
});

function filterFromExchangeInfo(sym: z.infer<typeof exFilterSchema>["symbols"][number]): SymbolFilter {
  const byType = (t: string) => sym.filters.find((f) => f.filterType === t) ?? {};
  const lot = byType("LOT_SIZE") as { minQty?: string; stepSize?: string };
  const price = byType("PRICE_FILTER") as { tickSize?: string };
  const notional = byType("NOTIONAL") as { minNotional?: string };
  return {
    symbol: sym.symbol,
    base: sym.baseAsset,
    quote: sym.quoteAsset,
    minNotional: notional.minNotional ?? "5",
    minQty: lot.minQty ?? "0.00001",
    stepSize: lot.stepSize ?? "0.00001",
    tickSize: price.tickSize ?? "0.00000001",
  };
}

/**
 * Fetch the live universe from Binance public REST. Returns `null` on any
 * failure so the caller can fall back to the captured snapshot.
 */
export async function fetchLiveUniverse(symbols: readonly string[]): Promise<MarketRow[] | null> {
  const base = process.env.BINANCE_MARKET_BASE_URL ?? "https://api.binance.com";
  try {
    const q = encodeURIComponent(JSON.stringify([...symbols]));
    const [tickRes, exRes] = await Promise.all([
      fetch(`${base}/api/v3/ticker/24hr?symbols=${q}`, { cache: "no-store", signal: AbortSignal.timeout(5_000) }),
      fetch(`${base}/api/v3/exchangeInfo?symbols=${q}`, { cache: "no-store", signal: AbortSignal.timeout(5_000) }),
    ]);
    if (!tickRes.ok || !exRes.ok) return null;
    const ticks = z.array(tickerSchema).parse(await tickRes.json());
    const ex = exFilterSchema.parse(await exRes.json());
    const filters = new Map(ex.symbols.map((s) => [s.symbol, filterFromExchangeInfo(s)]));
    return ticks.map((t) => {
      const f = filters.get(t.symbol) ?? defaultFilter(t.symbol, t.symbol.replace(/USDT$/, ""), "USDT");
      return {
        symbol: t.symbol,
        base: f.base,
        quote: f.quote,
        assetClass: "crypto" as const,
        last: t.lastPrice,
        changePct: t.priceChangePercent,
        weightedAvg: t.weightedAvgPrice,
        high: t.highPrice,
        low: t.lowPrice,
        quoteVolume: t.quoteVolume,
        bid: t.bidPrice,
        ask: t.askPrice,
        observedAt: new Date(t.closeTime).toISOString(),
        source: "live" as const,
        filter: f,
        filterSource: filters.has(t.symbol) ? ("live" as const) : ("default" as const),
      };
    });
  } catch {
    return null;
  }
}

/** Live universe with a deterministic captured-real fallback. Always resolves. */
export async function loadUniverse(symbols: readonly string[] = DEFAULT_UNIVERSE): Promise<MarketRow[]> {
  const live = await fetchLiveUniverse(symbols);
  if (live && live.length > 0) return live;
  const wanted = new Set(symbols);
  const captured = capturedUniverse().filter((r) => wanted.has(r.symbol));
  return captured.length > 0 ? captured : capturedUniverse();
}
