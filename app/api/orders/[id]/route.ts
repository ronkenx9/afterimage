import { NextResponse } from "next/server";
import { getPaperOrder } from "@/packages/integrations/src/paper-exchange";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const intent = getPaperOrder(id);
  return intent ? NextResponse.json(intent) : NextResponse.json({ error: "Order not found" }, { status: 404 });
}
