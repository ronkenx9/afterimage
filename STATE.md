# AFTERIMAGE state

Last updated: 2026-09-07

## Completion level

Local verified prototype. Public market reads are implemented independently of MCP. Agent OS account connection and execution are not claimed.

## Implemented

- Bounded replay investigation with explicit coverage limits and source evidence IDs.
- FIFO known-basis ledger, unknown-basis separation, fees, partial exits, and deterministic claims.
- Responsive investigation desk with evidence drawer, Then/Now comparison, behavior profile, and paper order ticket.
- Immutable order previews, short-lived approvals, payload hashing, and duplicate-submit protection.
- Read-only Binance public Spot snapshot adapter with a deterministic stale fallback labeled as replay.
- Unit, integration, browser, type, lint, and production build checks.

## External gates

- This runtime has no authenticated Binance MCP tool surface. Exact `tools/list` schemas, OAuth callback support, balances, order submission, and fill reconciliation remain unqualified.
- No user funds were accessed and no live order was placed.
- The replay case is synthetic but structurally realistic. It is not advertised as a real profitable wallet.

## Next task

Connect Binance MCP through a supported client, run `pnpm qualify:binance`, replace `docs/binance-tools.json` with the redacted `tools/list` manifest, then implement only the exact discovered Spot preview, submit, lookup, and fill schemas behind the existing adapter boundary.
