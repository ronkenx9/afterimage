import { describe, expect, it } from "vitest";
import { runAgentCycle, DEFAULT_AGENT_CONFIG, type AgentObservation } from "@/packages/core/src/agent";
import { capturedUniverse } from "@/packages/integrations/src/market-universe";

function observations(): AgentObservation[] {
  return capturedUniverse().map((r) => ({
    symbol: r.symbol, base: r.base, quote: r.quote, assetClass: r.assetClass,
    last: r.last, changePct: r.changePct, weightedAvg: r.weightedAvg,
    high: r.high, low: r.low, quoteVolume: r.quoteVolume, bid: r.bid, ask: r.ask,
    observedAt: r.observedAt, source: r.source, filter: r.filter,
  }));
}

const now = new Date("2026-09-08T13:36:05.000Z");

describe("agent control loop", () => {
  it("emits owner-gated proposals and NEVER submits", () => {
    const report = runAgentCycle(observations(), DEFAULT_AGENT_CONFIG, now);
    expect(report.execution.submitted).toBe(false);
    expect(report.execution.mode).toBe("propose-only");
    for (const p of report.proposals) {
      expect(p.state).toBe("AWAITING_APPROVAL");
      expect(p.requiresOwnerApproval).toBe(true);
    }
  });

  it("caps proposals at maxProposals", () => {
    const report = runAgentCycle(observations(), { budgetPerTradeQuote: "100", maxProposals: 2 }, now);
    expect(report.proposals.length).toBeLessThanOrEqual(2);
  });

  it("leads with the strongest alpha (INJ momentum) and sizes a real, filter-valid order", () => {
    const report = runAgentCycle(observations(), DEFAULT_AGENT_CONFIG, now);
    const top = report.proposals[0];
    expect(top.alpha.symbol).toBe("INJUSDT");
    expect(top.entry.side).toBe("BUY");
    // Quantity respects INJ's 0.01 lot step.
    expect(Number(top.entry.baseQuantity) % 0.01).toBeCloseTo(0, 6);
    // Notional close to the 100 USDT budget, never over the cap.
    expect(Number(top.entry.notional)).toBeGreaterThan(90);
    expect(Number(top.entry.notional)).toBeLessThanOrEqual(250);
  });

  it("attaches a reversal plan to every proposal", () => {
    const report = runAgentCycle(observations(), DEFAULT_AGENT_CONFIG, now);
    expect(report.proposals.length).toBeGreaterThan(0);
    for (const p of report.proposals) {
      expect(p.reversal.unwind.side).not.toBe(p.entry.side);
      expect(Number(p.reversal.maxLossQuote)).toBeGreaterThan(0);
      expect(p.reversal.reversibilityScore).toBeGreaterThan(0);
    }
  });

  it("binds each proposal to a stable payload hash of {entry, reversal}", () => {
    const a = runAgentCycle(observations(), DEFAULT_AGENT_CONFIG, now);
    const b = runAgentCycle(observations(), DEFAULT_AGENT_CONFIG, now);
    expect(a.proposals.map((p) => p.payloadHash)).toEqual(b.proposals.map((p) => p.payloadHash));
    expect(a.proposals[0].id).toContain(a.proposals[0].payloadHash.slice(0, 12));
  });

  it("never proposes an irreversible transfer/withdraw", () => {
    const report = runAgentCycle(observations(), DEFAULT_AGENT_CONFIG, now);
    for (const p of report.proposals) {
      expect(["BUY", "SELL"]).toContain(p.entry.side);
      expect(p.entry.symbol).toMatch(/USDT$/);
    }
  });
});
