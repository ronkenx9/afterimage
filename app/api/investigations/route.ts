import { NextResponse } from "next/server";
import { investigationInputSchema } from "@/packages/core/src/identity";

export async function POST(request: Request) {
  const parsed = investigationInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid investigation" }, { status: 400 });
  // Honest boundary: live arbitrary-wallet ingestion + on-chain decoding is NOT
  // wired in this build. Any valid input maps to the one bundled replay case, and
  // we say so explicitly rather than pretending to have traced the pasted wallet.
  return NextResponse.json(
    {
      id: "echo-7",
      status: "ready",
      mode: "replay",
      requested: parsed.data.input,
      note: "Live wallet reconstruction is not enabled in this build. Showing the bundled replay case (echo-7), not an analysis of the address above.",
    },
    { status: 201 },
  );
}
