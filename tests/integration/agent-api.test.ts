import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { GET as getAlpha } from "@/app/api/alpha/route";
import { GET as tickGet, POST as tickPost } from "@/app/api/agent/tick/route";

// Force the deterministic captured-live fallback so these run offline in CI:
// an unreachable market base URL makes fetchLiveUniverse return null.
beforeEach(() => vi.stubEnv("BINANCE_MARKET_BASE_URL", "http://127.0.0.1:1"));
afterEach(() => vi.unstubAllEnvs());

describe("agent API", () => {
  it("GET /api/alpha surfaces ranked opportunities from captured-live data", async () => {
    const res = await getAlpha(new Request("http://local/api/alpha"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.source).toBe("captured-live");
    expect(body.scan.actionable.length).toBeGreaterThan(0);
    expect(body.scan.actionable[0].symbol).toBe("INJUSDT");
  });

  it("GET /api/agent/tick proposes owner-gated trades and submits nothing", async () => {
    const res = await tickGet();
    expect(res.status).toBe(200);
    const { report } = await res.json();
    expect(report.execution.submitted).toBe(false);
    expect(report.execution.mode).toBe("propose-only");
    expect(report.proposals.length).toBeGreaterThan(0);
    for (const p of report.proposals) {
      expect(p.state).toBe("AWAITING_APPROVAL");
      expect(p.reversal.unwind.side).not.toBe(p.entry.side);
    }
  });

  it("POST /api/agent/tick honors budget and maxProposals overrides", async () => {
    const res = await tickPost(
      new Request("http://local/api/agent/tick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxProposals: 1, budgetPerTradeQuote: "50" }),
      }),
    );
    expect(res.status).toBe(200);
    const { report } = await res.json();
    expect(report.proposals.length).toBe(1);
    expect(Number(report.proposals[0].entry.notional)).toBeLessThanOrEqual(50);
    expect(report.execution.submitted).toBe(false);
  });
});
