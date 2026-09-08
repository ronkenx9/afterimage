# AFTERIMAGE tasks

Evidence is recorded in `STATE.md` and the named docs.

- [x] T0: Inspect workspace and qualify the documented Agent OS boundary.
- [x] T1: Scaffold the application and reproducible checks.
- [x] T2: Add a bounded replay case and document provider coverage.
- [x] T3: Normalize deterministic ledger events and preserve unknowns.
- [x] T4: Implement FIFO known-basis accounting and edge-case tests.
- [x] T5: Build evidence-linked claims and limited-sample profile.
- [x] T6: Add live public Binance market reads and reviewed asset mapping.
- [x] T7: Build investigate, case, evidence, and Then/Now journeys.
- [x] T8: Implement immutable paper intents and replay protection.
- [x] T8b: Baseline capability surface — 14-primitive catalog, symbol-agnostic order planner (BUY/SELL, MARKET/LIMIT, exchange filters + caps), fail-closed Agent OS binding adapter, `/api/capabilities` + `/api/trade/plan`, +13 tests.
- [x] T9: Bind exact authenticated Agent OS MCP trading schemas — 13/14 capabilities bound from an in-session authenticated `tools/list`; `transfer.withdraw` intentionally owner-only/unbound. `pnpm qualify:binance` verifies the manifest against the catalog.
- [ ] T10: Verify account isolation, fills, and recovery against an authenticated account.
- [x] T11: Verify desktop/mobile browser journey and production build.
- [ ] T12: Record a separately approved live order and reconciled fill.
- [x] T13: Package README, replay demo, limitations, and submission checklist.
- [x] T14: Autonomous alpha engine — deterministic momentum + mean-reversion signals over a live universe, liquidity/spread gated, self-ranked with rationale (`packages/core/src/alpha.ts`).
- [x] T15: Reversibility edge — every entry ships its undo: inverse unwind order, protective stop, round-trip cost, max loss, reversibility score, time-boxed auto-unwind (`packages/core/src/reversibility.ts`).
- [x] T16: Agent control loop — observe → surface → plan → reverse → emit immutable owner-hashed proposals; fail-closed, submits nothing (`packages/core/src/agent.ts`).
- [x] T17: Run on the server — `pnpm agent` daemon, `/api/alpha`, `/api/agent/tick`, server-rendered `/agent` console; verified live end-to-end + 23 new tests.

## Deliberately owner-gated (not automated — policy + design)

- Live order submission spending real funds stays the owner's action. The agent proposes and reverses; it never executes. Enabling live fills means the owner wires `AFTERIMAGE_MCP_*` (see mcp-transport.ts), approves a specific proposal hash, and their authenticated Agent OS client submits — T10/T12.
