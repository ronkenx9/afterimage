import { approveIntent, createIntent, fillPaperIntent, type OrderIntent } from "@/packages/core/src/intent";

const intents = new Map<string, OrderIntent>();

export function previewPaperOrder(input: Parameters<typeof createIntent>[0]) {
  const intent = createIntent(input);
  intents.set(intent.id, intent);
  return intent;
}

export function getPaperOrder(id: string) {
  return intents.get(id) ?? null;
}

export function approvePaperOrder(id: string, payloadHash: string) {
  const current = intents.get(id);
  if (!current) throw new Error("Order intent not found");
  const approved = approveIntent(current, payloadHash);
  intents.set(id, approved);
  return approved;
}

export function submitPaperOrder(id: string) {
  const current = intents.get(id);
  if (!current) throw new Error("Order intent not found");
  const filled = fillPaperIntent(current);
  intents.set(id, filled);
  return filled;
}
