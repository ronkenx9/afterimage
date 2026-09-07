import { describe, expect, it } from "vitest";
import { approveIntent, createIntent, fillPaperIntent } from "@/packages/core/src/intent";

const draft = { symbol: "SOLUSDT" as const, side: "BUY" as const, mode: "paper" as const, quoteAmount: "50.00", baseQuantity: "0.24582", previewPrice: "203.40", estimatedFee: "0.05" };

describe("order intent", () => {
  it("binds approval to its immutable payload hash", () => {
    const intent = createIntent(draft, new Date("2026-09-07T20:00:00Z"));
    expect(() => approveIntent(intent, "changed", new Date("2026-09-07T20:00:30Z"))).toThrow("payload changed");
    expect(approveIntent(intent, intent.payloadHash, new Date("2026-09-07T20:00:30Z")).state).toBe("APPROVED");
  });

  it("expires after sixty seconds", () => {
    const intent = createIntent(draft, new Date("2026-09-07T20:00:00Z"));
    expect(approveIntent(intent, intent.payloadHash, new Date("2026-09-07T20:01:01Z")).state).toBe("EXPIRED");
  });

  it("denies duplicate submission", () => {
    const intent = createIntent(draft);
    const filled = fillPaperIntent(approveIntent(intent, intent.payloadHash));
    expect(filled.receiptId).toMatch(/^paper_/);
    expect(() => fillPaperIntent(filled)).toThrow("Only an approved intent");
  });
});
