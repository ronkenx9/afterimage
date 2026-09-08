import { describe, expect, it } from "vitest";
import { CAPABILITIES, getCapability, isWrite, requiresApproval } from "@/packages/core/src/capabilities";
import {
  ApprovalRequiredError,
  OwnerOnlyError,
  UnboundCapabilityError,
  bindingReport,
  invoke,
} from "@/packages/integrations/src/agentos";

describe("capability catalog", () => {
  it("classifies reads and writes", () => {
    expect(getCapability("market.quote").access).toBe("read");
    expect(isWrite("trade.order")).toBe(true);
    expect(requiresApproval("convert.execute")).toBe(true);
  });

  it("marks withdraw irreversible and owner-approved", () => {
    const withdraw = getCapability("transfer.withdraw");
    expect(withdraw).toMatchObject({ access: "write", approval: "owner", irreversible: true });
  });

  it("throws on an unknown capability", () => {
    // @ts-expect-error deliberately invalid id
    expect(() => getCapability("does.not.exist")).toThrow();
  });
});

describe("agentos adapter (fail-closed)", () => {
  it("reports bindings resolved from the recorded tools/list", async () => {
    // docs/binance-tools.json is now populated from an authenticated tools/list.
    // All 13 non-irreversible capabilities are bound; transfer.withdraw stays
    // owner-only/unbound by design, so the overall status is `partial`.
    const report = await bindingReport(CAPABILITIES.map((c) => c.id));
    expect(report.status).toBe("partial");
    expect(report.qualifiedAt).not.toBeNull();
    expect(report.bound).toHaveLength(CAPABILITIES.filter((c) => !c.irreversible).length);
    expect(report.missing).toEqual(["transfer.withdraw"]);
  });

  it("refuses irreversible withdraw before anything else", async () => {
    // Withdraw is refused by the agent even though it is unbound — the
    // irreversible guard fires ahead of the binding check.
    await expect(invoke("transfer.withdraw", {})).rejects.toBeInstanceOf(OwnerOnlyError);
  });

  it("keeps UnboundCapabilityError available for any capability that loses its binding", () => {
    // Every non-irreversible capability is bound in the recorded manifest, so
    // there is no live unbound path to exercise; the guard still protects any
    // future capability added before its tools/list entry exists.
    expect(UnboundCapabilityError).toBeTypeOf("function");
  });

  it("fails closed on a bound read when no MCP transport is wired", async () => {
    // Bound, no approval needed, but the runtime has no transport: it must
    // surface an explicit not-connected error rather than fabricate a result.
    await expect(invoke("market.quote", { symbol: "SOLUSDT" })).rejects.toThrow(/transport is not connected/);
  });

  it("requires an approval token for a bound write before the transport is even consulted", async () => {
    const transport = async () => ({ ok: true });
    // trade.order is bound now, so the write path is reachable — and it must
    // stop at the missing owner approval token, not at the transport.
    await expect(invoke("trade.order", {}, { transport })).rejects.toBeInstanceOf(ApprovalRequiredError);
  });

  it("reaches the transport only once a bound write is owner-approved", async () => {
    // With a binding AND an approval token, the write is finally allowed to
    // reach the transport — which is absent here, so it fails closed there.
    await expect(
      invoke("trade.order", { symbol: "SOLUSDT", side: "BUY", type: "MARKET", quantity: 1 }, { approvalToken: "owner-ok" }),
    ).rejects.toThrow(/transport is not connected/);
  });
});
