import { NextResponse } from "next/server";
import { runPatternScan } from "@/packages/integrations/src/alpha-runtime";

// Read-only: the pattern-learning engine over real historical candles. For each
// symbol it reports what each setup did (hit-rate, expectancy) and what is firing
// now, plus cross-symbol breadth. Learns from history; it is not a predictor.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const interval = url.searchParams.get("interval") ?? "1h";
  const symbolsParam = url.searchParams.get("symbols");
  const symbols = symbolsParam ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : undefined;
  return NextResponse.json(await runPatternScan(symbols, interval));
}
