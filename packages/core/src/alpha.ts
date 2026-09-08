// Autonomous alpha engine.
//
// Given a live market universe, surface tradable opportunities *by itself*:
// deterministic, explainable signals derived only from real market data (24h
// momentum, VWAP gap, intraday range position, volatility, spread, liquidity).
// Every signal carries its sub-scores and a plain-language rationale so a human
// (or the reversibility layer) can audit why the agent wants to act.
//
// Pure and deterministic: identical inputs always yield identical rankings.
// This module never places or plans an order — it only forms opinions.

import Decimal from "decimal.js";

export type AlphaStrategy = "momentum" | "mean-reversion";
export type AlphaSide = "BUY" | "SELL";

export type AlphaSignals = {
  momentumPct: number; // 24h change %
  vwapGapPct: number; // (last - vwap)/vwap %  (>0 = premium, <0 = discount)
  rangePosition: number; // 0 = at 24h low, 1 = at 24h high
  volatilityPct: number; // (high-low)/vwap %
  spreadBps: number; // (ask-bid)/mid * 1e4
  liquidityUsd: number; // 24h quote volume
};

export type AlphaSignal = {
  symbol: string;
  base: string;
  quote: string;
  assetClass: "crypto" | "stock";
  strategy: AlphaStrategy;
  side: AlphaSide;
  score: number; // composite conviction, higher = stronger
  confidence: number; // 0..1
  signals: AlphaSignals;
  rationale: string[];
  actionable: boolean;
  /** Present when not actionable, or when SELL needs existing inventory. */
  blockedReason?: string;
  referencePrice: string;
  observedAt: string;
  source: string;
};

export type AlphaConfig = {
  /** Minimum 24h quote volume for an opportunity to be actionable. */
  minLiquidityUsd: number;
  /** Maximum bid/ask spread (bps) for an opportunity to be actionable. */
  maxSpreadBps: number;
  /** Momentum (abs %) above which a move counts as a real trend. */
  momentumThresholdPct: number;
  /** Agent starts flat, so SELL signals need inventory to act on. */
  allowSellWithoutInventory: boolean;
};

export const DEFAULT_ALPHA_CONFIG: AlphaConfig = {
  minLiquidityUsd: 5_000_000,
  maxSpreadBps: 25,
  momentumThresholdPct: 1.0,
  allowSellWithoutInventory: false,
};

export type AlphaInput = {
  symbol: string;
  base: string;
  quote: string;
  assetClass?: "crypto" | "stock";
  last: string;
  changePct: string;
  weightedAvg: string;
  high: string;
  low: string;
  quoteVolume: string;
  bid: string;
  ask: string;
  observedAt: string;
  source: string;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round = (n: number, dp = 4) => Number(n.toFixed(dp));

function computeSignals(row: AlphaInput): AlphaSignals {
  const last = new Decimal(row.last);
  const vwap = new Decimal(row.weightedAvg);
  const high = new Decimal(row.high);
  const low = new Decimal(row.low);
  const bid = new Decimal(row.bid);
  const ask = new Decimal(row.ask);
  const range = high.sub(low);
  const mid = bid.add(ask).div(2);

  const momentumPct = new Decimal(row.changePct).toNumber();
  const vwapGapPct = vwap.gt(0) ? last.sub(vwap).div(vwap).mul(100).toNumber() : 0;
  const rangePosition = range.gt(0) ? clamp(last.sub(low).div(range).toNumber(), 0, 1) : 0.5;
  const volatilityPct = vwap.gt(0) ? range.div(vwap).mul(100).toNumber() : 0;
  const spreadBps = mid.gt(0) ? ask.sub(bid).div(mid).mul(10_000).toNumber() : 0;
  const liquidityUsd = new Decimal(row.quoteVolume).toNumber();

  return {
    momentumPct: round(momentumPct),
    vwapGapPct: round(vwapGapPct),
    rangePosition: round(rangePosition),
    volatilityPct: round(volatilityPct),
    spreadBps: round(spreadBps, 2),
    liquidityUsd: round(liquidityUsd, 2),
  };
}

// A saturating liquidity factor in [0,1]: rewards depth without letting the
// largest caps dominate purely on volume.
function liquidityFactor(liquidityUsd: number): number {
  if (liquidityUsd <= 0) return 0;
  return clamp(Math.log10(liquidityUsd) / 9, 0, 1); // ~1e9 => ~1.0
}

/**
 * Score both archetypes for one symbol and keep the stronger conviction.
 *
 * - momentum (BUY): a real up-move with room left below the 24h high, in a
 *   liquid, tight market. Extended (near-high) or thin markets are penalized.
 * - mean-reversion (BUY): a liquid name trading at a discount to its 24h VWAP
 *   and sitting near the low — a dip the agent expects to snap back.
 *
 * SELL variants (fade an extended pump / take profit) are surfaced but marked
 * inventory-required when the agent holds nothing to sell.
 */
export function scoreSymbol(row: AlphaInput, config: AlphaConfig = DEFAULT_ALPHA_CONFIG): AlphaSignal {
  const s = computeSignals(row);
  const liq = liquidityFactor(s.liquidityUsd);
  const rationale: string[] = [];

  // Momentum conviction (positive trend, not exhausted).
  const trend = Math.max(0, s.momentumPct) / 5; // 5% => 1.0 unit
  const headroom = clamp(1 - s.rangePosition, 0, 1); // room below the high
  const momentumScore =
    trend > 0 ? clamp(trend * (0.5 + 0.5 * headroom) * (0.4 + 0.6 * liq), 0, 5) : 0;

  // Mean-reversion conviction (discount to VWAP + near the low).
  const discount = Math.max(0, -s.vwapGapPct) / 2; // 2% below VWAP => 1.0 unit
  const nearLow = clamp(1 - s.rangePosition, 0, 1);
  const reversionScore = clamp(discount * (0.4 + 0.6 * nearLow) * (0.4 + 0.6 * liq), 0, 5);

  let strategy: AlphaStrategy;
  let side: AlphaSide;
  let score: number;

  if (momentumScore >= reversionScore && momentumScore > 0) {
    strategy = "momentum";
    side = "BUY";
    score = momentumScore;
    rationale.push(`+${s.momentumPct}% over 24h on ${fmtUsd(s.liquidityUsd)} volume — real trend, not noise.`);
    rationale.push(`At ${(s.rangePosition * 100).toFixed(0)}% of the 24h range — ${headroom > 0.15 ? "room left below the high" : "extended, capped conviction"}.`);
  } else if (reversionScore > 0) {
    strategy = "mean-reversion";
    side = "BUY";
    score = reversionScore;
    rationale.push(`Trading ${Math.abs(s.vwapGapPct)}% below its 24h VWAP — a discount the agent expects to revert.`);
    rationale.push(`Near the 24h low (${(s.rangePosition * 100).toFixed(0)}% of range) on ${fmtUsd(s.liquidityUsd)} volume.`);
  } else {
    // No BUY edge. If it is extended above VWAP, surface a SELL/fade idea.
    strategy = s.momentumPct < 0 ? "momentum" : "mean-reversion";
    side = "SELL";
    score = 0;
    rationale.push(`No long edge: ${s.momentumPct}% momentum, ${s.vwapGapPct}% vs VWAP.`);
  }

  // Gating.
  let actionable = true;
  let blockedReason: string | undefined;
  if (s.liquidityUsd < config.minLiquidityUsd) {
    actionable = false;
    blockedReason = `Illiquid: ${fmtUsd(s.liquidityUsd)} < ${fmtUsd(config.minLiquidityUsd)} floor.`;
  } else if (s.spreadBps > config.maxSpreadBps) {
    actionable = false;
    blockedReason = `Spread ${s.spreadBps}bps exceeds ${config.maxSpreadBps}bps cap.`;
  } else if (side === "BUY" && score <= 0) {
    actionable = false;
    blockedReason = "No positive long edge this cycle.";
  } else if (side === "BUY" && strategy === "momentum" && s.momentumPct < config.momentumThresholdPct && reversionScore <= 0) {
    actionable = false;
    blockedReason = `Momentum ${s.momentumPct}% below ${config.momentumThresholdPct}% threshold.`;
  } else if (side === "SELL" && !config.allowSellWithoutInventory) {
    actionable = false;
    blockedReason = "SELL/fade signal — requires an existing position to act on.";
  }

  // Confidence blends normalized conviction, liquidity, and spread tightness.
  const spreadFactor = clamp(1 - s.spreadBps / (config.maxSpreadBps * 2), 0, 1);
  const confidence = round(clamp((score / 5) * 0.6 + liq * 0.25 + spreadFactor * 0.15, 0, 1), 3);

  return {
    symbol: row.symbol,
    base: row.base,
    quote: row.quote,
    assetClass: row.assetClass ?? "crypto",
    strategy,
    side,
    score: round(score, 4),
    confidence,
    signals: s,
    rationale,
    actionable,
    blockedReason,
    referencePrice: row.last,
    observedAt: row.observedAt,
    source: row.source,
  };
}

export type AlphaScan = {
  scannedAt: string;
  universeSize: number;
  actionable: AlphaSignal[]; // sorted by score desc
  rejected: AlphaSignal[]; // sorted by score desc
};

/** Surface and rank the whole universe. Deterministic. */
export function surfaceAlphas(
  rows: AlphaInput[],
  config: AlphaConfig = DEFAULT_ALPHA_CONFIG,
  now: Date = new Date(),
): AlphaScan {
  const scored = rows.map((r) => scoreSymbol(r, config));
  const byScore = (a: AlphaSignal, b: AlphaSignal) => b.score - a.score || a.symbol.localeCompare(b.symbol);
  return {
    scannedAt: now.toISOString(),
    universeSize: rows.length,
    actionable: scored.filter((s) => s.actionable).sort(byScore),
    rejected: scored.filter((s) => !s.actionable).sort(byScore),
  };
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
