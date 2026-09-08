#!/usr/bin/env node

// AFTERIMAGE autonomous agent daemon (VPS worker).
//
// Same shape as the Muse Mirror capsule worker: a thin, pure-Node loop that
// drives the deployed app's authenticated endpoint and logs to stdout (journald).
// Every cycle it asks the app to observe the live market, surface its own alphas,
// plan them against real filters, and attach a reversibility (undo) plan. It only
// reads the resulting owner-ready proposals — it NEVER submits an order. Live
// execution stays an owner action behind approval + the owner's Agent OS client.

const origin = (process.env.AFTERIMAGE_APP_ORIGIN || "http://127.0.0.1:3014").replace(/\/$/, "");
const workerKey = process.env.AFTERIMAGE_AGENT_WORKER_SECRET?.trim();
const intervalMs = Math.max(5_000, Math.min(3_600_000, Number.parseInt(process.env.AGENT_INTERVAL_MS || "60000", 10) || 60_000));
const budget = process.env.AGENT_BUDGET || "100";
const maxProposals = Math.max(1, Math.min(10, Number.parseInt(process.env.AGENT_MAX || "3", 10) || 3));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function cycle() {
  const headers = { "content-type": "application/json" };
  if (workerKey) headers["x-afterimage-worker-key"] = workerKey;
  const response = await fetch(`${origin}/api/agent/tick`, {
    method: "POST",
    headers,
    body: JSON.stringify({ budgetPerTradeQuote: budget, maxProposals }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `tick failed with HTTP ${response.status}`);
  return body;
}

function log(meta, report) {
  const ts = new Date().toISOString();
  process.stdout.write(
    `${ts} ${report.cycleId} source=${meta.source} universe=${report.universeSize} ` +
      `actionable=${report.actionableCount} proposals=${report.proposals.length} submitted=${report.execution.submitted}\n`,
  );
  for (const p of report.proposals) {
    process.stdout.write(
      `${ts}   ▸ ${p.entry.side} ${p.entry.baseQuantity} ${p.alpha.base} (${p.alpha.symbol}) ` +
        `${p.alpha.strategy} score=${p.alpha.score} · entry ${p.entry.price} notional ${p.entry.notional} ${p.alpha.quote} · ` +
        `rev ${p.reversal.reversibilityScore} stop ${p.reversal.protectiveStop.stopPrice} maxLoss ${p.reversal.maxLossQuote} · ` +
        `approve ${p.payloadHash.slice(0, 16)}… [AWAITING_OWNER_APPROVAL]\n`,
    );
  }
}

async function main() {
  process.stdout.write(`AFTERIMAGE agent worker online: ${origin} (propose-only, owner-gated; submits nothing)\n`);
  for (;;) {
    try {
      const { meta, report } = await cycle();
      log(meta, report);
    } catch (error) {
      process.stderr.write(`${new Date().toISOString()} ${error instanceof Error ? error.message : String(error)}\n`);
    }
    await sleep(intervalMs);
  }
}

void main();
