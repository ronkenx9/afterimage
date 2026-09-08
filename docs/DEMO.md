# Demo (60–90s script)

Lead with the live agent — it's the differentiator. Keep every claim truthful.

## A. The autonomous agent (headline, ~40s)
1. `pnpm dev`, open `http://localhost:3000`, click **Agent console** (or go to `/agent`).
2. Point at the header: "It read N live symbols, formed its own opinions, drafted owner-ready proposals — and submitted nothing." Note the **LIVE** stamp + timestamp.
3. On a proposal card, walk the three things that make it different:
   - **It surfaced this itself** — momentum / mean-reversion, with the plain-English reason.
   - **Reversibility** — the pre-computed undo: inverse unwind order, protective stop, round-trip cost, max loss, auto-unwind time. "Every trade ships with its exit."
   - **Learned pattern** (when one is firing) — "this setup fired 16× in the last window and followed through 69% of the time." Scroll to **What the agent learned** for the market-breadth view.
4. Say it out loud: **the agent never places the order** — it stops at an owner-approved hash. That's deliberate.

## B. Reconstruction, honestly (~20s)
5. Two truths, stated plainly:
   - **Real:** `curl "http://localhost:3000/api/reconstruct?address=<a-solana-wallet>"` → a live, bounded on-chain balance-delta ledger + coverage manifest, straight from Solana RPC.
   - **Demo:** the polished investigation UI runs on a **bundled replay case** (open it via **Use replay case**) — full trade decode + Then/Now is wired for the replay, not yet arbitrary live wallets. The app says so; don't overclaim.
6. In the replay case: open a known-basis result and its evidence hash; show the coverage manifest keeping unknown history visible; show the immutable paper-intent → approve → reconciled receipt.

## C. It runs on a server (~10s)
7. "This isn't a notebook — it's a daemon." Show `journalctl -u afterimage-agent -f` on the VPS streaming a fresh cycle every minute on live data.

## Truth line (say this)
- Agent OS capabilities are bound to the real authenticated `tools/list`.
- Market data + pattern learning + reconstruction are **live**; the investigation UI is a labeled replay.
- The agent proposes and reverses; **it never executes** — live fills stay an owner action.

CLI fallbacks: `pnpm agent --once` (one live cycle), `pnpm demo:replay`.
