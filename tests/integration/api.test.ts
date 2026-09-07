import { describe, expect, it, vi } from "vitest";
import { POST as createInvestigation } from "@/app/api/investigations/route";
import { GET as getMarket } from "@/app/api/market/route";

describe("API boundaries", () => {
  it("rejects an invalid Solana input", async () => {
    const response = await createInvestigation(new Request("http://local/api/investigations", { method: "POST", body: JSON.stringify({ input: "not-a-wallet", windowDays: 30 }) }));
    expect(response.status).toBe(400);
  });

  it("creates the bounded replay investigation", async () => {
    const response = await createInvestigation(new Request("http://local/api/investigations", { method: "POST", body: JSON.stringify({ input: "5h3LvjL67eM88vTdfM8YqfvKauTmxo6TW7m4m8P2mF8Z", windowDays: 30 }) }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: "echo-7", mode: "replay" });
  });

  it("labels the deterministic market fallback as stale", async () => {
    vi.stubEnv("BINANCE_MARKET_BASE_URL", "http://127.0.0.1:1");
    const response = await getMarket(new Request("http://local/api/market?symbol=SOLUSDT"));
    expect(await response.json()).toMatchObject({ source: "replay-fallback", stale: true });
    vi.unstubAllEnvs();
  });

  it("rejects unreviewed market symbols", async () => {
    const response = await getMarket(new Request("http://local/api/market?symbol=MEMEUSDT"));
    expect(response.status).toBe(400);
  });
});
