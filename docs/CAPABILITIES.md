# AFTERIMAGE — baseline capability surface

This is the standard trading-agent primitive set (the "everything a DeFi/on-chain
agent can do" surface) mapped onto **Binance Agent OS Spot** rails. It is the
foundation the reconstruction / Then-Now edge sits on top of.

Catalog: `packages/core/src/capabilities.ts` (14 capabilities).
Order planning: `packages/core/src/trade.ts`.
Live adapter: `packages/integrations/src/agentos.ts` (binding-based, fail-closed).
Facade + provider select: `packages/integrations/src/execution.ts`.

## The primitives

| Capability | Access | Approval | Notes |
|---|---|---|---|
| `market.symbols` | read | none | Exchange info incl. lot/tick/min-notional filters |
| `market.quote` | read | none | Price, 24h change, bid/ask |
| `market.depth` | read | none | Order-book depth for slippage estimation |
| `account.balances` | read | none | Free/locked per asset — needs auth |
| `account.portfolio` | read | none | Balances valued at live marks — needs auth |
| `trade.order` | write | owner | BUY/SELL, MARKET/LIMIT — planned + owner-approved |
| `trade.cancel` | write | owner | Cancel a resting order |
| `order.status` | read | none | One order's status/fills |
| `order.open` | read | none | All resting orders |
| `order.history` | read | none | Historical orders/trades for reconciliation |
| `convert.quote` | read | none | Spot analogue of a DEX swap quote |
| `convert.execute` | write | owner | Accept a firm convert quote |
| `transfer.depositAddress` | read | none | Read-only receive address |
| `transfer.withdraw` | write | owner | **Irreversible — owner-executed only, never the agent** |

## Order planning (`planOrder`)

Symbol-agnostic, deterministic, pure. Validates any request against the symbol's
exchange filters (min quantity, lot `stepSize`, `tickSize`, min notional) and the
configured risk caps (default floor 10, cap 250 quote/order, 10 bps fee). Lot
rounding floors quantity so it never increases the owner's committed spend.
LIMIT orders price off the limit, not the mark. Returns `eligible` with a plan or
`blocked` with a reason. Planning never submits.

## Binding — how "real execution" turns on (fail-closed)

The adapter carries **no guessed Agent OS tool names**. It resolves each
capability to a live tool name from a binding map in `docs/binance-tools.json`,
populated only after an authenticated `tools/list`:

1. Authorize `binance-mcp-server` in a supported interactive MCP client (`/mcp` or `claude mcp`).
2. Run `pnpm qualify:binance` and record the redacted `tools/list` into `bindings`.
3. Set `AFTERIMAGE_EXECUTION_MODE=agentos`.

**Status (T9, done):** `tools/list` was resolved in an authenticated session and
13/14 capabilities are bound in `docs/binance-tools.json`. `transfer.withdraw`
stays owner-only/unbound by design, so `bindingReport()` reports `partial`.
`pnpm qualify:binance` now verifies the recorded manifest against this catalog
(every required capability bound to a tool that exists in the recorded
`tools/list`). Binding does not enable execution: no MCP transport is wired into
the Next runtime yet, so a bound + owner-approved call still fails closed at the
transport with an explicit not-connected error.

Before binding, every capability is `unbound` and `invoke()` fails closed. Gate order
inside `invoke()`:

- **irreversible** (`transfer.withdraw`) → refused outright; the owner performs it.
- **unbound** → `UnboundCapabilityError`.
- **write without an owner approval token** → `ApprovalRequiredError`.
- **bound + approved, but no MCP transport wired** → explicit "not connected" error, never a fabricated result.

No user funds are accessed and no live order is placed by the agent.

## API

- `GET /api/capabilities` → catalog + live binding status + execution mode.
- `POST /api/trade/plan` → deterministic plan (never submits).
- Existing `/api/orders/*` → the immutable paper preview → approve → fill demo flow.
