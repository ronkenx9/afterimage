import { describe, expect, it } from "vitest";
import { reconstruct, reconstructEvent } from "@/packages/core/src/reconstruct";

const WALLET = "Wa11etAdd33ssExampleForTestsOnly1111111111";
const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

// A synthetic jsonParsed transaction: wallet is fee payer (index 0), spends 0.5
// SOL of native balance and receives 10 USDC.
function tx() {
  return {
    slot: 123,
    blockTime: 1_788_800_000,
    transaction: { signatures: ["sigABC"], message: { accountKeys: [{ pubkey: WALLET }, { pubkey: "OtherAcct" }] } },
    meta: {
      err: null,
      fee: 5000,
      preBalances: [1_000_000_000, 0],
      postBalances: [500_000_000, 0], // -0.5 SOL
      preTokenBalances: [{ accountIndex: 5, mint: MINT, owner: WALLET, uiTokenAmount: { uiAmount: 0 } }],
      postTokenBalances: [{ accountIndex: 5, mint: MINT, owner: WALLET, uiTokenAmount: { uiAmount: 10 } }],
    },
  };
}

describe("bounded reconstruction", () => {
  it("extracts native SOL and SPL token deltas for the target wallet", () => {
    const e = reconstructEvent(WALLET, tx());
    expect(e.status).toBe("success");
    expect(e.signature).toBe("sigABC");
    const sol = e.deltas.find((d) => d.asset === "SOL");
    const usdc = e.deltas.find((d) => d.mint === MINT);
    expect(sol?.amount).toBeCloseTo(-0.5, 9);
    expect(usdc?.amount).toBeCloseTo(10, 6);
    expect(e.undecoded).toBe(false);
  });

  it("marks a transaction undecoded when the wallet has no attributable change", () => {
    const e = reconstructEvent("SomeoneElse1111111111111111111111111111111", tx());
    expect(e.undecoded).toBe(true);
    expect(e.deltas).toHaveLength(0);
  });

  it("flags a failed transaction", () => {
    const t = tx();
    t.meta.err = { InstructionError: [0, "Custom"] } as unknown as null;
    expect(reconstructEvent(WALLET, t).status).toBe("failed");
  });

  it("builds a bounded coverage manifest and nets balances across events", () => {
    const r = reconstruct(WALLET, 3, [tx(), tx()]); // requested 3, retrieved 2
    expect(r.coverage.completeHistory).toBe(false);
    expect(r.coverage.requestedSignatures).toBe(3);
    expect(r.coverage.retrievedTransactions).toBe(2);
    expect(r.coverage.failedFetches).toBe(1);
    expect(r.coverage.limitation).toMatch(/not a full DEX-trade decode/i);
    const sol = r.netByAsset.find((d) => d.asset === "SOL");
    const usdc = r.netByAsset.find((d) => d.mint === MINT);
    expect(sol?.amount).toBeCloseTo(-1.0, 9); // 2 × -0.5
    expect(usdc?.amount).toBeCloseTo(20, 6); // 2 × 10
  });

  it("never claims complete history", () => {
    const r = reconstruct(WALLET, 1, [tx()]);
    expect(r.coverage.completeHistory).toBe(false);
  });
});
