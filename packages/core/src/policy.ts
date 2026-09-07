import Decimal from "decimal.js";
import { z } from "zod";

export const proposalSchema = z.object({
  symbol: z.literal("SOLUSDT"),
  side: z.literal("BUY"),
  quoteAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  mode: z.literal("paper"),
});

export function adaptProposal(input: z.infer<typeof proposalSchema>, marketPrice: string) {
  const spend = new Decimal(input.quoteAmount);
  const price = new Decimal(marketPrice);
  if (spend.lt(10)) return { status: "blocked" as const, reason: "Amount is below the 10 USDT demo minimum." };
  if (spend.gt(250)) return { status: "blocked" as const, reason: "Paper risk cap is 250 USDT per intent." };
  return {
    status: "eligible" as const,
    baseQuantity: spend.div(price).toDecimalPlaces(5, Decimal.ROUND_DOWN).toFixed(5),
    maxSpend: spend.toFixed(2),
    estimatedFee: spend.mul("0.001").toFixed(2),
  };
}
