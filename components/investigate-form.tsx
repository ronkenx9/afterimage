"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Flask } from "@phosphor-icons/react";

const example = "5h3LvjL67eM88vTdfM8YqfvKauTmxo6TW7m4m8P2mF8Z";

export function InvestigateForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(value = input) {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: value, windowDays: 30 }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Investigation failed");
      router.push(`/case/${body.id}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Investigation failed");
    }
  }

  return (
    <form className="investigate-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label htmlFor="wallet">Solana wallet or signature</label>
      <div className="input-row">
        <input id="wallet" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste a public address or transaction signature" aria-describedby="wallet-help" />
        <button type="submit" disabled={status === "loading"}>{status === "loading" ? "Tracing" : "Investigate"}<ArrowRight size={18} /></button>
      </div>
      <div className="form-meta">
        <span id="wallet-help">Demo runs on a bundled replay case — live wallet ingestion is not wired in this build.</span>
        <button type="button" className="example-link" onClick={() => { setInput(example); void submit(example); }}><Flask size={15} /> Use replay case</button>
      </div>
      {status === "error" && <p className="form-error" role="alert">{message}</p>}
    </form>
  );
}
