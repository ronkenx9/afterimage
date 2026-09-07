import { createHash, randomUUID } from "node:crypto";

export type IntentState = "AWAITING_APPROVAL" | "APPROVED" | "SUBMITTING" | "FILLED" | "EXPIRED" | "REJECTED";

export type OrderIntent = {
  id: string;
  symbol: "SOLUSDT";
  side: "BUY";
  mode: "paper";
  quoteAmount: string;
  baseQuantity: string;
  previewPrice: string;
  estimatedFee: string;
  createdAt: string;
  expiresAt: string;
  payloadHash: string;
  state: IntentState;
  receiptId?: string;
};

type Draft = Omit<OrderIntent, "id" | "createdAt" | "expiresAt" | "payloadHash" | "state">;

export function hashIntent(payload: object) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function createIntent(draft: Draft, now = new Date()): OrderIntent {
  const payloadHash = hashIntent(draft);
  return {
    ...draft,
    id: randomUUID(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
    payloadHash,
    state: "AWAITING_APPROVAL",
  };
}

export function approveIntent(intent: OrderIntent, suppliedHash: string, now = new Date()): OrderIntent {
  if (intent.state !== "AWAITING_APPROVAL") throw new Error("Intent is not awaiting approval");
  if (now >= new Date(intent.expiresAt)) return { ...intent, state: "EXPIRED" };
  if (suppliedHash !== intent.payloadHash) throw new Error("Intent payload changed after preview");
  return { ...intent, state: "APPROVED" };
}

export function fillPaperIntent(intent: OrderIntent): OrderIntent {
  if (intent.state !== "APPROVED") throw new Error("Only an approved intent can be submitted");
  return { ...intent, state: "FILLED", receiptId: `paper_${intent.payloadHash.slice(0, 12)}` };
}
