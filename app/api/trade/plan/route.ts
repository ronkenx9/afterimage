import { NextResponse } from "next/server";
import { z } from "zod";
import { orderRequestSchema, symbolFilterSchema } from "@/packages/core/src/trade";
import { previewOrder } from "@/packages/integrations/src/execution";

// Deterministic order planning. This validates against exchange filters and risk
// caps and returns an eligible plan or a block reason. It does NOT submit — a
// plan still has to pass through the owner approval + expiry flow to execute.
const bodySchema = z.object({
  request: orderRequestSchema,
  filter: symbolFilterSchema,
  referencePrice: z.string().regex(/^\d+(\.\d+)?$/),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan request", issues: parsed.error.issues }, { status: 400 });
  }
  const result = previewOrder(parsed.data.request, {
    filter: parsed.data.filter,
    referencePrice: parsed.data.referencePrice,
  });
  return NextResponse.json(result, { status: result.status === "eligible" ? 200 : 422 });
}
