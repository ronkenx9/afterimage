import { z } from "zod";

const base58 = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

export const investigationInputSchema = z.object({
  input: z.string().trim().min(32).max(88).regex(base58, "Enter a valid Solana address or signature"),
  windowDays: z.number().int().min(1).max(90),
});

export function canonicalSolanaAsset(mint: string) {
  if (!base58.test(mint)) throw new Error("Invalid Solana mint identity");
  return `solana:${mint}` as const;
}

export function assertReviewedMapping(status: "reviewed" | "ambiguous" | "unsupported") {
  if (status !== "reviewed") throw new Error("Exact asset mapping is not approved for execution");
}
