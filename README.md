# AFTERIMAGE

**You saw the profit. See how it happened.**

AFTERIMAGE reconstructs observable wallet trading into an evidence-linked timeline, separates verified result from missing basis, compares historical conditions with the present market, and creates an explicitly approved paper order.

This repository is a local verified prototype for the Binance Agent OS Mini Hackathon. It does not claim an authenticated Agent OS account or live trade.

## What works

- Bounded Solana-style replay with coverage disclosure and content-addressed evidence.
- FIFO analytical lots, partial exits, losses, unknown basis, fees, failed events, and unsupported activity.
- Evidence-linked claims and a limited-sample behavior profile.
- Then/Now comparison using Binance Spot public market data with an honestly labeled replay fallback.
- Immutable 60-second paper intents, payload hashes, explicit approval, duplicate protection, and reconciled receipts.
- Responsive keyboard-accessible UI with reduced-motion support.

## Quick start

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000` and choose **Use replay case**.

## Verify

```sh
pnpm db:migrate
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm qualify:binance
pnpm demo:replay
```

No automated command places a real trade. `qualify:binance` is read-only.

## Safety model

Money math is deterministic and uses Decimal.js. Model output is not required. Same-ticker assets are never mapped by symbol alone. Order approval binds to the exact symbol, side, quantity, price snapshot, fee estimate, expiry, mode, and payload hash. A changed or expired intent is rejected.

Paper mode is persistent in the interface. Live account controls are absent until the exact authenticated Agent OS schemas are qualified. See [integration qualification](docs/INTEGRATION-QUALIFICATION.md) and [live proof](docs/LIVE-PROOF.md).

## Current boundaries

- The bundled case is synthetic replay data, not a real wallet claim.
- Direct Solana wallet ingestion and Jupiter instruction decoding are scaffolded but not complete.
- Postgres schema is supplied, while the local replay uses process memory for short-lived intents.
- Binance Agent OS OAuth, balance access, tool schemas, order placement, and fill reconciliation await an authenticated supported-client session.
- FIFO is an analytical convention, not tax advice. USDC/USDT denomination is not guaranteed exact USD value.

Read [data coverage](docs/DATA-COVERAGE.md), [demo flow](docs/DEMO.md), and [submission checklist](docs/SUBMISSION.md) before presenting the project.
