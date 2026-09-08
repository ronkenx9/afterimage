// Symbol-agnostic Spot order planning.
//
// Generalizes the original single-path (SOLUSDT / BUY / paper) policy into the
// standard trading-agent surface: any symbol, BUY or SELL, MARKET or LIMIT,
// validated against real exchange filters (lot size, tick size, min notional)
// and bounded by explicit risk caps. Planning is pure and deterministic; it
// never submits — submission stays behind the approval + expiry flow.

import Decimal from "decimal.js";
import { z } from "zod";

export const sideSchema = z.enum(["BUY", "SELL"]);
export const orderTypeSchema = z.enum(["MARKET", "LIMIT"]);
export type Side = z.infer<typeof sideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;

const decimalString = z.string().regex(/^\d+(\.\d+)?$/, "Expected a non-negative decimal string");

/** Exchange filters for one symbol, mirroring Binance Spot symbol filters. */
export const symbolFilterSchema = z.object({
  symbol: z.string().min(3),
  base: z.string().min(1),
  quote: z.string().min(1),
  minNotional: decimalString, // in quote asset
  minQty: decimalString, // in base asset
  stepSize: decimalString, // base quantity increment
  tickSize: decimalString, // price increment
});
export type SymbolFilter = z.infer<typeof symbolFilterSchema>;

export const orderRequestSchema = z
  .object({
    symbol: z.string().min(3),
    side: sideSchema,
    type: orderTypeSchema,
    quoteAmount: decimalString.optional(), // spend, for MARKET BUY
    baseQuantity: decimalString.optional(), // size, for SELL / explicit sizing
    limitPrice: decimalString.optional(), // required for LIMIT
  })
  .refine((v) => v.type !== "LIMIT" || v.limitPrice !== undefined, {
    message: "LIMIT orders require limitPrice",
    path: ["limitPrice"],
  })
  .refine((v) => v.quoteAmount !== undefined || v.baseQuantity !== undefined, {
    message: "Provide quoteAmount or baseQuantity",
    path: ["quoteAmount"],
  });
export type OrderRequest = z.infer<typeof orderRequestSchema>;

export type RiskCaps = {
  /** Reject orders whose notional is below this quote amount. */
  minNotional: string;
  /** Reject orders whose notional exceeds this quote amount. */
  maxNotional: string;
  /** Taker fee applied to notional, as a decimal fraction (0.001 = 10 bps). */
  feeRate: string;
};

export const DEFAULT_CAPS: RiskCaps = {
  minNotional: "10",
  maxNotional: "250",
  feeRate: "0.001",
};

export type OrderPlan = {
  symbol: string;
  side: Side;
  type: OrderType;
  price: string; // execution reference (mark for MARKET, limit for LIMIT)
  baseQuantity: string; // quantized to stepSize
  notional: string; // quote value
  estimatedFee: string; // quote value
  maxSpend: string; // quote value the owner authorizes (buy) or receives est. (sell)
};

export type PlanResult =
  | { status: "eligible"; plan: OrderPlan }
  | { status: "blocked"; reason: string };

function decimalsOfStep(step: string): number {
  const [, frac = ""] = step.split(".");
  // Trailing zeros in a step like "0.00100000" still cap precision at the last significant digit.
  const trimmed = frac.replace(/0+$/, "");
  return trimmed.length;
}

function floorToStep(value: Decimal, step: Decimal): Decimal {
  if (step.lte(0)) return value;
  return value.div(step).floor().mul(step);
}

/**
 * Plan a Spot order deterministically.
 *
 * `referencePrice` is the mark price used for MARKET orders and for valuing a
 * MARKET BUY's quoteAmount. For LIMIT orders the limitPrice governs notional.
 * Rounding never increases the owner's committed spend: base quantity is floored
 * to the lot step.
 */
export function planOrder(
  request: OrderRequest,
  context: { filter: SymbolFilter; referencePrice: string; caps?: RiskCaps },
): PlanResult {
  const { filter, referencePrice } = context;
  const caps = context.caps ?? DEFAULT_CAPS;

  if (request.symbol !== filter.symbol) {
    return { status: "blocked", reason: `Filter is for ${filter.symbol}, not ${request.symbol}.` };
  }

  const price = new Decimal(request.type === "LIMIT" ? request.limitPrice! : referencePrice);
  if (price.lte(0)) return { status: "blocked", reason: "Non-positive execution price." };

  const step = new Decimal(filter.stepSize);
  const qtyDecimals = decimalsOfStep(filter.stepSize);

  // Resolve the base quantity.
  let baseQty: Decimal;
  if (request.baseQuantity !== undefined) {
    baseQty = floorToStep(new Decimal(request.baseQuantity), step);
  } else {
    // quoteAmount path: convert intended spend into base size at price.
    const spend = new Decimal(request.quoteAmount!);
    baseQty = floorToStep(spend.div(price), step);
  }

  if (baseQty.lte(0)) return { status: "blocked", reason: "Quantity rounds to zero at this lot size." };
  if (baseQty.lt(new Decimal(filter.minQty))) {
    return { status: "blocked", reason: `Below symbol minimum quantity (${filter.minQty}).` };
  }

  const notional = baseQty.mul(price);
  if (notional.lt(new Decimal(filter.minNotional))) {
    return { status: "blocked", reason: `Below symbol minimum notional (${filter.minNotional} ${filter.quote}).` };
  }
  if (notional.lt(new Decimal(caps.minNotional))) {
    return { status: "blocked", reason: `Below the ${caps.minNotional} ${filter.quote} risk floor.` };
  }
  if (notional.gt(new Decimal(caps.maxNotional))) {
    return { status: "blocked", reason: `Exceeds the ${caps.maxNotional} ${filter.quote} risk cap per order.` };
  }

  const fee = notional.mul(new Decimal(caps.feeRate));

  return {
    status: "eligible",
    plan: {
      symbol: filter.symbol,
      side: request.side,
      type: request.type,
      price: price.toFixed(),
      baseQuantity: baseQty.toFixed(qtyDecimals),
      notional: notional.toFixed(2),
      estimatedFee: fee.toFixed(2),
      maxSpend: notional.toFixed(2),
    },
  };
}
