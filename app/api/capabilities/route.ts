import { NextResponse } from "next/server";
import { capabilityCatalog } from "@/packages/integrations/src/execution";

// Read-only: the baseline capability catalog plus live Agent OS binding status.
export async function GET() {
  return NextResponse.json(await capabilityCatalog());
}
