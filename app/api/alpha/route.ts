import { NextResponse } from "next/server";
import { scanUniverse } from "@/packages/integrations/src/alpha-runtime";

// Read-only: the agent's autonomously surfaced, ranked market opportunities.
// Live universe when the server can reach Binance public REST, otherwise a frozen
// snapshot of real captured data (labeled in `meta.source`). Never plans or trades.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const symbolsParam = new URL(request.url).searchParams.get("symbols");
  const symbols = symbolsParam ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : undefined;
  const { meta, scan } = await scanUniverse(symbols);
  return NextResponse.json({ meta, scan });
}
