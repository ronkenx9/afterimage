import { NextResponse } from "next/server";
import { z } from "zod";
import { runCycle } from "@/packages/integrations/src/alpha-runtime";

// One autonomous agent cycle: observe → surface alphas → plan → attach reversal
// → emit owner-ready proposals. FAIL-CLOSED: it never submits an order. Every
// proposal is AWAITING_APPROVAL and carries the payload hash the owner approves.
export const dynamic = "force-dynamic";

const configSchema = z
  .object({
    budgetPerTradeQuote: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    maxProposals: z.number().int().min(1).max(10).optional(),
  })
  .optional();

async function tick(body?: unknown) {
  const parsed = configSchema.safeParse(body);
  const overrides = parsed.success ? parsed.data : undefined;
  const { meta, report } = await runCycle(
    overrides
      ? { budgetPerTradeQuote: overrides.budgetPerTradeQuote ?? "100", maxProposals: overrides.maxProposals ?? 3 }
      : undefined,
  );
  return NextResponse.json({ meta, report });
}

export async function GET() {
  return tick();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined);
  return tick(body);
}
