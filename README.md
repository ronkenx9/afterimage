# AFTERIMAGE

**You saw the profit. See how it happened.**

AFTERIMAGE reconstructs observable wallet trading into an evidence-linked timeline, separates verified result from missing basis, compares historical conditions with the present market, and creates an explicitly approved paper order.

This repository is a prototype for the Binance Agent OS Mini Hackathon. The agent runs autonomously against live market data and its capability surface is bound to the authenticated Agent OS `tools/list`; it deliberately stops short of spending funds — live order submission stays an owner action (see Safety model).

## The edge

Most trading agents fire an order and forget it. AFTERIMAGE does two things differently:

1. **Surfaces its own alpha.** An autonomous loop reads a live multi-symbol universe, forms deterministic momentum + mean-reversion opinions (liquidity/spread gated), and ranks them with a plain-language rationale — no human tells it what to trade.
2. **Reversibility.** It refuses to propose an entry without also computing the *undo*: the inverse unwind order, a protective stop, the round-trip cost, the worst-case max loss, a reversibility score, and a time-boxed auto-unwind. Every forward action ships with its afterimage.
3. **Learns from what actually happened.** A pattern engine ingests ~240 real candles per symbol and measures what each setup *did* — how often "breakout" or "RSI oversold bounce" fired, its hit-rate, and its expectancy — plus pattern *violations* (bull traps) as their own signal. Proposals are annotated with that learned history: "this setup fired 16× and followed through 69% of the time." It is a memory of outcomes, explicitly **not** a predictor. See [docs/PATTERNS.md](docs/PATTERNS.md).

See **[docs/ALPHA-AGENT.md](docs/ALPHA-AGENT.md)**.

```sh
pnpm agent --once     # one autonomous cycle, printed
pnpm agent            # run it as a server daemon
```

Then open `/agent` for the live console, or hit `GET /api/alpha` and `GET|POST /api/agent/tick`.

## What's real vs. what's a demo (read this before judging)

**Real and live** — the autonomous trading side:
- Autonomous agent reads **live** Binance Spot market data, surfaces its own ranked alphas, plans orders against **real** exchange filters, and computes a reversibility (undo) plan per trade. Runs as a systemd daemon.
- A pattern-learning engine ingests **real historical candles** and reports what each setup actually did (forward hit-rate, expectancy, and pattern violations) — explainable, not a black box.
- Agent OS capability surface bound to the **real authenticated `tools/list`** (13/14; withdraw owner-only).

**Demo / not live** — the reconstruction side:
- The wallet **reconstruction** UI runs on a **bundled replay case** (`tests/fixtures/case.ts`). Live arbitrary-wallet ingestion and on-chain (Jupiter) decoding are **scaffolded, not wired** — the investigate endpoint says so explicitly and never pretends to have traced a pasted address.

**Deliberately not automated** — execution:
- The agent **never submits an order.** Live fills require a wired authenticated transport, a per-action owner approval of the exact payload hash, and the owner's Agent OS client. Irreversible capabilities (withdraw) are never proposed.

## What works

- **Autonomous alpha agent** over a live universe (Binance public REST, with a frozen real capture as deterministic fallback) — self-ranked opportunities, real-filter order planning, and a per-trade reversibility plan. Fail-closed: it proposes, it never submits.
- **Bound Agent OS capability surface** — 13/14 capabilities mapped to live `tools/list` tool names (`pnpm qualify:binance` verifies); `transfer.withdraw` stays owner-only.
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
pnpm agent --once
pnpm demo:replay
```

No automated command places a real trade. `qualify:binance` is read-only, and `pnpm agent` is propose-only.

## Safety model

Money math is deterministic and uses Decimal.js. Model output is not required. Same-ticker assets are never mapped by symbol alone. Order approval binds to the exact symbol, side, quantity, price snapshot, fee estimate, expiry, mode, and payload hash. A changed or expired intent is rejected.

Paper mode is persistent in the interface. The autonomous agent is **propose-only**: it surfaces, plans, and reverses, and emits proposals in `AWAITING_APPROVAL` bound to a payload hash — it never submits. Live order submission spends real funds and stays the owner's action: it needs a wired authenticated transport (`AFTERIMAGE_MCP_*`), a per-action owner approval of the exact hash, and the owner's Agent OS client to execute. Irreversible capabilities (`transfer.withdraw`) are never proposed. See [integration qualification](docs/INTEGRATION-QUALIFICATION.md) and [live proof](docs/LIVE-PROOF.md).

## Current boundaries

- The bundled case is synthetic replay data, not a real wallet claim.
- Direct Solana wallet ingestion and Jupiter instruction decoding are scaffolded but not complete.
- Postgres schema is supplied, while the local replay uses process memory for short-lived intents.
- Binance Agent OS OAuth, balance access, tool schemas, order placement, and fill reconciliation await an authenticated supported-client session.
- FIFO is an analytical convention, not tax advice. USDC/USDT denomination is not guaranteed exact USD value.

Read [data coverage](docs/DATA-COVERAGE.md), [demo flow](docs/DEMO.md), and [submission checklist](docs/SUBMISSION.md) before presenting the project.
