// Autonomous agent control loop.
//
// One cycle: observe the live market → surface alphas by itself → size and plan
// each opportunity against real exchange filters and risk caps → attach a
// reversibility (undo) plan → emit immutable, owner-ready proposals.
//
// The loop is deterministic given its inputs and is FAIL-CLOSED on execution:
// it produces proposals in AWAITING_APPROVAL and NEVER submits an order. Turning
// a proposal into a live fill requires an explicit per-action owner approval and
// the owner's authenticated Agent OS client — by design and by policy, the agent
// does not spend funds on its own.

import { createHash } from "node:crypto";
import {
  surfaceAlphas,
  type AlphaConfig,
  type AlphaInput,
  type AlphaSignal,
  DEFAULT_ALPHA_CONFIG,
} from "@/packages/core/src/alpha";
import {
  planOrder,
  type OrderPlan,
  type RiskCaps,
  type SymbolFilter,
  DEFAULT_CAPS,
} from "@/packages/core/src/trade";
import { planReversal, type ReversalPlan, type ReversalConfig, DEFAULT_REVERSAL } from "@/packages/core/src/reversibility";
import type { LivePattern } from "@/packages/core/src/patterns";

export type AgentObservation = AlphaInput & { filter: SymbolFilter };

export type ProposalState = "AWAITING_APPROVAL";

export type TradeProposal = {
  id: string;
  createdAt: string;
  expiresAt: string;
  state: ProposalState;
  requiresOwnerApproval: true;
  /** The alpha that motivated the trade. */
  alpha: AlphaSignal;
  /** The filter-validated, risk-capped entry order. */
  entry: OrderPlan;
  /** The pre-computed undo for the entry. */
  reversal: ReversalPlan;
  /** Optional learned pattern firing now on this symbol, with its historical edge. */
  patternEvidence?: LivePattern;
  /** sha256 of the immutable {entry, reversal} payload — owner approves this hash. */
  payloadHash: string;
};

export type SkippedOpportunity = {
  symbol: string;
  score: number;
  reason: string;
};

export type AgentCycleReport = {
  cycleId: string;
  observedAt: string;
  universeSize: number;
  actionableCount: number;
  proposals: TradeProposal[];
  skipped: SkippedOpportunity[];
  execution: {
    submitted: false;
    mode: "propose-only";
    note: string;
  };
};

export type AgentConfig = {
  alpha?: AlphaConfig;
  caps?: RiskCaps;
  reversal?: ReversalConfig;
  /** Quote amount the agent commits per proposal (MARKET BUY spend). */
  budgetPerTradeQuote: string;
  /** Max proposals emitted per cycle. */
  maxProposals: number;
};

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  budgetPerTradeQuote: "100",
  maxProposals: 3,
};

function hashPayload(payload: object): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Run one full agent cycle over a set of observations. Pure and deterministic
 * given `now`. Produces owner-ready proposals; submits nothing.
 */
export function runAgentCycle(
  observations: AgentObservation[],
  config: AgentConfig = DEFAULT_AGENT_CONFIG,
  now: Date = new Date(),
): AgentCycleReport {
  const alphaCfg = config.alpha ?? DEFAULT_ALPHA_CONFIG;
  const caps = config.caps ?? DEFAULT_CAPS;
  const reversalCfg = config.reversal ?? DEFAULT_REVERSAL;

  const filters = new Map(observations.map((o) => [o.symbol, o.filter]));
  const scan = surfaceAlphas(observations, alphaCfg, now);

  const proposals: TradeProposal[] = [];
  const skipped: SkippedOpportunity[] = [];

  for (const alpha of scan.actionable) {
    if (proposals.length >= config.maxProposals) {
      skipped.push({ symbol: alpha.symbol, score: alpha.score, reason: "Beyond max proposals for this cycle." });
      continue;
    }
    const filter = filters.get(alpha.symbol);
    if (!filter) {
      skipped.push({ symbol: alpha.symbol, score: alpha.score, reason: "No exchange filter available to size the order." });
      continue;
    }

    const plan = planOrder(
      { symbol: alpha.symbol, side: alpha.side, type: "MARKET", quoteAmount: config.budgetPerTradeQuote },
      { filter, referencePrice: alpha.referencePrice, caps },
    );
    if (plan.status !== "eligible") {
      skipped.push({ symbol: alpha.symbol, score: alpha.score, reason: `Order planning blocked: ${plan.reason}` });
      continue;
    }

    const reversal = planReversal(plan.plan, {
      filter,
      spreadBps: alpha.signals.spreadBps,
      caps,
      config: reversalCfg,
      now,
    });

    const payloadHash = hashPayload({ entry: plan.plan, reversal });
    proposals.push({
      id: `prop_${payloadHash.slice(0, 12)}`,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      state: "AWAITING_APPROVAL",
      requiresOwnerApproval: true,
      alpha,
      entry: plan.plan,
      reversal,
      payloadHash,
    });
  }

  // Record the strongest rejected ideas for transparency.
  for (const r of scan.rejected.slice(0, 5)) {
    skipped.push({ symbol: r.symbol, score: r.score, reason: r.blockedReason ?? "Rejected by alpha gate." });
  }

  return {
    cycleId: `cycle_${now.getTime()}`,
    observedAt: observations[0]?.observedAt ?? now.toISOString(),
    universeSize: observations.length,
    actionableCount: scan.actionable.length,
    proposals,
    skipped,
    execution: {
      submitted: false,
      mode: "propose-only",
      note: "Proposals are owner-gated. The agent never submits; the owner approves each hash and their authenticated Agent OS client executes.",
    },
  };
}
