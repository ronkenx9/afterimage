# AFTERIMAGE — demo voiceover script

~75 seconds. Truthful to what the product does (paper / propose-only / live reads
vs. execution). Timecodes align with `scripts/record-demo.mjs`. The **Spoken
lines** block at the bottom is clean text you can paste straight into a TTS
generator.

---

**[0:00–0:10] — Hook · the agent dashboard**
> Most trading agents wait for you to tell them what to do. This one doesn't. AFTERIMAGE read ten live markets, formed its own opinions, and drafted three ready-to-approve trades — and it placed none of them.

**[0:10–0:22] — Reversibility (the edge)**
> Here's what makes it different. It refuses to propose a trade without also computing the way out — the exact order to unwind it, a protective stop, the round-trip cost, and the worst-case loss. Every move ships with its escape hatch.

**[0:22–0:34] — Pattern learning**
> It also remembers. From real historical candles it learns what each setup actually did — how often a breakout followed through, and when it was a trap. So a proposal doesn't just say "buy" — it says "this pattern worked sixty-nine percent of the time it fired."

**[0:34–0:46] — Guardrails**
> And it can't run wild. The safety rules live in code, at one chokepoint nothing can talk it out of. No withdrawals, ever. Spot only. Hard spending caps. And it will never place an order on its own — that always takes your approval.

**[0:46–0:58] — Reconstruction on chain**
> It reads the chain, too. Give it a wallet, and it reconstructs the real balance history straight from Solana — bounded, and honest about what it can't see. No made-up numbers.

**[0:58–1:15] — Close**
> This isn't a notebook demo. It runs as a daemon on a live server, scanning the market every minute. An agent that finds its own edge, proves what worked, and always leaves you the way back. That's AFTERIMAGE.

---

## Spoken lines (paste into TTS)

Most trading agents wait for you to tell them what to do. This one doesn't. AFTERIMAGE read ten live markets, formed its own opinions, and drafted three ready-to-approve trades — and it placed none of them.

Here's what makes it different. It refuses to propose a trade without also computing the way out — the exact order to unwind it, a protective stop, the round-trip cost, and the worst-case loss. Every move ships with its escape hatch.

It also remembers. From real historical candles it learns what each setup actually did — how often a breakout followed through, and when it was a trap. So a proposal doesn't just say buy — it says this pattern worked sixty-nine percent of the time it fired.

And it can't run wild. The safety rules live in code, at one chokepoint nothing can talk it out of. No withdrawals, ever. Spot only. Hard spending caps. And it will never place an order on its own — that always takes your approval.

It reads the chain, too. Give it a wallet, and it reconstructs the real balance history straight from Solana — bounded, and honest about what it can't see. No made-up numbers.

This isn't a notebook demo. It runs as a daemon on a live server, scanning the market every minute. An agent that finds its own edge, proves what worked, and always leaves you the way back. That's AFTERIMAGE.

---

### Delivery notes
- Tone: calm, confident, factual — let the claims carry it. No hype adjectives.
- Pace ~150 wpm. If your TTS runs long, cut the pattern paragraph's second sentence first.
- Pronounce "AFTERIMAGE" as three beats: after-im-age.
- Keep "sixty-nine percent" only if a pattern with that hit-rate is on screen; otherwise say "the majority of the time it fired."
