import { describe, expect, it } from "vitest";
import { adaptProposal } from "@/packages/core/src/policy";

describe("adaptProposal", () => {
  it("rounds down instead of increasing user spend", () => {
    const result = adaptProposal({ symbol: "SOLUSDT", side: "BUY", quoteAmount: "50.00", mode: "paper" }, "203.40");
    expect(result).toMatchObject({ status: "eligible", baseQuantity: "0.24582", maxSpend: "50.00" });
  });

  it("blocks below-minimum and over-cap orders", () => {
    expect(adaptProposal({ symbol: "SOLUSDT", side: "BUY", quoteAmount: "9.99", mode: "paper" }, "200").status).toBe("blocked");
    expect(adaptProposal({ symbol: "SOLUSDT", side: "BUY", quoteAmount: "250.01", mode: "paper" }, "200").status).toBe("blocked");
  });
});
