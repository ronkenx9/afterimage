"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft, ArrowSquareOut, CaretRight, Check, Clock, Copy, Database, Fingerprint,
  LockKey, MagnifyingGlass, ShieldCheck, Warning, X,
} from "@phosphor-icons/react";
import type { InvestigationCase } from "@/packages/core/src/types";
import type { Reconstruction } from "@/packages/core/src/ledger";
import type { OrderIntent } from "@/packages/core/src/intent";
import type { MarketSnapshot } from "@/packages/integrations/src/binance-public";

type Claim = { id: string; label: string; value: string; evidenceIds: string[]; limitation: string };
type Profile = { sampleLabel: string; decodedEpisodes: number; stagedExit: boolean; exitSummary: string; basisSummary: string };

export function CaseWorkbench({ investigation, reconstruction, claims, profile }: { investigation: InvestigationCase; reconstruction: Reconstruction; claims: Claim[]; profile: Profile }) {
  const reduce = useReducedMotion();
  const [activeEvidence, setActiveEvidence] = useState<string[] | null>(null);
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [amount, setAmount] = useState("50.00");
  const [order, setOrder] = useState<OrderIntent | null>(null);
  const [orderError, setOrderError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/market?symbol=SOLUSDT").then((response) => response.json()).then(setMarket).catch(() => setMarket(null));
  }, []);

  const evidence = useMemo(() => investigation.evidence.filter((item) => activeEvidence?.includes(item.id)), [activeEvidence, investigation.evidence]);

  async function preview() {
    setBusy(true); setOrderError("");
    const response = await fetch("/api/orders/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: "SOLUSDT", side: "BUY", quoteAmount: amount, mode: "paper", marketPrice: market?.price ?? "203.40" }) });
    const body = await response.json();
    if (!response.ok) setOrderError(body.reason ?? body.error ?? "Preview failed"); else setOrder(body);
    setBusy(false);
  }

  async function approveAndFill() {
    if (!order) return;
    setBusy(true); setOrderError("");
    try {
      const approved = await fetch(`/api/orders/${order.id}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ payloadHash: order.payloadHash }) });
      const approvedBody = await approved.json();
      if (!approved.ok) throw new Error(approvedBody.error);
      const submitted = await fetch(`/api/orders/${order.id}/submit`, { method: "POST" });
      const submittedBody = await submitted.json();
      if (!submitted.ok) throw new Error(submittedBody.error);
      setOrder(submittedBody);
    } catch (error) { setOrderError(error instanceof Error ? error.message : "Paper submission failed"); }
    setBusy(false);
  }

  return (
    <main className="workbench-shell">
      <header className="case-nav">
        <Link href="/" className="icon-link" aria-label="Back to investigate"><ArrowLeft size={19} /></Link>
        <Link href="/" className="case-brand">AFTERIMAGE</Link>
        <div className="case-identity"><span>CASE ECHO-7</span><code>{investigation.input.slice(0, 5)}...{investigation.input.slice(-4)}</code></div>
        <span className="mode-lock"><ShieldCheck size={16} weight="fill" /> Paper mode</span>
      </header>

      <section className="case-hero">
        <div>
          <span className="eyebrow">RECONSTRUCTION COMPLETE</span>
          <h1>{investigation.title}</h1>
          <p>The observable trade made money. Its full return cannot be verified because part of the starting inventory arrived before this window.</p>
        </div>
        <button className="coverage-button" onClick={() => setActiveEvidence(investigation.evidence.map((item) => item.id))}>
          <Database size={21} /><span><b>{investigation.coverage.transactions} transactions inspected</b><small>Bounded 30-day replay</small></span><CaretRight size={18} />
        </button>
      </section>

      <section className="coverage-banner"><Warning size={20} weight="fill" /><p><strong>Partial history.</strong> {investigation.coverage.limitation}</p></section>

      <section className="finding-grid">
        {claims.map((claim, index) => (
          <button key={claim.id} className={`finding finding-${index + 1}`} onClick={() => setActiveEvidence(claim.evidenceIds)}>
            <span>{claim.label}</span><strong>{claim.value}</strong><p>{claim.limitation}</p><small>Open evidence <ArrowSquareOut size={14} /></small>
          </button>
        ))}
        <div className="finding finding-3"><span>Excluded from profit</span><strong>{reconstruction.excludedDisposalQuantity} SOL</strong><p>Disposed quantity matched to inventory with no observed acquisition basis.</p></div>
      </section>

      <section className="timeline-section">
        <div className="section-heading"><h2>The actual sequence</h2><p>Events are ordered by Solana slot. Unsupported activity remains in the record.</p></div>
        <div className="timeline">
          {investigation.events.map((event, index) => (
            <motion.button
              key={event.id}
              initial={reduce ? false : { opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: .6 }}
              transition={{ duration: .4, delay: index * .045 }}
              className={`timeline-row ${event.kind === "lp" || event.status === "failed" ? "muted-event" : ""}`}
              onClick={() => event.evidenceIds.length && setActiveEvidence(event.evidenceIds)}
            >
              <time>{event.occurredAt ? new Date(event.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No time"}</time>
              <span className={`event-mark ${event.kind}`}><i /></span>
              <div><b>{event.note}</b><small>Slot {event.slot} / {event.signature}</small></div>
              <span className="event-kind">{event.status === "failed" ? "FAILED" : event.kind.toUpperCase()}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="then-now-section">
        <div className="section-heading"><h2>Then is not now</h2><p>Historical on-chain execution and current centralized exchange conditions are different venues and different moments.</p></div>
        <div className="then-now-grid">
          <article className="then-panel">
            <span>THEN / SOLANA</span><h3>$169.10</h3><p>Observed acquisition price on Aug 12</p>
            <dl><div><dt>Observed size</dt><dd>1.50 SOL</dd></div><div><dt>Exit pattern</dt><dd>2 staged disposals</dd></div><div><dt>History</dt><dd>Incomplete</dd></div></dl>
          </article>
          <article className="now-panel">
            <span>NOW / BINANCE SPOT</span>
            {market ? <><h3>${Number(market.price).toFixed(2)}</h3><p>{market.stale ? "Captured replay snapshot" : "Current public market snapshot"}</p><dl><div><dt>Bid / ask</dt><dd>{Number(market.bid).toFixed(2)} / {Number(market.ask).toFixed(2)}</dd></div><div><dt>24-hour move</dt><dd>{Number(market.change24h).toFixed(2)}%</dd></div><div><dt>Source</dt><dd>{market.source === "binance-public" ? "Live public API" : "Replay fallback"}</dd></div></dl></> : <div className="market-skeleton" aria-label="Loading market snapshot"><i /><i /><i /></div>}
          </article>
        </div>
      </section>

      <section className="decision-grid">
        <article className="profile-panel">
          <span className="profile-label"><Fingerprint size={18} /> {profile.sampleLabel}</span>
          <h2>Observed behavior, not a personality score.</h2>
          <div className="profile-facts"><div><strong>{profile.decodedEpisodes}</strong><span>decoded swaps</span></div><div><strong>{profile.stagedExit ? "2" : "1"}</strong><span>exit stages</span></div></div>
          <p>{profile.exitSummary}. {profile.basisSummary}.</p>
        </article>

        <article className="order-panel">
          <div className="order-head"><div><span>Paper order</span><h2>Test the possible trade</h2></div><LockKey size={22} /></div>
          {!order || order.state === "AWAITING_APPROVAL" ? <>
            <label htmlFor="amount">Maximum spend in USDT</label>
            <div className="amount-input"><span>$</span><input id="amount" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setOrder(null); }} /></div>
            <div className="order-summary"><span>SOLUSDT / BUY</span><span>Paper only</span><span>{market ? `Preview near $${Number(market.price).toFixed(2)}` : "Waiting for market"}</span></div>
            {order ? <div className="approval-box"><p>You are approving exactly <strong>{order.baseQuantity} SOL</strong> for at most <strong>{order.quoteAmount} USDT</strong>, plus an estimated {order.estimatedFee} USDT paper fee.</p><button onClick={() => void approveAndFill()} disabled={busy}>Approve paper fill <Check size={18} /></button></div> : <button className="preview-button" onClick={() => void preview()} disabled={busy || !market}>{busy ? "Preparing" : "Preview order"}<CaretRight size={18} /></button>}
          </> : <div className="receipt"><Check size={24} weight="bold" /><span>Paper fill reconciled</span><strong>{order.baseQuantity} SOL</strong><p>Receipt {order.receiptId}</p><small>No funds moved. This receipt is a deterministic simulation.</small></div>}
          {orderError && <p className="order-error" role="alert">{orderError}</p>}
        </article>
      </section>

      <footer className="case-footer"><p><Clock size={16} /> Replay captured Sep 7, 2026. Research is not a recommendation.</p><Link href="/">New investigation</Link></footer>

      <AnimatePresence>
        {activeEvidence && <motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveEvidence(null)}>
          <motion.aside className="evidence-drawer" initial={reduce ? false : { x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 220, damping: 28 }} onClick={(event) => event.stopPropagation()} aria-label="Evidence drawer">
            <button className="drawer-close" onClick={() => setActiveEvidence(null)} aria-label="Close evidence"><X size={20} /></button>
            <MagnifyingGlass size={24} /><h2>Evidence, not assertion</h2><p>These source records support the selected claim. Replay payloads are redacted and content-addressed.</p>
            <div className="evidence-list">{evidence.map((item) => <article key={item.id}><span>{item.source.replace("-", " ")}</span><strong>{item.label}</strong><code>{item.hash}</code><button onClick={() => navigator.clipboard?.writeText(item.hash)}><Copy size={15} /> Copy hash</button></article>)}</div>
            <div className="drawer-note"><Warning size={18} /><p>Evidence proves observable flows, not private intent, complete wallet ownership, or future performance.</p></div>
          </motion.aside>
        </motion.div>}
      </AnimatePresence>
    </main>
  );
}
