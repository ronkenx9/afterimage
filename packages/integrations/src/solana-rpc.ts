import { z } from "zod";

const signatureSchema = z.string().min(64).max(128);
const base58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function endpoint() {
  return process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
}

async function rpc(method: string, params: unknown[], timeoutMs = 8_000) {
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Solana RPC returned ${response.status}`);
  return z.object({ jsonrpc: z.literal("2.0"), result: z.unknown().nullable() }).parse(await response.json()).result;
}

export async function getTransaction(signature: string) {
  signatureSchema.parse(signature);
  return rpc("getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
}

const sigInfoSchema = z.object({
  signature: z.string(),
  slot: z.number(),
  blockTime: z.number().nullable().optional(),
  err: z.unknown().nullable().optional(),
});

/** Recent transaction signatures for a wallet, most-recent first (bounded). */
export async function getSignaturesForAddress(address: string, limit = 25) {
  if (!base58.test(address)) throw new Error("Invalid Solana address");
  const result = await rpc("getSignaturesForAddress", [address, { limit: Math.min(Math.max(limit, 1), 100) }]);
  return z.array(sigInfoSchema).parse(result ?? []);
}
