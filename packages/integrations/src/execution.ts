// Execution facade: selects the active provider and exposes the unified
// capability surface to API routes and the UI. Planning and reads are always
// available; live writes route to the Agent OS adapter and remain gated.

import { CAPABILITIES, type CapabilityId } from "@/packages/core/src/capabilities";
import { planOrder, type OrderRequest, type PlanResult, type RiskCaps, type SymbolFilter } from "@/packages/core/src/trade";
import { bindingReport, type BindingReport } from "@/packages/integrations/src/agentos";

export type ExecutionMode = "paper" | "agentos";

export function executionMode(): ExecutionMode {
  return process.env.AFTERIMAGE_EXECUTION_MODE === "agentos" ? "agentos" : "paper";
}

export type CapabilityCatalog = {
  mode: ExecutionMode;
  binding: BindingReport;
  capabilities: typeof CAPABILITIES;
};

export async function capabilityCatalog(): Promise<CapabilityCatalog> {
  const ids: CapabilityId[] = CAPABILITIES.map((c) => c.id);
  return {
    mode: executionMode(),
    binding: await bindingReport(ids),
    capabilities: CAPABILITIES,
  };
}

/** Pure planning pass. Never submits. */
export function previewOrder(
  request: OrderRequest,
  context: { filter: SymbolFilter; referencePrice: string; caps?: RiskCaps },
): PlanResult {
  return planOrder(request, context);
}
