// AFTERIMAGE autonomous agent daemon.
//
// Runs the control loop as a long-lived server process: every interval it reads
// the live market, surfaces its own alphas, plans + attaches reversal, and prints
// owner-ready proposals. It NEVER submits an order — proposals are gated on an
// explicit owner approval. Safe to run unattended.
//
//   pnpm agent            # loop forever, default 60s interval
//   pnpm agent --once     # a single cycle then exit (used by self-test / CI)
//   AGENT_INTERVAL_MS=30000 AGENT_BUDGET=50 AGENT_MAX=2 pnpm agent

import { runCycle } from "@/packages/integrations/src/alpha-runtime";
import type { AgentCycleReport } from "@/packages/core/src/agent";
import type { UniverseMeta } from "@/packages/integrations/src/alpha-runtime";

const once = process.argv.includes("--once");
const intervalMs = Number(process.env.AGENT_INTERVAL_MS ?? 60_000);
const budget = process.env.AGENT_BUDGET ?? "100";
const maxProposals = Number(process.env.AGENT_MAX ?? 3);

function render(meta: UniverseMeta, report: AgentCycleReport): void {
  const ts = new Date().toISOString();
  console.log(`\n[${ts}] cycle ${report.cycleId}`);
  console.log(
    `  universe: ${report.universeSize} symbols · source=${meta.source} · observed=${meta.observedAt}`,
  );
  console.log(`  actionable alphas: ${report.actionableCount} · proposals: ${report.proposals.length}`);
  for (const p of report.proposals) {
    const a = p.alpha;
    console.log(
      `  ▸ ${p.entry.side} ${p.entry.baseQuantity} ${a.base} (${a.symbol})  ` +
        `${a.strategy} score=${a.score} conf=${a.confidence}`,
    );
    console.log(
      `      entry ${p.entry.price} · notional ${p.entry.notional} ${a.quote} · fee ${p.entry.estimatedFee}`,
    );
    console.log(
      `      reversal: stop ${p.reversal.protectiveStop.stopPrice} (${p.reversal.protectiveStop.triggerPct}%) · ` +
        `round-trip ${p.reversal.roundTripCostBps}bps · reversibility ${p.reversal.reversibilityScore} · ` +
        `maxLoss ${p.reversal.maxLossQuote} ${a.quote}`,
    );
    console.log(`      why: ${a.rationale[0]}`);
    console.log(`      approve hash: ${p.payloadHash.slice(0, 16)}…  [AWAITING_OWNER_APPROVAL]`);
  }
  if (report.proposals.length === 0) {
    console.log("  (no eligible proposals this cycle)");
  }
  console.log(`  execution: ${report.execution.mode} — submitted=${report.execution.submitted}`);
}

async function cycle(): Promise<void> {
  try {
    const { meta, report } = await runCycle({ budgetPerTradeQuote: budget, maxProposals });
    render(meta, report);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] cycle error:`, err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  console.log("AFTERIMAGE autonomous agent — propose-only, owner-gated. No order is submitted by the agent.");
  await cycle();
  if (once) return;
  console.log(`\nLooping every ${intervalMs}ms. Ctrl+C to stop.`);
  const timer = setInterval(cycle, intervalMs);
  const stop = () => {
    clearInterval(timer);
    console.log("\nStopped.");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
