# AFTERIMAGE — autonomous alpha agent + reversibility edge

The baseline (docs/CAPABILITIES.md) is a bound, fail-closed capability surface.
This is what sits on top: an agent that finds its own trades and refuses to
propose one without also computing how to undo it.

## The loop (one cycle)

```
observe live market → surface alphas (by itself) → size + plan vs real filters
    → attach reversibility (the undo) → emit immutable owner-ready proposal
```

- **Observe** — `packages/integrations/src/market-universe.ts` pulls a live
  multi-symbol 24h snapshot + exchange filters from Binance public REST. Offline,
  it falls back to a frozen snapshot of **real** data captured from an
  authenticated Agent OS session (2026-09-08), so the engine is always grounded
  in genuine numbers and stays deterministic. Every row is labeled `source`
  (`live` | `captured-live` | `replay-fallback`).
- **Surface** — `packages/core/src/alpha.ts`. Pure, deterministic signals per
  symbol: 24h momentum, VWAP gap, 24h range position, volatility, spread (bps),
  liquidity (quote volume). Two archetypes compete and the stronger wins:
  - *momentum (BUY)* — a real up-move with headroom below the 24h high, liquid
    and tight.
  - *mean-reversion (BUY)* — a liquid name at a discount to its 24h VWAP, near
    the low, that the agent expects to snap back.
  Illiquid or wide-spread names are gated out. SELL/fade ideas are surfaced but
  marked inventory-required (the agent starts flat). Every signal carries a
  plain-language rationale.
- **Plan** — reuses the existing symbol-agnostic `planOrder` (real lot/tick/
  min-notional filters + risk caps). Rounding never increases committed spend.
- **Reverse** — `packages/core/src/reversibility.ts`, the edge. For each entry it
  computes the **afterimage**: the inverse MARKET order that returns the account
  to flat, a protective stop that bounds the loss, the two-leg round-trip cost
  (fee + spread + slippage) in bps, the worst-case max loss, a 0..1
  reversibility score (cheaper/tighter = higher), and a time-boxed auto-unwind
  deadline.
- **Emit** — `packages/core/src/agent.ts` binds `{entry, reversal}` to a sha256
  the owner approves, in state `AWAITING_APPROVAL`.

## Fail-closed on execution

The agent **never submits an order.** `runAgentCycle` returns proposals only;
`execution.submitted` is always `false`. Turning a proposal into a live fill
requires, by design *and* by policy:

1. the owner wiring an authenticated transport (`AFTERIMAGE_MCP_HTTP_URL` +
   `AFTERIMAGE_MCP_BEARER`, see `packages/integrations/src/mcp-transport.ts`),
2. the owner approving that specific proposal's payload hash, and
3. the owner's authenticated Agent OS client executing it.

Irreversible capabilities (`transfer.withdraw`) are never part of a proposal.

## Run it on the server

```bash
pnpm agent            # daemon: a cycle every 60s, prints owner-ready proposals
pnpm agent --once     # a single cycle then exit (used by the self-test / CI)
AGENT_INTERVAL_MS=30000 AGENT_BUDGET=50 AGENT_MAX=2 pnpm agent
```

HTTP + UI (via `pnpm dev` / `pnpm start`):

- `GET /api/alpha` — ranked opportunities the agent surfaced (read-only).
- `GET|POST /api/agent/tick` — one full cycle; POST accepts
  `{ budgetPerTradeQuote, maxProposals }`. Never submits.
- `/agent` — server-rendered console showing the live cycle: proposals, each with
  its reversibility plan, and the strongest rejected ideas.

## The equity ("stocks") sleeve

The universe is symbol-agnostic. A stock sleeve is **discovery-gated**: the agent
probes for tokenized-stock tickers (`STOCK_PROBE`) and only surfaces those the
live `exchangeInfo` actually lists. As of the capture, AAPL/TSLA/COIN-USDT return
`Invalid symbol` on the Agent OS Spot surface, so nothing equity is fabricated —
the sleeve lights up automatically if/when such symbols list.

## Determinism & tests

Everything except the network fetch is pure. Given the same universe + `now`,
rankings, plans, reversal math, and payload hashes are identical. Covered by
`tests/alpha.test.ts`, `tests/reversibility.test.ts`, `tests/agent.test.ts`, and
`tests/integration/agent-api.test.ts`.
