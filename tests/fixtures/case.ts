import type { InvestigationCase } from "@/packages/core/src/types";

export const SOL = "solana:So11111111111111111111111111111111111111112" as const;
export const USDC = "solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as const;

const amount = (assetId: typeof SOL | typeof USDC, raw: string, decimals: number, symbol: string) => ({ assetId, raw, decimals, symbol });

export const replayCase: InvestigationCase = {
  id: "echo-7",
  title: "A clean win, with a missing beginning",
  input: "5h3LvjL67eM88vTdfM8YqfvKauTmxo6TW7m4m8P2mF8Z",
  asset: { chainId: "solana", mint: SOL.slice(7), symbol: "SOL", mappedSymbol: "SOLUSDT" },
  coverage: {
    requestedInterval: "2026-08-08 to 2026-09-07",
    retrievedInterval: "2026-08-08 to 2026-09-07",
    transactions: 7,
    decodedSwaps: 3,
    unsupportedOperations: 1,
    completeHistory: false,
    limitation: "The observation window begins after 1.35 SOL entered the wallet. That inventory basis remains unknown.",
  },
  evidence: [
    { id: "ev-acquire", source: "replay-fixture", retrievedAt: "2026-09-07T20:40:00.000Z", label: "Decoded SOL acquisition", hash: "sha256:acquire-51d9" },
    { id: "ev-transfer", source: "replay-fixture", retrievedAt: "2026-09-07T20:40:00.000Z", label: "Incoming SOL transfer", hash: "sha256:transfer-a031" },
    { id: "ev-exit-a", source: "replay-fixture", retrievedAt: "2026-09-07T20:40:00.000Z", label: "First decoded disposal", hash: "sha256:exit-4a2e" },
    { id: "ev-exit-b", source: "replay-fixture", retrievedAt: "2026-09-07T20:40:00.000Z", label: "Second decoded disposal", hash: "sha256:exit-7cc1" },
    { id: "ev-fee", source: "replay-fixture", retrievedAt: "2026-09-07T20:40:00.000Z", label: "Network fee", hash: "sha256:fee-118f" },
  ],
  events: [
    { id: "e1", signature: "4QW...acq", slot: "361110001", eventIndex: 0, occurredAt: "2026-08-12T09:14:00.000Z", kind: "swap", status: "confirmed", debits: [amount(USDC, "253650000", 6, "USDC")], credits: [amount(SOL, "1500000000", 9, "SOL")], evidenceIds: ["ev-acquire"], decoderVersion: "replay-jupiter-v1", basisStatus: "known", note: "Acquired 1.50 SOL for 253.65 USDC." },
    { id: "e2", signature: "5KG...in", slot: "361220410", eventIndex: 0, occurredAt: "2026-08-16T14:31:00.000Z", kind: "transfer", status: "confirmed", debits: [], credits: [amount(SOL, "1350000000", 9, "SOL")], evidenceIds: ["ev-transfer"], decoderVersion: "spl-transfer-v1", basisStatus: "unknown", note: "Received 1.35 SOL. Acquisition basis is not visible." },
    { id: "e3", signature: "2PA...out1", slot: "361480221", eventIndex: 0, occurredAt: "2026-08-24T18:02:00.000Z", kind: "swap", status: "confirmed", debits: [amount(SOL, "900000000", 9, "SOL")], credits: [amount(USDC, "184500000", 6, "USDC")], evidenceIds: ["ev-exit-a"], decoderVersion: "replay-jupiter-v1", basisStatus: "known", note: "Disposed 0.90 SOL for 184.50 USDC." },
    { id: "e4", signature: "8TT...out2", slot: "361711205", eventIndex: 0, occurredAt: "2026-09-02T07:48:00.000Z", kind: "swap", status: "confirmed", debits: [amount(SOL, "850000000", 9, "SOL")], credits: [amount(USDC, "177650000", 6, "USDC")], evidenceIds: ["ev-exit-b"], decoderVersion: "replay-jupiter-v1", basisStatus: "partial", note: "Disposed 0.85 SOL. FIFO crosses into unknown-basis inventory." },
    { id: "e5", signature: "8TT...fee", slot: "361711205", eventIndex: 1, occurredAt: "2026-09-02T07:48:00.000Z", kind: "fee", status: "confirmed", debits: [amount(SOL, "5000", 9, "SOL")], credits: [], evidenceIds: ["ev-fee"], decoderVersion: "solana-fee-v1", basisStatus: "known", note: "Network fee recorded separately in SOL." },
    { id: "e6", signature: "7LP...unknown", slot: "361719100", eventIndex: 0, occurredAt: "2026-09-02T12:07:00.000Z", kind: "lp", status: "confirmed", debits: [], credits: [], evidenceIds: [], decoderVersion: "unsupported-v1", basisStatus: "unknown", note: "LP interaction preserved but excluded from swap accounting." },
    { id: "e7", signature: "3FL...failed", slot: "361811922", eventIndex: 0, occurredAt: "2026-09-05T10:22:00.000Z", kind: "swap", status: "failed", debits: [], credits: [], evidenceIds: [], decoderVersion: "replay-jupiter-v1", basisStatus: "unknown", note: "Failed swap. No fill counted." },
  ],
};
