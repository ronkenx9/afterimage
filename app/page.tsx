import { InvestigateForm } from "@/components/investigate-form";
import { BrandMark } from "@/components/brand-mark";
import { ArrowUpRight, Binoculars, Fingerprint, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a href="#top" className="brand" aria-label="Afterimage home"><BrandMark /> AFTERIMAGE</a>
        <div className="nav-actions">
          <span className="mode-lock"><ShieldCheck size={16} weight="fill" /> Paper mode</span>
          <Link className="text-link" href="/agent">Agent console <ArrowUpRight size={16} /></Link>
          <Link className="text-link" href="/case/echo-7">Open replay <ArrowUpRight size={16} /></Link>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy enter">
          <span className="eyebrow">Evidence before execution</span>
          <h1>You saw the profit.<br />See how it happened.</h1>
          <p>Reconstruct the trade, expose what is missing, then decide what still makes sense now.</p>
          <InvestigateForm />
        </div>

        <div className="trace-panel enter-late" aria-label="Example evidence trace">
          <div className="trace-head">
            <div><span className="trace-kicker">CASE ECHO-7</span><strong>1.50 SOL acquired</strong></div>
            <span className="source-stamp">REPLAY</span>
          </div>
          <div className="trace-canvas">
            <div className="axis-label left">AUG 12</div><div className="axis-label right">SEP 02</div>
            <div className="trace-line" />
            <div className="trace-node node-a"><span>ENTRY</span><b>$169.10</b></div>
            <div className="trace-node node-b"><span>EXIT</span><b>$205.00</b></div>
            <div className="trace-node node-c unknown"><span>UNKNOWN BASIS</span><b>1.35 SOL</b></div>
          </div>
          <div className="trace-verdict">
            <span>Known-basis realized</span>
            <strong>+$56.25 <small>USDC-denominated</small></strong>
            <p>The visible win is real. The full wallet return is not knowable from this window.</p>
          </div>
        </div>
      </section>

      <section className="method-strip" aria-label="Method">
        <div><Fingerprint size={22} /><span>Traceable</span><p>Every number opens its evidence.</p></div>
        <div><Binoculars size={22} /><span>Bounded</span><p>Missing history stays visibly unknown.</p></div>
        <div><ShieldCheck size={22} /><span>Confirmable</span><p>Every order binds to an exact preview.</p></div>
      </section>

      <footer className="footer">
        <span>AFTERIMAGE</span>
        <p>Research is not a recommendation. Digital assets carry risk.</p>
      </footer>
    </main>
  );
}
