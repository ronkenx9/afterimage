import { NextResponse } from "next/server";
import { submitPaperOrder } from "@/packages/integrations/src/paper-exchange";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(submitPaperOrder(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Submission failed" }, { status: 409 });
  }
}
