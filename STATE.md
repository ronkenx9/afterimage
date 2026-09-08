# AFTERIMAGE state

Last updated: 2026-09-08 (autonomous agent + reversibility edge shipped)

## Completion level

Local verified prototype. Public market reads are implemented independently of MCP. Agent OS account connection and execution are not claimed.

## Implemented

- Bounded replay investigation with explicit coverage limits and source evidence IDs.
- FIFO known-basis ledger, unknown-basis separation, fees, partial exits, and deterministic claims.
- Responsive investigation desk with evidence drawer, Then/Now comparison, behavior profile, and paper order ticket.
- Immutable order previews, short-lived approvals, payload hashing, and duplicate-submit protection.
- Read-only Binance public Spot snapshot adapter with a deterministic stale fallback labeled as replay.
- Baseline trading-agent capability surface (see docs/CAPABILITIES.md): 14-primitive catalog, symbol-agnostic deterministic order planner (BUY/SELL, MARKET/LIMIT, exchange filters + risk caps), and a fail-closed Agent OS binding adapter that resolves live tool names only after an authenticated tools/list.
- Unit, integration, browser, type, lint, and production build checks (28 unit/integration tests).

- Agent OS `tools/list` resolved in an authenticated session: 13/14 capabilities bound to live tool names in `docs/binance-tools.json` (T9). `transfer.withdraw` stays owner-only/unbound by design. `pnpm qualify:binance` verifies the manifest against the catalog (QUALIFIED).
- Autonomous alpha agent shipped (the hackathon edge). It reads a live multi-symbol universe (Binance public REST, with a frozen real capture as deterministic fallback), surfaces its own ranked opportunities (momentum + mean-reversion, liquidity/spread gated), sizes each against real exchange filters + risk caps, and attaches a **reversibility plan** — inverse unwind order, protective stop, round-trip cost, max loss, and a time-boxed auto-unwind. Emits immutable, owner-hashed proposals. Surfaces = `packages/core/src/alpha.ts`; reversibility = `packages/core/src/reversibility.ts`; loop = `packages/core/src/agent.ts`. Runtime + live data = `packages/integrations/src/{alpha-runtime,market-universe,mcp-transport}.ts`.
- Runs as a server: `pnpm agent` (daemon, `--once` for one cycle), `GET /api/alpha`, `GET|POST /api/agent/tick`, and a server-rendered console at `/agent`. Verified live end-to-end (source=live) on 2026-09-08: top proposals INJ (momentum), SUI (mean-reversion), XRP (momentum), each owner-gated, `submitted:false`.
- Full checks green: 53 unit/integration tests, typecheck, lint, production build, browser render (no console errors).

## External gates

- Bindings are recorded, but no MCP transport is wired into the Next runtime, so a bound+approved call still fails closed with an explicit not-connected error. Live balances, order submission, and fill reconciliation against an authenticated account remain unverified (T10, T12).
- No user funds were accessed and no live order was placed.
- The replay case is synthetic but structurally realistic. It is not advertised as a real profitable wallet.

## Next task

Wire an MCP transport into the adapter (`invoke`'s `transport` arg) against the authenticated `binance-mcp-server`, then verify account isolation, a read (balances), and a single owner-approved order + reconciled fill (T10, T12). Bindings and schemas are already recorded.
