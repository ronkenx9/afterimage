// Terminal market scan: the agent's surfaced alphas + learned patterns, printed.
// Read-only. Live data (public REST) with the deterministic captured fallback.
//
//   pnpm scan            # scan the default universe
//   pnpm scan BTCUSDT,INJUSDT,SUIUSDT

import { scanUniverse, runPatternScan } from "@/packages/integrations/src/alpha-runtime";

const arg = process.argv[2];
const symbols = arg ? arg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : undefined;

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

async function main() {
  const [{ meta, scan }, patterns] = await Promise.all([
    scanUniverse(symbols),
    runPatternScan(symbols).catch(() => null),
  ]);

  console.log(`\nAFTERIMAGE market scan · source=${meta.source} · ${meta.observedAt}`);
  console.log(`Universe: ${meta.symbols.join(", ")}\n`);

  console.log(`Actionable alphas (${scan.actionable.length}):`);
  for (const a of scan.actionable) {
    console.log(
      `  ${a.side} ${a.symbol.padEnd(9)} ${a.strategy.padEnd(15)} score=${a.score.toFixed(3)} conf=${a.confidence} · ` +
        `24h ${pct(a.signals.momentumPct)} · vwap ${pct(a.signals.vwapGapPct)} · range ${(a.signals.rangePosition * 100).toFixed(0)}%`,
    );
    console.log(`      ${a.rationale[0]}`);
  }

  if (scan.rejected.length > 0) {
    console.log(`\nGated out (${scan.rejected.length}): ${scan.rejected.map((r) => `${r.symbol}(${r.blockedReason?.split(":")[0]})`).join(", ")}`);
  }

  if (patterns && patterns.source === "live") {
    console.log(`\nLearned patterns firing now (breadth):`);
    if (patterns.breadth.length === 0) console.log("  (no named setup firing across names on the latest bar)");
    for (const b of patterns.breadth) console.log(`  ${b.label.padEnd(28)} ${b.count} firing · ${b.firingSymbols.join(", ")}`);
  }

  console.log(`\nExecution: propose-only. The agent surfaces and plans; it never submits.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
