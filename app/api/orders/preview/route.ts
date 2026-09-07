import { NextResponse } from "next/server";
import { proposalSchema, adaptProposal } from "@/packages/core/src/policy";
import { previewPaperOrder } from "@/packages/integrations/src/paper-exchange";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid or unsupported order proposal" }, { status: 400 });
  const marketPrice = typeof body.marketPrice === "string" ? body.marketPrice : "203.40";
  const adapted = adaptProposal(parsed.data, marketPrice);
  if (adapted.status !== "eligible") return NextResponse.json(adapted, { status: 422 });
  const intent = previewPaperOrder({
    symbol: parsed.data.symbol,
    side: parsed.data.side,
    mode: "paper",
    quoteAmount: parsed.data.quoteAmount,
    baseQuantity: adapted.baseQuantity,
    previewPrice: marketPrice,
    estimatedFee: adapted.estimatedFee,
  });
  return NextResponse.json(intent, { status: 201 });
}
