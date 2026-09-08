// Terminal on-chain trade finder: a live, bounded reconstruction of a real
// Solana wallet — balance-delta ledger + coverage manifest, straight from RPC.
// Read-only.
//
//   pnpm reconstruct <solana-wallet-address> [limit]

import { reconstructWallet } from "@/packages/integrations/src/reconstruct-runtime";

const address = process.argv[2];
const limit = Number(process.argv[3] ?? 15);

if (!address) {
  console.error("Usage: pnpm reconstruct <solana-wallet-address> [limit]");
  process.exit(1);
}

async function main() {
  console.log(`\nAFTERIMAGE on-chain reconstruction · ${address}\n`);
  const r = await reconstructWallet(address, limit);
  const c = r.coverage;
  console.log("Coverage (bounded — not lifetime, not a full DEX decode):");
  console.log(`  requested ${c.requestedSignatures} · retrieved ${c.retrievedTransactions} · failed ${c.failedFetches} · undecoded ${c.undecodedCount}`);
  console.log(`  window: ${c.earliest ?? "?"} → ${c.latest ?? "?"}\n`);

  console.log("Recent events:");
  for (const e of r.events.slice(0, 12)) {
    const d = e.deltas.length ? e.deltas.map((x) => `${x.amount > 0 ? "+" : ""}${x.amount} ${x.asset}`).join(", ") : "(no attributable balance change)";
    console.log(`  ${e.blockTime ?? "?"} · ${e.status.padEnd(7)} · fee ${e.feeSol} SOL · ${d}`);
  }

  console.log("\nNet over window:");
  if (r.netByAsset.length === 0) console.log("  (no net balance change attributable to this wallet)");
  for (const n of r.netByAsset) console.log(`  ${n.amount > 0 ? "+" : ""}${n.amount} ${n.asset}${n.mint ? ` (${n.mint})` : ""}`);
  console.log("");
}

main().catch((err) => {
  console.error("Reconstruction failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
