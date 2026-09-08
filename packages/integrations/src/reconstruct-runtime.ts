// Live bounded reconstruction: fetch a wallet's recent signatures + transactions
// from Solana RPC, then hand them to the pure reconstructor.

import { getSignaturesForAddress, getTransaction } from "@/packages/integrations/src/solana-rpc";
import { reconstruct, type Reconstruction } from "@/packages/core/src/reconstruct";

export async function reconstructWallet(address: string, limit = 20): Promise<Reconstruction> {
  const sigs = await getSignaturesForAddress(address, limit);
  const txs = await Promise.all(
    sigs.map((s) => getTransaction(s.signature).catch(() => null)),
  );
  return reconstruct(address, sigs.length, txs.filter(Boolean));
}
