import { NextResponse } from "next/server";
import { approvePaperOrder } from "@/packages/integrations/src/paper-exchange";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { payloadHash } = await request.json();
    return NextResponse.json(approvePaperOrder(id, payloadHash));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 409 });
  }
}
