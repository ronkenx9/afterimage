// Pattern-learning engine.
//
// Ingests a real historical candle series and learns, deterministically, what
// each recurring setup actually DID — not what we hope it does. For every bar it
// asks "which named setups fired here?", then measures the forward outcome over a
// fixed horizon. Aggregated across the window that yields, per pattern:
//   - how often it fired, its hit-rate, average return, and expectancy
//   - "pattern violations" (bull traps / failed breakouts) tracked as their own
//     setup, because a setup that fails is itself a signal
// Then it reports which patterns are firing on the LAST bar, annotated with that
// learned history — so the agent's conviction is backed by evidence, not vibes.
//
// This is explainable by construction: every number traces to counted candles.
// It is NOT a predictor. It is a memory of what happened after this shape before.

import { atr, donchian, ema, rsi, type Candle } from "@/packages/core/src/indicators";

export type PatternId =
  | "rsi_oversold_bounce"
  | "ema_golden_cross"
  | "donchian_breakout"
  | "failed_breakout"
  | "ema_breakdown";

export type PatternDirection = "long" | "avoid";

export const PATTERN_META: Record<PatternId, { label: string; direction: PatternDirection; blurb: string }> = {
  rsi_oversold_bounce: { label: "RSI oversold bounce", direction: "long", blurb: "RSI crossed back up through 30 — sellers exhausted." },
  ema_golden_cross: { label: "EMA golden cross", direction: "long", blurb: "Fast EMA crossed above slow EMA — trend turning up." },
  donchian_breakout: { label: "Breakout", direction: "long", blurb: "Close broke above the N-bar high — range resolved up." },
  failed_breakout: { label: "Failed breakout (bull trap)", direction: "avoid", blurb: "Broke out, then closed back inside — trap. Historically a fade/avoid." },
  ema_breakdown: { label: "EMA breakdown", direction: "avoid", blurb: "Fast EMA crossed below slow EMA — trend rolling over." },
};

export type PatternConfig = {
  fast: number; // fast EMA
  slow: number; // slow EMA
  rsiPeriod: number;
  breakoutLookback: number; // Donchian window
  horizon: number; // bars measured forward for the outcome
};

export const DEFAULT_PATTERN_CONFIG: PatternConfig = {
  fast: 9,
  slow: 21,
  rsiPeriod: 14,
  breakoutLookback: 20,
  horizon: 8,
};

export type PatternMatch = { id: PatternId; direction: PatternDirection };

type Series = {
  candles: Candle[];
  fastE: number[];
  slowE: number[];
  rsiV: number[];
  don: { upper: number[]; lower: number[] };
  atrV: number[];
};

function build(candles: Candle[], cfg: PatternConfig): Series {
  const c = candles.map((x) => x.close);
  return {
    candles,
    fastE: ema(c, cfg.fast),
    slowE: ema(c, cfg.slow),
    rsiV: rsi(c, cfg.rsiPeriod),
    don: donchian(candles, cfg.breakoutLookback),
    atrV: atr(candles, cfg.rsiPeriod),
  };
}

/** Which patterns fire on the entry decision AT bar i (using i and i-1 only). */
function detectAt(s: Series, i: number): PatternMatch[] {
  if (i < 1) return [];
  const out: PatternMatch[] = [];
  const { candles, fastE, slowE, rsiV, don } = s;

  // RSI oversold bounce: crossed up through 30.
  if (!Number.isNaN(rsiV[i]) && !Number.isNaN(rsiV[i - 1]) && rsiV[i - 1] < 30 && rsiV[i] >= 30) {
    out.push({ id: "rsi_oversold_bounce", direction: "long" });
  }
  // EMA crosses.
  if (!Number.isNaN(fastE[i]) && !Number.isNaN(slowE[i]) && !Number.isNaN(fastE[i - 1]) && !Number.isNaN(slowE[i - 1])) {
    if (fastE[i - 1] <= slowE[i - 1] && fastE[i] > slowE[i]) out.push({ id: "ema_golden_cross", direction: "long" });
    if (fastE[i - 1] >= slowE[i - 1] && fastE[i] < slowE[i]) out.push({ id: "ema_breakdown", direction: "avoid" });
  }
  // Donchian breakout: close clears the prior N-bar high.
  if (!Number.isNaN(don.upper[i]) && candles[i].close > don.upper[i] && candles[i - 1].close <= don.upper[i]) {
    out.push({ id: "donchian_breakout", direction: "long" });
  }
  // Failed breakout (bull trap): previous bar broke out, this bar closes back inside.
  if (
    !Number.isNaN(don.upper[i - 1]) &&
    candles[i - 1].close > don.upper[i - 1] &&
    candles[i].close < don.upper[i - 1]
  ) {
    out.push({ id: "failed_breakout", direction: "avoid" });
  }
  return out;
}

export type PatternStat = {
  id: PatternId;
  label: string;
  direction: PatternDirection;
  occurrences: number;
  hitRate: number; // fraction of occurrences whose forward move matched the direction
  avgReturnPct: number; // mean forward return over the horizon (long convention)
  expectancyPct: number; // directional expectancy (long: +ret; avoid: -ret, i.e. edge of NOT holding)
  medianReturnPct: number;
};

export type PatternBacktest = {
  interval: string;
  bars: number;
  horizon: number;
  stats: PatternStat[]; // sorted by |expectancy| desc
};

const pct = (n: number, dp = 3) => Number(n.toFixed(dp));
const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Learn per-pattern outcomes across the whole series. Deterministic. */
export function backtestPatterns(
  candles: Candle[],
  interval: string,
  cfg: PatternConfig = DEFAULT_PATTERN_CONFIG,
): PatternBacktest {
  const s = build(candles, cfg);
  const acc = new Map<PatternId, { dir: PatternDirection; rets: number[]; wins: number }>();

  for (let i = 1; i < candles.length - cfg.horizon; i++) {
    const matches = detectAt(s, i);
    if (matches.length === 0) continue;
    const fwd = (candles[i + cfg.horizon].close - candles[i].close) / candles[i].close;
    for (const m of matches) {
      const bucket = acc.get(m.id) ?? { dir: m.direction, rets: [], wins: 0 };
      bucket.rets.push(fwd);
      // A "win" respects the setup's direction: long wants up, avoid wants down.
      const win = m.direction === "long" ? fwd > 0 : fwd < 0;
      if (win) bucket.wins += 1;
      acc.set(m.id, bucket);
    }
  }

  const stats: PatternStat[] = [];
  for (const [id, b] of acc) {
    const n = b.rets.length;
    const mean = b.rets.reduce((a, x) => a + x, 0) / n;
    const expectancy = b.dir === "long" ? mean : -mean;
    stats.push({
      id,
      label: PATTERN_META[id].label,
      direction: b.dir,
      occurrences: n,
      hitRate: pct(b.wins / n, 3),
      avgReturnPct: pct(mean * 100, 3),
      expectancyPct: pct(expectancy * 100, 3),
      medianReturnPct: pct(median(b.rets) * 100, 3),
    });
  }
  stats.sort((a, b) => Math.abs(b.expectancyPct) - Math.abs(a.expectancyPct));
  return { interval, bars: candles.length, horizon: cfg.horizon, stats };
}

export type LivePattern = {
  id: PatternId;
  label: string;
  direction: PatternDirection;
  blurb: string;
  /** Learned history for this pattern on this series, if it occurred before. */
  history?: PatternStat;
};

/** Which patterns fire on the most recent bar, annotated with learned history. */
export function livePatterns(
  candles: Candle[],
  backtest: PatternBacktest,
  cfg: PatternConfig = DEFAULT_PATTERN_CONFIG,
): LivePattern[] {
  const s = build(candles, cfg);
  const i = candles.length - 1;
  const byId = new Map(backtest.stats.map((st) => [st.id, st]));
  return detectAt(s, i).map((m) => ({
    id: m.id,
    label: PATTERN_META[m.id].label,
    direction: m.direction,
    blurb: PATTERN_META[m.id].blurb,
    history: byId.get(m.id),
  }));
}
