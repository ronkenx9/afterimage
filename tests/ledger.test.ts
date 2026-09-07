import { describe, expect, it } from "vitest";
import { reconstructLedger } from "@/packages/core/src/ledger";
import type { LedgerEvent } from "@/packages/core/src/types";
import { replayCase, SOL, USDC } from "./fixtures/case";

describe("reconstructLedger", () => {
  it("matches partial exits with FIFO and excludes unknown basis", () => {
    const result = reconstructLedger(replayCase.events, SOL, USDC);
    expect(result.realizedKnownBasis).toBe("56.25");
    expect(result.excludedDisposalQuantity).toBe("0.25");
    expect(result.remaining).toBe("1.1");
    expect(result.remainingUnknownBasis).toBe("1.1");
    expect(result.fees).toEqual([{ symbol: "SOL", amount: "0.000005" }]);
  });

  it("is deterministic when input order changes", () => {
    const forward = reconstructLedger(replayCase.events, SOL, USDC);
    const reverse = reconstructLedger([...replayCase.events].reverse(), SOL, USDC);
    expect(reverse).toEqual(forward);
  });

  it("does not count a failed profitable-looking swap", () => {
    const failed: LedgerEvent = {
      ...replayCase.events[2], id: "failed-win", slot: "999999999", status: "failed",
      credits: [{ assetId: USDC, raw: "999999000000", decimals: 6, symbol: "USDC" }],
    };
    expect(reconstructLedger([...replayCase.events, failed], SOL, USDC).realizedKnownBasis).toBe("56.25");
  });

  it("reports a loss without converting it into an unknown", () => {
    const acquisition: LedgerEvent = { ...replayCase.events[0], id: "loss-in", slot: "1", debits: [{ assetId: USDC, raw: "100000000", decimals: 6, symbol: "USDC" }], credits: [{ assetId: SOL, raw: "1000000000", decimals: 9, symbol: "SOL" }] };
    const exit: LedgerEvent = { ...replayCase.events[2], id: "loss-out", slot: "2", debits: [{ assetId: SOL, raw: "1000000000", decimals: 9, symbol: "SOL" }], credits: [{ assetId: USDC, raw: "80000000", decimals: 6, symbol: "USDC" }] };
    expect(reconstructLedger([acquisition, exit], SOL, USDC).realizedKnownBasis).toBe("-20.00");
  });

  it("preserves third-asset fees", () => {
    const BNB = "binance:BNB" as const;
    const fee: LedgerEvent = { ...replayCase.events[4], id: "bnb-fee", debits: [{ assetId: BNB, raw: "37000", decimals: 8, symbol: "BNB" }] };
    expect(reconstructLedger([fee], SOL, USDC).fees).toEqual([{ symbol: "BNB", amount: "0.00037" }]);
  });

  it("ignores unsupported LP and wrap records in swap PnL", () => {
    const onlyUnsupported = replayCase.events.filter((event) => event.kind === "lp" || event.kind === "wrap");
    expect(reconstructLedger(onlyUnsupported, SOL, USDC).realizedKnownBasis).toBe("0.00");
  });
});
