import { NextResponse } from "next/server";
import { z } from "zod";
import { runCycle } from "@/packages/integrations/src/alpha-runtime";
import { resolveOwnerLimits } from "@/packages/core/src/guardrails";
import { DEFAULT_CAPS } from "@/packages/core/src/trade";

// One autonomous agent cycle: observe → surface alphas → plan → attach reversal
// → emit owner-ready proposals. FAIL-CLOSED: it never submits an order. Every
// proposal is AWAITING_APPROVAL and carries the payload hash the owner approves.
export const dynamic = "force-dynamic";

const configSchema = z
  .object({
    // Owner mandates — TIGHTEN-ONLY. Accepts any positive request; resolveOwnerLimits()
    // is the authority that clamps every value down to the absolute code caps.
    budgetPerTradeQuote: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    maxProposals: z.number().int().min(1).max(100000).optional(),
    maxOrderNotionalQuote: z.number().positive().optional(),
  })
  .optional();

// Optional shared secret. When AFTERIMAGE_AGENT_WORKER_SECRET is set (e.g. on a
// VPS-exposed deployment), requests must present it as `x-afterimage-worker-key`.
// Unset => open (local/dev). This gates a read-only, propose-only endpoint; it
// never authorizes an order.
function authorized(request: Request): boolean {
  const secret = process.env.AFTERIMAGE_AGENT_WORKER_SECRET?.trim();
  if (!secret) return true;
  return request.headers.get("x-afterimage-worker-key")?.trim() === secret;
}

async function tick(body?: unknown) {
  const parsed = configSchema.safeParse(body);
  const o = parsed.success ? parsed.data : undefined;

  // Every owner-supplied limit is clamped to the absolute guardrail ceiling — the
  // owner can only make things stricter, never looser.
  const effective = resolveOwnerLimits({
    maxOrderNotionalQuote: o?.maxOrderNotionalQuote,
    maxProposalsPerCycle: o?.maxProposals,
    budgetPerTradeQuote: o?.budgetPerTradeQuote ? Number(o.budgetPerTradeQuote) : undefined,
  });

  const { meta, report } = await runCycle({
    budgetPerTradeQuote: effective.budgetPerTradeQuote,
    maxProposals: effective.maxProposalsPerCycle,
    caps: { ...DEFAULT_CAPS, maxNotional: effective.maxOrderNotionalQuote },
  });
  return NextResponse.json({ meta, report, effectiveLimits: effective });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return tick();
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => undefined);
  return tick(body);
}
