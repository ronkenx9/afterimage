import Link from "next/link";
import { ArrowLeft, ShieldCheck, ArrowClockwise, TrendUp, Pulse, Brain, Lock } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/brand-mark";
import { runCycle } from "@/packages/integrations/src/alpha-runtime";
import { GUARDRAILS } from "@/packages/core/src/guardrails";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

export default async function AgentConsole() {
  const { meta, report, patternBreadth } = await runCycle();

  return (
    <main className="site-shell agent-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <Link href="/" className="brand" aria-label="Afterimage home"><BrandMark /> AFTERIMAGE</Link>
        <div className="nav-actions">
          <span className="mode-lock"><ShieldCheck size={16} weight="fill" /> Propose-only · owner-gated</span>
          <Link className="text-link" href="/"><ArrowLeft size={16} /> Home</Link>
        </div>
      </nav>

      <section className="agent-wrap">
        <header className="agent-header">
          <div>
            <span className="eyebrow">Autonomous alpha agent</span>
            <h1>The agent surfaced its own trades.</h1>
            <p>
              It read {report.universeSize} live symbols, formed {report.actionableCount} opinions, and drafted{" "}
              {report.proposals.length} owner-ready proposals — each with a pre-computed way to reverse it. It submitted
              nothing.
            </p>
          </div>
          <div className="agent-stamp">
            <span className={`source-stamp ${meta.source === "live" ? "live" : ""}`}>
              {meta.source === "live" ? "LIVE" : "CAPTURED-LIVE"}
            </span>
            <code>{meta.observedAt}</code>
            <code>{report.cycleId}</code>
          </div>
        </header>

        <div className="agent-stats">
          <div><span>Universe</span><strong>{report.universeSize}</strong><small>symbols scanned</small></div>
          <div><span>Actionable alphas</span><strong>{report.actionableCount}</strong><small>passed the gate</small></div>
          <div><span>Proposals</span><strong>{report.proposals.length}</strong><small>awaiting owner approval</small></div>
          <div><span>Submitted</span><strong>0</strong><small>agent never executes</small></div>
        </div>

        <h2 className="agent-h2"><TrendUp size={20} /> Owner-ready proposals</h2>
        <div className="agent-proposals">
          {report.proposals.map((p) => (
            <article key={p.id} className="agent-card">
              <div className="agent-card-head">
                <div>
                  <span className={`side side-${p.entry.side.toLowerCase()}`}>{p.entry.side}</span>
                  <strong>{p.alpha.symbol}</strong>
                  <em>{p.alpha.strategy}</em>
                </div>
                <div className="agent-conf">
                  <span>conf {p.alpha.confidence}</span>
                  <span>score {p.alpha.score}</span>
                </div>
              </div>

              <p className="agent-why">{p.alpha.rationale[0]}</p>
              {p.alpha.rationale[1] && <p className="agent-why muted">{p.alpha.rationale[1]}</p>}

              <dl className="agent-metrics">
                <div><dt>24h</dt><dd>{pct(p.alpha.signals.momentumPct)}</dd></div>
                <div><dt>vs VWAP</dt><dd>{pct(p.alpha.signals.vwapGapPct)}</dd></div>
                <div><dt>range</dt><dd>{(p.alpha.signals.rangePosition * 100).toFixed(0)}%</dd></div>
                <div><dt>spread</dt><dd>{p.alpha.signals.spreadBps}bps</dd></div>
              </dl>

              <div className="agent-order">
                <span>Entry</span>
                <code>
                  {p.entry.type} {p.entry.side} {p.entry.baseQuantity} {p.alpha.base} @ {p.entry.price} ·{" "}
                  {p.entry.notional} {p.alpha.quote} · fee {p.entry.estimatedFee}
                </code>
              </div>

              <div className="agent-reversal">
                <div className="agent-reversal-head">
                  <ArrowClockwise size={15} /> Reversibility
                  <span className="rev-score">{p.reversal.reversibilityScore}</span>
                </div>
                <dl className="agent-metrics">
                  <div><dt>unwind</dt><dd>{p.reversal.unwind.side} {p.reversal.unwind.baseQuantity}</dd></div>
                  <div><dt>stop</dt><dd>{p.reversal.protectiveStop.stopPrice} ({p.reversal.protectiveStop.triggerPct}%)</dd></div>
                  <div><dt>round-trip</dt><dd>{p.reversal.roundTripCostBps}bps</dd></div>
                  <div><dt>max loss</dt><dd>{p.reversal.maxLossQuote} {p.alpha.quote}</dd></div>
                </dl>
                <small>Auto-unwind by {new Date(p.reversal.unwindBy).toLocaleTimeString()} if the thesis stalls.</small>
              </div>

              {p.patternEvidence && (
                <div className="agent-pattern">
                  <div className="agent-pattern-head"><Brain size={15} /> {p.patternEvidence.label}</div>
                  {p.patternEvidence.history ? (
                    <small>
                      Fired {p.patternEvidence.history.occurrences}× in the last window · hit-rate{" "}
                      {(p.patternEvidence.history.hitRate * 100).toFixed(0)}% · expectancy{" "}
                      {pct(p.patternEvidence.history.expectancyPct)}
                    </small>
                  ) : (
                    <small>{p.patternEvidence.blurb}</small>
                  )}
                </div>
              )}

              <div className="agent-approve">
                <code>approve {p.payloadHash.slice(0, 18)}…</code>
                <span className="agent-badge">AWAITING OWNER APPROVAL</span>
              </div>
            </article>
          ))}
          {report.proposals.length === 0 && <p className="agent-empty">No eligible proposals this cycle.</p>}
        </div>

        <h2 className="agent-h2"><Pulse size={20} /> Also surfaced</h2>
        <div className="agent-skipped">
          {report.skipped.map((s, i) => (
            <div key={`${s.symbol}-${i}`} className="agent-skip-row">
              <strong>{s.symbol}</strong>
              <span>score {s.score}</span>
              <em>{s.reason}</em>
            </div>
          ))}
        </div>

        <h2 className="agent-h2"><Brain size={20} /> What the agent learned (live candles)</h2>
        {patternBreadth.length > 0 ? (
          <div className="agent-skipped">
            {patternBreadth.map((b) => (
              <div key={b.id} className="agent-skip-row">
                <strong>{b.label}</strong>
                <span>{b.count} firing</span>
                <em>{b.firingSymbols.join(", ")}</em>
              </div>
            ))}
          </div>
        ) : (
          <p className="agent-empty">
            No named setup is firing across the universe on the latest bar. The engine still learned each pattern&apos;s
            historical hit-rate from ~240 real candles per symbol — shown on any proposal whose setup is active.
          </p>
        )}

        <h2 className="agent-h2"><Lock size={20} /> Enforced guardrails <span className="rev-score">v{GUARDRAILS.version}</span></h2>
        <div className="agent-guardrails">
          <ul>
            {GUARDRAILS.mandates.map((m, i) => (
              <li key={i}><Lock size={13} weight="fill" /> {m}</li>
            ))}
          </ul>
          <p className="agent-guardrails-foot">
            Enforced in code at a single chokepoint — not promptable, not configurable, and not relaxable by anything the
            agent reads. Per-order cap {GUARDRAILS.limits.maxOrderNotionalQuote} · daily ceiling{" "}
            {GUARDRAILS.limits.maxDailyNotionalQuote} · max {GUARDRAILS.limits.maxProposalsPerCycle} proposals/cycle.
          </p>
        </div>

        <div className="agent-note">
          <ShieldCheck size={18} weight="fill" />
          <p>
            {report.execution.note} Live order submission spends real funds and stays the owner&apos;s action — the agent
            plans and reverses, it does not execute.
          </p>
        </div>
      </section>
    </main>
  );
}
