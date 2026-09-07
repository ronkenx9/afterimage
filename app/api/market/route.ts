import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/packages/integrations/src/binance-public";

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol") ?? "SOLUSDT";
  if (symbol !== "SOLUSDT") return NextResponse.json({ error: "Symbol is not in the reviewed mapping allowlist" }, { status: 400 });
  return NextResponse.json(await getMarketSnapshot(symbol));
}
