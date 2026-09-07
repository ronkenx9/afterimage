export type AssetId = `solana:${string}` | `binance:${string}`;

export type Amount = {
  assetId: AssetId;
  raw: string;
  decimals: number;
  symbol: string;
};

export type LedgerEvent = {
  id: string;
  signature: string;
  slot: string;
  eventIndex: number;
  occurredAt: string | null;
  kind: "swap" | "transfer" | "fee" | "wrap" | "lp" | "unknown";
  status: "confirmed" | "failed";
  debits: Amount[];
  credits: Amount[];
  evidenceIds: string[];
  decoderVersion: string;
  basisStatus: "known" | "partial" | "unknown";
  note: string;
};

export type Evidence = {
  id: string;
  source: "solana-rpc" | "replay-fixture" | "binance-public";
  retrievedAt: string;
  label: string;
  href?: string;
  hash: string;
};

export type CoverageManifest = {
  requestedInterval: string;
  retrievedInterval: string;
  transactions: number;
  decodedSwaps: number;
  unsupportedOperations: number;
  completeHistory: false;
  limitation: string;
};

export type InvestigationCase = {
  id: string;
  title: string;
  input: string;
  asset: { chainId: "solana"; mint: string; symbol: string; mappedSymbol: string };
  coverage: CoverageManifest;
  evidence: Evidence[];
  events: LedgerEvent[];
};
