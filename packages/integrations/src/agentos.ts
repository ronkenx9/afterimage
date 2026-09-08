// Real Binance Agent OS execution/read adapter — binding-based and fail-closed.
//
// This adapter never guesses Agent OS tool names. It resolves them from a
// binding map that is only populated after an authenticated `tools/list`
// (recorded in docs/binance-tools.json by a supported MCP client). Until a
// capability is bound, every call fails closed. Every write additionally
// requires a per-action owner approval token, and irreversible writes
// (withdraw) are refused by the agent regardless — the owner performs those.

import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  type CapabilityId,
  getCapability,
  isWrite,
} from "@/packages/core/src/capabilities";

const bindingFileSchema = z.object({
  qualifiedAt: z.string().nullable(),
  endpoint: z.string(),
  authentication: z.string(),
  // capabilityId -> live Agent OS tool name, filled from an authenticated tools/list.
  bindings: z.record(z.string(), z.string()).default({}),
});

export type BindingStatus = "unauthenticated" | "partial" | "bound";

export type BindingReport = {
  status: BindingStatus;
  endpoint: string;
  qualifiedAt: string | null;
  bound: CapabilityId[];
  missing: CapabilityId[];
};

const BINDING_PATH = new URL("../../../docs/binance-tools.json", import.meta.url);

async function loadBindings(): Promise<{ endpoint: string; qualifiedAt: string | null; bindings: Record<string, string> }> {
  try {
    const raw = await readFile(BINDING_PATH, "utf8");
    const parsed = bindingFileSchema.parse(JSON.parse(raw));
    return { endpoint: parsed.endpoint, qualifiedAt: parsed.qualifiedAt, bindings: parsed.bindings };
  } catch {
    return {
      endpoint: process.env.BINANCE_MCP_ENDPOINT ?? "https://agent.binance.com/mcp/agentic",
      qualifiedAt: null,
      bindings: {},
    };
  }
}

export async function bindingReport(all: CapabilityId[]): Promise<BindingReport> {
  const { endpoint, qualifiedAt, bindings } = await loadBindings();
  const bound = all.filter((id) => bindings[id]);
  const missing = all.filter((id) => !bindings[id]);
  const status: BindingStatus =
    qualifiedAt === null || bound.length === 0 ? "unauthenticated" : missing.length === 0 ? "bound" : "partial";
  return { status, endpoint, qualifiedAt, bound, missing };
}

export class UnboundCapabilityError extends Error {
  constructor(public capability: CapabilityId) {
    super(`Capability "${capability}" is not bound. Authenticate Agent OS and record its tools/list first.`);
    this.name = "UnboundCapabilityError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor(public capability: CapabilityId) {
    super(`Capability "${capability}" is a write and requires a valid owner approval token.`);
    this.name = "ApprovalRequiredError";
  }
}

export class OwnerOnlyError extends Error {
  constructor(public capability: CapabilityId) {
    super(`Capability "${capability}" is irreversible and must be executed by the owner, not the agent.`);
    this.name = "OwnerOnlyError";
  }
}

export type InvokeOptions = {
  /** Opaque owner approval token minted by the approval flow for this exact action. */
  approvalToken?: string;
  /** Injected in tests; real callers rely on the runtime MCP transport being absent. */
  transport?: (toolName: string, args: unknown) => Promise<unknown>;
};

/**
 * Resolve a capability to its bound tool and invoke it — subject to binding,
 * approval, and owner-only gates. In this runtime no MCP transport is wired, so
 * a fully bound + approved read/write still stops at the transport with a clear
 * "not connected" error rather than fabricating a result.
 */
export async function invoke(capability: CapabilityId, args: unknown, options: InvokeOptions = {}): Promise<unknown> {
  const spec = getCapability(capability);

  if (spec.irreversible) throw new OwnerOnlyError(capability);

  const { bindings } = await loadBindings();
  const toolName = bindings[capability];
  if (!toolName) throw new UnboundCapabilityError(capability);

  if (isWrite(capability) && !options.approvalToken) throw new ApprovalRequiredError(capability);

  const transport = options.transport;
  if (!transport) {
    throw new Error(
      `Agent OS MCP transport is not connected in this runtime; cannot invoke "${toolName}". ` +
        `Authorize binance-mcp-server in an interactive client to enable live calls.`,
    );
  }
  return transport(toolName, args);
}
