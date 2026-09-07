import { NextResponse } from "next/server";
import { investigationInputSchema } from "@/packages/core/src/identity";

export async function POST(request: Request) {
  const parsed = investigationInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid investigation" }, { status: 400 });
  return NextResponse.json({ id: "echo-7", status: "ready", mode: "replay" }, { status: 201 });
}
