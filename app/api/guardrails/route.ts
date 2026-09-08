import { NextResponse } from "next/server";
import { GUARDRAILS, EXECUTION_ALLOWLIST } from "@/packages/core/src/guardrails";
import { CAPABILITIES } from "@/packages/core/src/capabilities";

// Advertise the enforced safety mandates. These are enforced in code at a single
// chokepoint (packages/core/src/guardrails.ts → enforce()), not by this endpoint.
export const dynamic = "force-dynamic";

export async function GET() {
  const forbidden = CAPABILITIES.filter((c) => !EXECUTION_ALLOWLIST.has(c.id)).map((c) => c.id);
  return NextResponse.json({
    ...GUARDRAILS,
    allowlist: [...EXECUTION_ALLOWLIST],
    foreverForbidden: forbidden,
    enforcement: "Enforced in code via enforce() at every execution path. Not promptable, not configurable, not relaxable by any data the agent reads.",
  });
}
