"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Lock, ArrowClockwise } from "@phosphor-icons/react";

type Effective = {
  maxOrderNotionalQuote: string;
  maxProposalsPerCycle: number;
  budgetPerTradeQuote: string;
  clampedToAbsolute: boolean;
};

type Proposal = {
  id: string;
  alpha: { symbol: string; base: string; quote: string; side: string; strategy: string };
  entry: { side: string; baseQuantity: string; price: string; notional: string };
  reversal: { protectiveStop: { stopPrice: string }; reversibilityScore: number };
};

const ABS = { notional: 250, proposals: 5 };
const KEY = "afterimage.mandates.v1";

export function MandatesPanel() {
  const [maxNotional, setMaxNotional] = useState(150);
  const [maxProposals, setMaxProposals] = useState(3);
  const [budget, setBudget] = useState(100);
  const [loading, setLoading] = useState(false);
  const [effective, setEffective] = useState<Effective | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);

  useEffect(() => {
    // One-time hydration of the saved mandates from this browser. Safe: runs once
    // on mount, defaults when storage is empty or blocked.
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved) {
        /* eslint-disable react-hooks/set-state-in-effect */
        setMaxNotional(saved.maxNotional ?? 150);
        setMaxProposals(saved.maxProposals ?? 3);
        setBudget(saved.budget ?? 100);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* first run / blocked storage — use defaults */
    }
  }, []);

  async function apply() {
    setLoading(true);
    try {
      localStorage.setItem(KEY, JSON.stringify({ maxNotional, maxProposals, budget }));
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch("/api/agent/tick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          maxOrderNotionalQuote: maxNotional,
          maxProposals,
          budgetPerTradeQuote: String(budget),
        }),
      });
      const data = await res.json();
      setEffective(data.effectiveLimits ?? null);
      setProposals(data.report?.proposals ?? []);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mandates">
      <div className="mandates-head">
        <SlidersHorizontal size={18} /> Set your mandates
        <span className="mandates-badge"><Lock size={11} weight="fill" /> tighten-only</span>
      </div>
      <p className="mandates-sub">
        Make the agent stricter than the absolute code caps — never looser. Whatever you set is clamped server-side to
        the hard ceilings (per-order ≤ {ABS.notional}, ≤ {ABS.proposals} proposals/cycle).
      </p>

      <div className="mandates-controls">
        <label>
          Max notional / order <b>{maxNotional} USDT</b>
          <input type="range" min={10} max={ABS.notional} step={10} value={maxNotional} onChange={(e) => setMaxNotional(Number(e.target.value))} />
        </label>
        <label>
          Budget / trade <b>{budget} USDT</b>
          <input type="range" min={10} max={ABS.notional} step={10} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </label>
        <label>
          Max proposals / cycle <b>{maxProposals}</b>
          <input type="range" min={1} max={ABS.proposals} step={1} value={maxProposals} onChange={(e) => setMaxProposals(Number(e.target.value))} />
        </label>
      </div>

      <button className="mandates-apply" onClick={apply} disabled={loading}>
        <ArrowClockwise size={16} /> {loading ? "Running…" : "Apply mandates & re-run"}
      </button>

      {effective && (
        <div className="mandates-result">
          <p className="mandates-effective">
            Effective (clamped): per-order ≤ <b>{effective.maxOrderNotionalQuote}</b> · budget{" "}
            <b>{effective.budgetPerTradeQuote}</b> · ≤ <b>{effective.maxProposalsPerCycle}</b> proposals
            {effective.clampedToAbsolute && <span className="mandates-clamp"> — your request exceeded a hard cap and was clamped down.</span>}
          </p>
          <ul className="mandates-proposals">
            {(proposals ?? []).map((p) => (
              <li key={p.id}>
                <span className={`side side-${p.entry.side.toLowerCase()}`}>{p.entry.side}</span>
                <strong>{p.alpha.symbol}</strong>
                <span>{p.entry.notional} {p.alpha.quote}</span>
                <em>stop {p.reversal.protectiveStop.stopPrice} · rev {p.reversal.reversibilityScore}</em>
              </li>
            ))}
            {proposals && proposals.length === 0 && <li className="mandates-empty">No proposals fit these mandates this cycle.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
