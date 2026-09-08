# AFTERIMAGE — pattern-learning engine

A trading agent that only reacts to *now* has no memory. This engine gives the
agent one: it ingests real historical candles and learns what each recurring
setup actually did afterward, so a proposal can say "this shape worked 69% of the
time the last 16 times it appeared" instead of hand-waving.

Explainable by construction, deterministic, and honest about being a **memory of
outcomes — not a prediction.**

## What it does

`packages/core/src/indicators.ts` — standard, auditable indicators over an OHLCV
series: SMA, EMA, Wilder RSI, Wilder ATR, Donchian channels. Pure functions.

`packages/core/src/patterns.ts` — the engine:

- **Detects** named setups on each bar from those indicators:
  - `rsi_oversold_bounce` — RSI crossed back up through 30 (long)
  - `ema_golden_cross` — fast EMA crossed above slow EMA (long)
  - `donchian_breakout` — close cleared the prior N-bar high (long)
  - `failed_breakout` — broke out, then closed back inside: a bull trap (avoid)
  - `ema_breakdown` — fast EMA crossed below slow EMA (avoid)
- **Backtests** across the window: for every occurrence it measures the forward
  return over a fixed horizon, then aggregates per setup — occurrences, hit-rate
  (respecting the setup's direction), average/median return, and expectancy.
- **Reports what is firing on the latest bar**, annotated with that learned
  history.

`packages/integrations/src/pattern-runtime.ts` — pulls real candles for the
universe (`loadKlines`, Binance public REST), runs the engine per symbol, and
computes **cross-symbol breadth**: which setups are firing across multiple names
at once ("who else was there"). When candles are unavailable it returns an
empty, labeled scan — it never fabricates history.

## How the agent uses it

`runCycle` scans patterns in parallel with the market read and attaches the
strongest firing setup (ranked by |expectancy|) to each proposal as
`patternEvidence` — **after** the payload hash, so it is advisory context and
never alters the order the owner approves. Surfaced at `GET /api/patterns` and in
the `/agent` console (per-proposal evidence + a market-breadth section).

## Honesty

- It learns from a bounded window (default ~240 bars); it is not lifetime truth.
- Hit-rate and expectancy are counted from real candles, shown with the
  occurrence count so a thin sample is visible as thin.
- It informs conviction; it does not place orders. Execution stays owner-gated.
- Deterministic: identical candles ⇒ identical stats. Tested in
  `tests/patterns.test.ts`.
