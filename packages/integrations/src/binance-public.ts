import { z } from "zod";

const tickerSchema = z.object({
  symbol: z.string(),
  lastPrice: z.string(),
  priceChangePercent: z.string(),
  bidPrice: z.string(),
  askPrice: z.string(),
  closeTime: z.number(),
});

export type MarketSnapshot = {
  symbol: string;
  price: string;
  change24h: string;
  bid: string;
  ask: string;
  observedAt: string;
  source: "binance-public" | "replay-fallback";
  stale: boolean;
};

export async function getMarketSnapshot(symbol = "SOLUSDT"): Promise<MarketSnapshot> {
  const base = process.env.BINANCE_MARKET_BASE_URL ?? "https://api.binance.com";
  try {
    const response = await fetch(`${base}/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`Binance returned ${response.status}`);
    const ticker = tickerSchema.parse(await response.json());
    return {
      symbol: ticker.symbol,
      price: ticker.lastPrice,
      change24h: ticker.priceChangePercent,
      bid: ticker.bidPrice,
      ask: ticker.askPrice,
      observedAt: new Date(ticker.closeTime).toISOString(),
      source: "binance-public",
      stale: false,
    };
  } catch {
    return {
      symbol,
      price: "203.40",
      change24h: "-1.27",
      bid: "203.39",
      ask: "203.41",
      observedAt: "2026-09-07T20:40:00.000Z",
      source: "replay-fallback",
      stale: true,
    };
  }
}
