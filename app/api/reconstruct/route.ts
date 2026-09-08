import { NextResponse } from "next/server";
import { reconstructWallet } from "@/packages/integrations/src/reconstruct-runtime";

// LIVE bounded on-chain reconstruction of a real Solana wallet. Read-only. Returns
// a genuine balance-delta ledger + coverage manifest from the most recent
// signatures. Not a full DEX-trade decode; undecoded ops are counted, not hidden.
export const dynamic = "force-dynamic";

const base58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = (url.searchParams.get("address") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);
  if (!base58.test(address)) {
    return NextResponse.json({ error: "Provide a valid Solana wallet address" }, { status: 400 });
  }
  try {
    return NextResponse.json(await reconstructWallet(address, limit));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reconstruction failed", mode: "live-bounded" },
      { status: 502 },
    );
  }
}
