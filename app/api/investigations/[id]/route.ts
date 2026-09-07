import { NextResponse } from "next/server";
import { replayCase } from "@/tests/fixtures/case";
import { reconstructLedger } from "@/packages/core/src/ledger";
import { buildClaims } from "@/packages/core/src/evidence";
import { buildProfile } from "@/packages/core/src/profile";
import { SOL, USDC } from "@/tests/fixtures/case";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (id !== replayCase.id) return NextResponse.json({ error: "Investigation not found" }, { status: 404 });
  const reconstruction = reconstructLedger(replayCase.events, SOL, USDC);
  return NextResponse.json({
    investigation: replayCase,
    reconstruction,
    claims: buildClaims(replayCase, reconstruction),
    profile: buildProfile(replayCase, reconstruction),
  });
}
