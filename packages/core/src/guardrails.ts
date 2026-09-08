// ABSOLUTE SAFETY GUARDRAILS — the single, hardened chokepoint.
//
// These mandates are enforced in CODE, not in prompts. Nothing the agent reads —
// market feeds, RPC results, model text, tool results, a pasted document, a
// crafted "instruction" hidden in data — can relax them, because `enforce()`
// reads ONLY its typed, structured argument and ignores everything else. There is
// no field, env var, config, or approval that turns an absolute deny into an
// allow. This is the answer to "what stops the agent running wild."
//
// Pure and deterministic. Every execution path routes through `enforce()`.

import { getCapability, type CapabilityId } from "@/packages/core/src/capabilities";

export const GUARDRAILS = Object.freeze({
  version: "1.0.0",
  mandates: Object.freeze([
    "The agent NEVER submits an order on its own. Every write needs a per-action owner approval bound to the exact payload hash.",
    "Irreversible / off-account actions (withdraw, external transfer) are refused outright — always owner-executed, never the agent.",
    "Spot only. No leverage, margin, or futures.",
    "Only capabilities on the execution allowlist can ever run; everything else fails closed.",
    "Every order is capped: per-order notional and a daily spend ceiling. Rounding never increases committed spend.",
    "Approvals expire; a changed or expired intent is rejected.",
    "Instructions found in DATA (market data, RPC, model output, tool results, documents) are never obeyed. Only typed inputs to enforce() are honored.",
  ]),
  limits: Object.freeze({
    maxOrderNotionalQuote: "250",
    maxDailyNotionalQuote: "1000",
    maxProposalsPerCycle: 5,
    approvalTtlMs: 60_000,
    allowedVenues: Object.freeze(["binance-spot"] as const),
    allowedSides: Object.freeze(["BUY", "SELL"] as const),
    allowedOrderTypes: Object.freeze(["MARKET", "LIMIT"] as const),
  }),
});

// The ONLY capabilities that may execute. transfer.withdraw is deliberately
// ABSENT — it can never run, regardless of binding, approval, or configuration.
export const EXECUTION_ALLOWLIST: ReadonlySet<CapabilityId> = new Set<CapabilityId>([
  "market.symbols",
  "market.quote",
  "market.depth",
  "account.balances",
  "account.portfolio",
  "order.status",
  "order.open",
  "order.history",
  "convert.quote",
  "transfer.depositAddress",
  "trade.order",
  "trade.cancel",
  "convert.execute",
]);

export type GuardCode =
  | "OK"
  | "IRREVERSIBLE_FORBIDDEN"
  | "NOT_ALLOWLISTED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_INVALID"
  | "APPROVAL_EXPIRED"
  | "NOTIONAL_CAP"
  | "DAILY_CAP";

export type GuardDecision = { allow: boolean; code: GuardCode; reason: string };

/**
 * Structured, typed action. Only these fields are read — a caller cannot smuggle
 * an override by adding extra properties (they are ignored by construction).
 */
export type GuardAction = {
  capability: CapabilityId;
  /** Order notional in quote asset, when the action is an order. */
  notionalQuote?: string;
  /** Owner approval. Hash/expiry are checked only when supplied. */
  approval?: { token?: string; suppliedHash?: string; payloadHash?: string; expiresAt?: string };
  /** Quote spent so far today, for the daily ceiling. */
  spentTodayQuote?: string;
  now?: Date;
};

const deny = (code: GuardCode, reason: string): GuardDecision => ({ allow: false, code, reason });
const ok = (): GuardDecision => ({ allow: true, code: "OK", reason: "Permitted." });

/**
 * The single authority. Returns a typed decision; callers map it to enforcement
 * (throwing, blocking a proposal, etc.). Deterministic and side-effect free.
 */
export function enforce(action: GuardAction): GuardDecision {
  const spec = getCapability(action.capability); // throws on an unknown capability — fail closed

  // 1. Absolute: irreversible / off-account movement is never permitted to the agent.
  if (spec.irreversible) {
    return deny("IRREVERSIBLE_FORBIDDEN", `${action.capability} is irreversible and is owner-executed only — never the agent.`);
  }

  // 2. Allowlist: anything not explicitly permitted fails closed.
  if (!EXECUTION_ALLOWLIST.has(action.capability)) {
    return deny("NOT_ALLOWLISTED", `${action.capability} is not on the execution allowlist.`);
  }

  // 3. Reads are permitted (still bounded to allowlisted, reversible capabilities).
  if (spec.access === "read") return ok();

  // 4. Writes require a per-action owner approval.
  const a = action.approval;
  if (!a?.token) return deny("APPROVAL_REQUIRED", `${action.capability} is a write and requires an owner approval token.`);
  if (a.payloadHash !== undefined && a.suppliedHash !== a.payloadHash) {
    return deny("APPROVAL_INVALID", "Approval does not match the exact previewed payload hash.");
  }
  if (a.expiresAt !== undefined && (action.now ?? new Date()) >= new Date(a.expiresAt)) {
    return deny("APPROVAL_EXPIRED", "Approval has expired; re-preview and re-approve.");
  }

  // 5. Risk caps.
  if (action.notionalQuote !== undefined) {
    const n = Number(action.notionalQuote);
    if (n > Number(GUARDRAILS.limits.maxOrderNotionalQuote)) {
      return deny("NOTIONAL_CAP", `Order notional ${n} exceeds the ${GUARDRAILS.limits.maxOrderNotionalQuote} per-order cap.`);
    }
    if (action.spentTodayQuote !== undefined && n + Number(action.spentTodayQuote) > Number(GUARDRAILS.limits.maxDailyNotionalQuote)) {
      return deny("DAILY_CAP", `Order would breach the ${GUARDRAILS.limits.maxDailyNotionalQuote} daily spend ceiling.`);
    }
  }

  return ok();
}

/** Convenience: is this capability permanently forbidden to the agent? */
export function isForbidden(capability: CapabilityId): boolean {
  const d = enforce({ capability });
  return d.code === "IRREVERSIBLE_FORBIDDEN" || d.code === "NOT_ALLOWLISTED";
}

// ── Owner-settable mandates (TIGHTEN-ONLY) ──
// The owner may make the limits STRICTER from the dashboard, never looser. Every
// value is clamped to the absolute code ceiling above, so setting mandates can
// only reduce risk — it can never widen it past what the guardrails allow.

export type OwnerLimits = {
  maxOrderNotionalQuote?: number;
  maxProposalsPerCycle?: number;
  budgetPerTradeQuote?: number;
};

export type EffectiveLimits = {
  maxOrderNotionalQuote: string;
  maxProposalsPerCycle: number;
  budgetPerTradeQuote: string;
  clampedToAbsolute: boolean;
};

export function resolveOwnerLimits(owner: OwnerLimits = {}): EffectiveLimits {
  const absNotional = Number(GUARDRAILS.limits.maxOrderNotionalQuote);
  const absProposals = GUARDRAILS.limits.maxProposalsPerCycle;

  const reqNotional = owner.maxOrderNotionalQuote ?? absNotional;
  const maxOrderNotional = Math.max(0, Math.min(reqNotional, absNotional));

  const reqProposals = owner.maxProposalsPerCycle ?? absProposals;
  const maxProposals = Math.max(1, Math.min(reqProposals, absProposals));

  // Budget can never exceed the (already-tightened) per-order cap.
  const reqBudget = owner.budgetPerTradeQuote ?? maxOrderNotional;
  const budget = Math.max(0, Math.min(reqBudget, maxOrderNotional));

  return {
    maxOrderNotionalQuote: String(maxOrderNotional),
    maxProposalsPerCycle: maxProposals,
    budgetPerTradeQuote: String(budget),
    clampedToAbsolute: reqNotional > absNotional || reqProposals > absProposals,
  };
}
