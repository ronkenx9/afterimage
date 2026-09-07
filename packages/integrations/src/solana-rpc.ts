import { z } from "zod";

const signatureSchema = z.string().min(64).max(128);

export async function getTransaction(signature: string) {
  signatureSchema.parse(signature);
  const endpoint = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }] }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Solana RPC returned ${response.status}`);
  return z.object({ jsonrpc: z.literal("2.0"), result: z.unknown().nullable() }).parse(await response.json()).result;
}
