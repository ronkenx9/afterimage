// Reversibility — AFTERIMAGE's edge.
//
// A normal trading agent fires an order and forgets it. This one refuses to
// propose an entry without also computing its *undo*: the exact inverse order
// that returns the account to its prior state, a protective stop that caps the
// downside, the round-trip cost of reversing, and a time-boxed auto-unwind
// horizon. Every forward action ships with its afterimage.
//
// Pure and deterministic. Computes plans only — it never submits anything.

import Decimal from "decimal.js";
import type { OrderPlan, OrderRequest, RiskCaps, SymbolFilter, Side } from "@/packages/core/src/trade";
import { DEFAULT_CAPS } from "@/packages/core/src/trade";

export type ReversalConfig = {
  /** Protective stop distance from entry, as a fraction (0.02 = 2%). */
  stopPct: string;
  /** Auto-unwind horizon in minutes if the thesis has not played out. */
  timeBoxMinutes: number;
  /** Assumed slippage per leg, as a fraction, added to the round-trip estimate. */
  slippagePctPerLeg: string;
};

export const DEFAULT_REVERSAL: ReversalConfig = {
  stopPct: "0.02",
  timeBoxMinutes: 240,
  slippagePctPerLeg: "0.0005",
};

export type ReversalPlan = {
  /** The inverse order that unwinds the entry back to flat. */
  unwind: OrderRequest;
  /** Protective stop that bounds the loss on the entry. */
  protectiveStop: {
    stopPrice: string;
    triggerPct: string; // signed % from entry that triggers it
    side: Side;
  };
  /** Cost of a full round trip (enter + exit): 2 legs of fee + spread + slippage. */
  roundTripCostQuote: string;
  roundTripCostBps: string;
  /** 0..1 — higher means cheaper and easier to reverse (tight, liquid, low-cost). */
  reversibilityScore: number;
  /** Auto-unwind deadline. */
  timeBoxMinutes: number;
  unwindBy: string;
  /** Worst-case loss if the protective stop fills, incl. round-trip cost. */
  maxLossQuote: string;
  notes: string[];
};

function roundToTick(value: Decimal, tick: Decimal): Decimal {
  if (tick.lte(0)) return value;
  return value.div(tick).floor().mul(tick);
}

function tickDecimals(tick: string): number {
  const [, frac = ""] = tick.split(".");
  return frac.replace(/0+$/, "").length;
}

/**
 * Build the reversal plan for a just-formed entry plan.
 *
 * `spreadBps` (from the live quote) sharpens the round-trip cost and the
 * reversibility score; omit it and only fee + slippage are counted.
 */
export function planReversal(
  entry: OrderPlan,
  context: {
    filter: SymbolFilter;
    spreadBps?: number;
    caps?: RiskCaps;
    config?: ReversalConfig;
    now?: Date;
  },
): ReversalPlan {
  const caps = context.caps ?? DEFAULT_CAPS;
  const cfg = context.config ?? DEFAULT_REVERSAL;
  const now = context.now ?? new Date();

  const entryPrice = new Decimal(entry.price);
  const qty = new Decimal(entry.baseQuantity);
  const notional = new Decimal(entry.notional);
  const feeRate = new Decimal(caps.feeRate);
  const slip = new Decimal(cfg.slippagePctPerLeg);
  const spreadFrac = new Decimal(context.spreadBps ?? 0).div(10_000);
  const tick = new Decimal(context.filter.tickSize);
  const priceDp = tickDecimals(context.filter.tickSize);

  const reverseSide: Side = entry.side === "BUY" ? "SELL" : "BUY";

  // Inverse order: same quantity, opposite side, MARKET to guarantee the unwind.
  const unwind: OrderRequest = {
    symbol: entry.symbol,
    side: reverseSide,
    type: "MARKET",
    baseQuantity: entry.baseQuantity,
  };

  // Protective stop: below entry for a long, above for a short.
  const stopPct = new Decimal(cfg.stopPct);
  const stopPrice =
    entry.side === "BUY"
      ? roundToTick(entryPrice.mul(new Decimal(1).sub(stopPct)), tick)
      : roundToTick(entryPrice.mul(new Decimal(1).add(stopPct)), tick);
  const triggerPct = (entry.side === "BUY" ? stopPct.neg() : stopPct).mul(100);

  // Round-trip cost: two legs each pay fee + half-spread + slippage.
  const perLegFrac = feeRate.add(spreadFrac.div(2)).add(slip);
  const roundTripCost = notional.mul(perLegFrac).mul(2);
  const roundTripBps = notional.gt(0) ? roundTripCost.div(notional).mul(10_000) : new Decimal(0);

  // Worst case: stop distance loss on the position + the cost to round-trip.
  const stopLoss = qty.mul(entryPrice.sub(stopPrice).abs());
  const maxLoss = stopLoss.add(roundTripCost);

  // Reversibility score: cheaper round trips and tighter spreads score higher.
  // 50bps round-trip => ~0.5 penalty; 25bps spread => ~0.25 penalty.
  const costPenalty = Math.min(1, roundTripBps.toNumber() / 100);
  const spreadPenalty = Math.min(1, (context.spreadBps ?? 0) / 100);
  const reversibilityScore = Number(Math.max(0, 1 - 0.7 * costPenalty - 0.3 * spreadPenalty).toFixed(3));

  const notes = [
    `Unwind is a MARKET ${reverseSide} of ${entry.baseQuantity} ${context.filter.base} — returns the account to flat.`,
    `Protective stop at ${stopPrice.toFixed(priceDp)} caps the loss at ~${stopPct.mul(100).toFixed(2)}% before costs.`,
    `Round trip costs ${roundTripBps.toFixed(1)}bps (${roundTripCost.toFixed(2)} ${context.filter.quote}); auto-unwind after ${cfg.timeBoxMinutes}m if the thesis stalls.`,
  ];

  return {
    unwind,
    protectiveStop: { stopPrice: stopPrice.toFixed(priceDp), triggerPct: triggerPct.toFixed(2), side: reverseSide },
    roundTripCostQuote: roundTripCost.toFixed(2),
    roundTripCostBps: roundTripBps.toFixed(1),
    reversibilityScore,
    timeBoxMinutes: cfg.timeBoxMinutes,
    unwindBy: new Date(now.getTime() + cfg.timeBoxMinutes * 60_000).toISOString(),
    maxLossQuote: maxLoss.toFixed(2),
    notes,
  };
}
