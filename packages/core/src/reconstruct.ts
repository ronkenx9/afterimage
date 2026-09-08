// Bounded on-chain reconstruction.
//
// This is the HONEST version of "give it a wallet": it reads a wallet's recent
// transactions from Solana RPC and reconstructs, per transaction, the net change
// to THAT wallet's balances (native SOL and SPL tokens) straight from the
// transaction meta. It is a genuine on-chain balance-delta ledger with an
// explicit coverage manifest — NOT a full DEX-trade decode. Operations it cannot
// classify are counted as `undecoded`, never hidden or invented.
//
// Pure and deterministic: it operates on already-fetched transaction objects, so
// it is fully testable with fixtures and the same input always yields the same
// ledger.

export type BalanceDelta = { asset: string; mint: string | null; amount: number };

export type ReconEvent = {
  signature: string;
  slot: number;
  blockTime: string | null;
  status: "success" | "failed";
  feeSol: number;
  deltas: BalanceDelta[]; // net changes for the target wallet
  undecoded: boolean; // true when no balance change for the wallet could be attributed
};

export type CoverageManifest = {
  address: string;
  requestedSignatures: number;
  retrievedTransactions: number;
  failedFetches: number;
  earliest: string | null;
  latest: string | null;
  undecodedCount: number;
  completeHistory: false;
  limitation: string;
};

export type Reconstruction = {
  coverage: CoverageManifest;
  events: ReconEvent[];
  netByAsset: BalanceDelta[]; // summed across the retrieved window
};

const LAMPORTS = 1e9;
const round = (n: number, dp = 9) => Number(n.toFixed(dp));

// Loose defensive shapes — RPC payloads vary across tx versions, so every field
// is optional and accessed guardedly.
type AccountKey = string | { pubkey?: string };
type TokenBalance = { accountIndex?: number; mint?: string; owner?: string; uiTokenAmount?: { uiAmount?: number | null } };
type TxMeta = {
  err?: unknown;
  fee?: number;
  preBalances?: number[];
  postBalances?: number[];
  preTokenBalances?: TokenBalance[];
  postTokenBalances?: TokenBalance[];
};
type RpcTx = {
  slot?: number;
  blockTime?: number | null;
  transaction?: { signatures?: string[]; message?: { accountKeys?: AccountKey[] } };
  meta?: TxMeta;
};

function accountKeys(tx: RpcTx): string[] {
  const keys = tx.transaction?.message?.accountKeys ?? [];
  return keys.map((k) => (typeof k === "string" ? k : k?.pubkey)).filter((k): k is string => Boolean(k));
}

/** Reconstruct the net balance change to `address` for one fetched transaction. */
export function reconstructEvent(address: string, txInput: unknown): ReconEvent {
  const tx = (txInput ?? {}) as RpcTx;
  const meta = tx.meta ?? {};
  const keys = accountKeys(tx);
  const idx = keys.indexOf(address);
  const deltas: BalanceDelta[] = [];

  // Native SOL delta from pre/post balances at the wallet's account index.
  const pre = meta.preBalances ?? [];
  const post = meta.postBalances ?? [];
  if (idx >= 0 && pre[idx] != null && post[idx] != null) {
    const solDelta = (post[idx] - pre[idx]) / LAMPORTS;
    if (solDelta !== 0) deltas.push({ asset: "SOL", mint: null, amount: round(solDelta) });
  }

  // SPL token deltas: match pre/post token balances owned by the wallet, per mint.
  const preTok = meta.preTokenBalances ?? [];
  const postTok = meta.postTokenBalances ?? [];
  const key = (t: TokenBalance) => `${t.mint}:${t.accountIndex}`;
  const preMap = new Map(preTok.map((t) => [key(t), t]));
  const postMap = new Map(postTok.map((t) => [key(t), t]));
  const owned = new Set<string>();
  for (const t of [...preTok, ...postTok]) if (t.owner === address) owned.add(key(t));
  for (const k of owned) {
    const p = preMap.get(k);
    const q = postMap.get(k);
    if ((q?.owner ?? p?.owner) !== address) continue;
    const d = Number(q?.uiTokenAmount?.uiAmount ?? 0) - Number(p?.uiTokenAmount?.uiAmount ?? 0);
    const mint = q?.mint ?? p?.mint;
    if (d !== 0 && mint) deltas.push({ asset: mint.slice(0, 4) + "…" + mint.slice(-4), mint, amount: round(d, 6) });
  }

  const bt = tx.blockTime ?? null;
  return {
    signature: tx.transaction?.signatures?.[0] ?? "unknown",
    slot: tx.slot ?? 0,
    blockTime: bt ? new Date(bt * 1000).toISOString() : null,
    status: meta.err ? "failed" : "success",
    feeSol: round((meta.fee ?? 0) / LAMPORTS),
    deltas,
    undecoded: deltas.length === 0,
  };
}

/** Assemble a bounded reconstruction from fetched transactions + requested count. */
export function reconstruct(address: string, requestedSignatures: number, txs: unknown[]): Reconstruction {
  const events = txs.filter(Boolean).map((t) => reconstructEvent(address, t));
  const times = events.map((e) => e.blockTime).filter((t): t is string => t !== null).sort();
  const net = new Map<string, BalanceDelta>();
  for (const e of events) {
    for (const d of e.deltas) {
      const k = d.mint ?? d.asset;
      const cur = net.get(k) ?? { asset: d.asset, mint: d.mint, amount: 0 };
      cur.amount = round(cur.amount + d.amount, 6);
      net.set(k, cur);
    }
  }
  const undecodedCount = events.filter((e) => e.undecoded).length;
  return {
    coverage: {
      address,
      requestedSignatures,
      retrievedTransactions: events.length,
      failedFetches: Math.max(0, requestedSignatures - events.length),
      earliest: times[0] ?? null,
      latest: times[times.length - 1] ?? null,
      undecodedCount,
      completeHistory: false,
      limitation:
        "Bounded to the most recent signatures. Net balance-delta view from transaction meta — not a full DEX-trade decode. Undecoded operations are counted, not interpreted.",
    },
    events,
    netByAsset: [...net.values()],
  };
}
