// Agent OS MCP transport for the execution adapter.
//
// The adapter (agentos.ts) resolves a capability to a bound tool name and hands
// it to a transport. This module builds that transport as a JSON-RPC `tools/call`
// over HTTP against an authenticated Agent OS endpoint.
//
// It is OFF unless BOTH env vars are set, so nothing connects by accident:
//   AFTERIMAGE_MCP_HTTP_URL   - the authenticated MCP HTTP endpoint
//   AFTERIMAGE_MCP_BEARER     - the session bearer obtained via the owner's OAuth
//
// Even when connected, the adapter still enforces its own gates: writes need a
// per-action owner approval token and irreversible capabilities (withdraw) are
// refused. This transport is the plumbing, not an authorization bypass.

export type Transport = (toolName: string, args: unknown) => Promise<unknown>;

export class TransportNotConfiguredError extends Error {
  constructor() {
    super(
      "Agent OS MCP transport is not configured. Set AFTERIMAGE_MCP_HTTP_URL and AFTERIMAGE_MCP_BEARER " +
        "from the owner's authenticated session to enable live tool calls.",
    );
    this.name = "TransportNotConfiguredError";
  }
}

type JsonRpcResult = { result?: { content?: unknown; isError?: boolean }; error?: { message?: string } };

/**
 * Build a live transport if configured, else `null`. Callers that receive `null`
 * must continue to fail closed (the adapter already does).
 */
export function maybeHttpMcpTransport(): Transport | null {
  const url = process.env.AFTERIMAGE_MCP_HTTP_URL;
  const bearer = process.env.AFTERIMAGE_MCP_BEARER;
  if (!url || !bearer) return null;

  let id = 0;
  return async (toolName: string, args: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++id,
        method: "tools/call",
        params: { name: toolName, arguments: args ?? {} },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Agent OS tools/call failed: HTTP ${res.status}`);
    const body = (await res.json()) as JsonRpcResult;
    if (body.error) throw new Error(`Agent OS error: ${body.error.message ?? "unknown"}`);
    if (body.result?.isError) throw new Error("Agent OS returned a tool error.");
    return body.result?.content ?? body.result ?? null;
  };
}

/** Strict variant for read paths that should surface a clear error when unset. */
export function httpMcpTransport(): Transport {
  const t = maybeHttpMcpTransport();
  if (!t) throw new TransportNotConfiguredError();
  return t;
}
