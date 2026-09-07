# AFTERIMAGE — end-to-end product and implementation plan

> Working name. Prepared 7 September 2026. Status: planned, not implemented.
> Build target: Binance Agent OS Mini Hackathon, Track A.
> Product: a trading agent that reconstructs observed trading activity, explains what made a result possible, and helps a user evaluate and execute a current, explicitly approved Spot trade.

**You saw the profit. See how it happened.**

This is the build contract for the next agent. Implement a complete, narrow product before expanding its capabilities. Read the resources and integration gates before writing trading code. This document authorizes planning and describes a future implementation; it does not authorize spending funds, placing trades, publishing posts, or reusing credentials from other projects.

## Contents

1. [Product and differentiation](#1-product-and-differentiation)
2. [Scope and release gates](#2-scope-and-release-gates)
3. [Agent OS resources](#3-agent-os-resources)
4. [Integration qualification](#4-integration-qualification)
5. [Architecture and repository](#5-architecture-and-repository)
6. [Reconstruction engine](#6-reconstruction-engine)
7. [Trading profile and adaptation](#7-trading-profile-and-adaptation)
8. [Trading execution](#8-trading-execution)
9. [Data and API contracts](#9-data-and-api-contracts)
10. [Agent behavior](#10-agent-behavior)
11. [Brand and user experience](#11-brand-and-user-experience)
12. [Implementation tasks](#12-implementation-tasks)
13. [Verification](#13-verification)
14. [Deployment and operations](#14-deployment-and-operations)
15. [Demo and submission](#15-demo-and-submission)
16. [Future LP and other capabilities](#16-future-lp-and-other-capabilities)
17. [Handoff prompt](#17-handoff-prompt)

## 1. Product and differentiation

### User problem

Someone sees a wallet's spectacular trade or an LP earnings screenshot. They see the outcome without the entry conditions, starting inventory, losing trades, transaction costs, or liquidity constraints. Repeating the visible action later may produce a very different result.

AFTERIMAGE makes the missing context visible. The central experience is:

**Investigate → Reconstruct → Compare then and now → Adapt → Approve → Execute → Verify.**

The agent has ordinary trading capabilities, but its distinctive output is an evidence-backed reconstruction. It should answer:

- What transactions actually occurred, in what order, and for what amounts?
- How much of the reported profit can be verified from the available history?
- Was inventory purchased, received from elsewhere, or acquired before our observation window?
- What observable habits recur: scaling in, partial exits, holding duration, concentration?
- Which conditions have changed since the original entry?
- Is this exact asset tradable through our supported execution venue?
- What would a user-approved order look like given current balances and conditions?

Do not claim to recover a person's intent, private strategy, insider status, off-chain hedges, or complete portfolio. Label inferred patterns as hypotheses. One wallet is one observed account, not necessarily one person.

### Primary user

A curious retail crypto user who can understand a timeline and a plain-language comparison but does not want to manually inspect dozens of transactions. Experienced traders can open the underlying evidence.

### Product wedge

The strongest demonstration is **“Their trade then / Your possible trade now.”** Show a verified historical entry beside current conditions. Sometimes the result should be “insufficient evidence,” “unsupported asset,” or “the original entry conditions are gone.” These are useful product outputs, not failures to generate a buy recommendation.

The initial reconstructed strategy is descriptive. A pattern observed in historical activity is not established predictive alpha. Testing whether a pattern generalizes is a separate later feature.

## 2. Scope and release gates

### P0: required vertical slice

- One Solana wallet or transaction input, with a bounded history window.
- One qualified swap decoder/path and correct treatment of unsupported interactions.
- Deterministic acquisition/disposal ledger with evidence links and partial-history disclosure.
- Reconstructed timeline, verified realized results where basis is known, and remaining inventory.
- A compact profile of observed behavior with sample counts.
- Current Binance market data through Agent OS.
- Exact asset mapping to a supported Spot symbol, or an explicit unsupported state.
- Read the authorized Agentic account balance when permission is available.
- Create an immutable order preview, request explicit confirmation, submit through a qualified Agent OS adapter, and reconcile the actual result.
- Paper/replay mode available at all times and unmistakably labeled.
- Working UI, reproducible setup, tests, and demo evidence.

### P1: only after P0 works

- Saved investigations and comparison of two wallets.
- Import the user's own Binance fills if the connected tools expose them reliably.
- A second Solana swap path, richer charts, and more detailed distribution statistics.
- Manual cancel/status controls for supported open orders.
- Shareable, deliberately redacted investigation cards.

### Deferred

LP accounting/execution, multi-chain wallet reconstruction, screenshot OCR, automatic wallet following, leverage, futures, social feed, autonomous recurring trades, stop-loss automation, copy-trading marketplace, x402 monetization, and token launching.

Do not force a new meme token into a Binance execution story if it is not listed. Demonstrate unsupported reconstruction honestly and use a separate, clearly identified supported example for trading if needed.

### Completion levels

| Level | Evidence needed | Permitted claim |
|---|---|---|
| Local verified | Fixtures, DB tests, paper execution, browser journey | Working local prototype |
| Live research | Real chain data plus real Agent OS market read | Live reconstruction and market integration |
| Account connected | Authorized balance read and account isolation checks | Connected Agentic account |
| Execution verified | Separately approved order, provider status and fills reconciled | Live Spot execution verified |

Never collapse these into one “done” checkbox. Live trading may remain pending user action without blocking research, UI, tests, or documentation.

## 3. Agent OS resources

Links checked on 7 September 2026 unless marked as follow-up. These are integration references, not a promise that every documented API operation is exposed as an MCP tool. Record exact tools and schemas during qualification.

| Resource | URL | How to use it |
|---|---|---|
| Official hackathon | https://www.binance.com/en/blog/community/8802181509900814931 | Recheck rules, deadline and submission steps before delivery |
| Agent OS launch | https://www.binance.com/en/support/announcement/detail/07d45cdd3831498f8a4ff339031a8480 | Official platform overview and permission model |
| MCP setup documentation | https://developers.binance.com/en/docs/agent-native/mcp-server/agentic | Primary setup, authentication and account-management reference |
| Hosted MCP endpoint | `https://agent.binance.com/mcp/agentic` | Configure in an MCP client; not a normal browser page |
| Agent OS landing | https://www.binance.com/en/agent-os | Official onboarding destination; page retrieval failed during this planning pass, use setup docs if unavailable |
| Official Skills Hub repository | https://github.com/binance/binance-skills-hub | Inspect relevant market/trading skills; pin reviewed commit, check license and dependencies before reuse |
| Spot filters | https://developers.binance.com/en/docs/products/spot/filters | Validate current symbol quantity, price and notional constraints |
| Spot trading reference | https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade | Understand order lifecycle and parameters; MCP mapping must be verified separately |
| Official Agent OS examples | https://www.binance.com/en-ZA/blog/tech/4737718203312420809 | Reference for market research and confirmed-order demo patterns |
| Entry survey | https://app.binance.com/uni-qr/user-survey/2913aa200aac462c89a737779393f3d4 | Owner completes final entry |
| Restricted-country reference | https://binance.com/en/about-legal/list-of-prohibited-countries | Owner checks eligibility with current event terms |
| Solana transaction RPC | https://solana.com/docs/rpc/http/gettransaction | Fetch source transaction data and metadata |
| Solana signature history | https://solana.com/docs/rpc/http/getsignaturesforaddress | Paginated signature discovery; address coverage is not complete wallet ownership history |

### Verified sponsor facts

Agent OS includes multiple tools and services; MCP is its connection layer. The official announcement identifies public market reads, permissioned account access and supported trading through a dedicated Agentic sub-account. It states that external withdrawals are unavailable through this MCP integration. Availability depends on permissions and account eligibility. [Launch source](https://www.binance.com/en/support/announcement/detail/07d45cdd3831498f8a4ff339031a8480).

### Setup recipe

For Claude Code, the documented command is:

```sh
claude mcp add binance-mcp-server --transport http https://agent.binance.com/mcp/agentic
```

Then use the client's `/mcp` menu and authenticate. For Codex or another client, use that client's tab in the official setup documentation instead of guessing configuration syntax. Verify with a market-data read first. The owner funds the Agentic sub-account through Binance; the agent cannot pull funds from the main account. Preserve confirmation for every write, including cancellation. [Setup source](https://developers.binance.com/en/docs/agent-native/mcp-server/agentic).

### Resources to qualify during implementation

- MCP SDK: select the official TypeScript SDK version compatible with the target runtime and actual transport/auth flow. Pin it and link its documentation in `docs/DEPENDENCIES.md`.
- Solana provider: direct RPC is the initial reference path. A history indexer may be needed for complete token-account discovery and archival data. Record provider URL, endpoint version, coverage, limits, retention and cost. Do not advertise any provider as free without checking its current plan.
- Swap decoder: choose one actual program/router from the selected example, confirm its program ID and instruction layout using official protocol sources. Do not add guessed IDs or claim generic support from balance changes alone.
- Historical prices: qualify a source and its granularity before calculating historical USD conversions. Missing prices remain unknown.

## 4. Integration qualification

### Gate G0: prove the rails before building around them

Create `docs/INTEGRATION-QUALIFICATION.md` and `docs/binance-tools.json`. Record:

1. Date, client/runtime, transport, environment and official setup reference.
2. Successful MCP initialize and paginated `tools/list`, as applicable.
3. Exact tool names, input/output schemas, required permissions and returned errors.
4. One redacted public market-data response with observation time.
5. If authorized, one balance response with stable account association.
6. Whether the interface supports order placement, lookup, fill retrieval, cancellation, client order IDs and the desired Spot order type.
7. Whether sandbox/testnet exists for this integration. Binance Spot testnet existence alone does not prove Agent OS testnet support.
8. How authentication expires, renews and revokes; whether third-party web-app OAuth registration is supported.
9. Any provider confirmation UI or challenge needed for writes.

Fail closed for missing write capabilities. Re-run qualification if schemas change. Do not write fabricated names such as `binance_buy_token` into production code.

### Choose one deployment mode at G0

**Preferred: standalone application.** Use a server-side MCP client only if the documented OAuth flow supports this application and callback registration. Bind every connection to the application's authenticated user and the selected exchange account. Encrypt provider tokens server-side. A connected Codex/Claude session does not automatically make its credentials available to a Next.js server.

**Deadline fallback: local agent companion.** Run AFTERIMAGE's research/UI locally and expose a small local MCP tool surface for investigation and approval-intent creation. The user's supported host connects both AFTERIMAGE and Binance MCP. The host displays the exact intent, obtains confirmation, uses the actual Binance tool and returns provider evidence for reconciliation. Label this “execute through your connected agent.” Do not call it native in-app execution. Do not extract host credential stores or send bearer tokens through the browser.

If neither path is qualified, ship live research with paper execution and explicitly mark the missing live execution gate. Do not turn mock results into sponsor proof. Continue independent work while owner authentication is pending.

### Asset identity gate

Store identities as chain + mint/contract + token standard and map to Binance base/quote assets only with reviewed provenance. Same ticker or logo is insufficient. Native, wrapped and bridged representations need an explicit relationship and source. Mapping supports economic comparison; it does not imply cross-venue inventory or a bridge operation.

Store unsupported and ambiguous mappings. If the exact asset cannot be established, disable its order action. A transaction involving SOL may inform a SOL comparison, but a meme purchased with SOL is not a SOL trade recommendation.

## 5. Architecture and repository

### Recommended stack

- TypeScript strict mode and a supported Node LTS version, pinned after dependency qualification.
- Next.js/React for the UI and server API; a separate Node worker for ingestion and reconciliation.
- Postgres with versioned migrations, SQL transactions and a lightweight typed query layer.
- Postgres job table with leases initially; no Redis dependency needed for the first slice.
- Zod or equivalent schema validation on all boundaries.
- Decimal arithmetic for money; integers/BigInt for raw token units, serialized as strings.
- Official MCP client SDK, direct RPC adapter, structured model-output client.
- Vitest for logic/integration suites and Playwright for essential browser journeys.

Use a fresh project database or local Postgres. Do not depend on Daybreak's private schema, login flow or secrets. The existing `../binance-agent-os` prototype is reference material only: its September 3 status reports mock settlement/execution and an unresolved live adapter. Review reusable policy code and tests individually; do not import its funding assumptions or x402 scope.

```text
Browser
  └─ authenticated API ── Postgres (user-owned records, jobs, audit)
         ├─ research worker ── Solana RPC/indexer
         │       └─ deterministic ledger ── evidence-only narrator
         ├─ market adapter ── Binance Agent OS MCP
         └─ execution service ── approval + policy ── qualified MCP client
                   └─ reconciliation worker ── order/fill evidence

Optional local-host mode:
Supported AI host ── AFTERIMAGE MCP tools + Binance MCP tools
```

### Target file structure

```text
afterimage/
  BUILD-PLAN.md
  README.md
  TASKS.md
  STATE.md
  .env.example
  apps/web/src/app/             # investigate, case, account, orders
  apps/web/src/components/      # timeline, comparison, evidence, ticket
  apps/worker/src/              # leased jobs and reconciliation
  packages/core/src/
    identity.ts
    ledger.ts
    reconstruction.ts
    profile.ts
    adaptation.ts
    policy.ts
    intent.ts
    evidence.ts
  packages/integrations/src/
    binance-mcp.ts
    solana-rpc.ts
    decoders/
    paper-exchange.ts
  packages/db/                 # migrations, queries, access tests
  packages/agent/               # tools, prompts, narration validation
  tests/fixtures/              # synthetic edge cases + redacted real cases
  tests/e2e/
  scripts/                     # qualification, import, verify, demo
  docs/
    INTEGRATION-QUALIFICATION.md
    binance-tools.json
    DEPENDENCIES.md
    DATA-COVERAGE.md
    LIVE-PROOF.md
    DEMO.md
    SUBMISSION.md
```

This is a target structure, not a claim these files exist. Keep modules small; do not introduce separate microservices for each reasoning step.

## 6. Reconstruction engine

### Input and scope

MVP accepts a validated Solana address or signature and an explicit observation window. Prefer a transaction-first example whose swap path can be independently verified. A pasted post or screenshot can be stored later as a claim, but it cannot establish wallet identity or profit.

Return a coverage manifest before a verdict: requested interval, retrieved interval, account set, page count, missing transactions, decoder version, unsupported operations and earliest known inventory basis. A bounded sample must never be presented as lifetime performance.

### Pipeline

1. Validate input; resolve transaction participants without assuming the fee payer is the trader.
2. Discover signatures and token accounts through the qualified provider; paginate and deduplicate.
3. Fetch transaction bodies and metadata with supported transaction-version settings. Preserve slot, finality, errors and possibly missing timestamps.
4. Expand relevant owned token-account coverage. Current token accounts alone omit closed accounts; wallet-address signatures alone can omit token-account activity. Record that limitation or use qualified archival indexing.
5. Store source payload/hash and retrieval time before normalization.
6. Decode supported swap instructions and reconcile pre/post balances, ownership, inner instructions and net token flows.
7. Classify swaps, transfers, fees, account creation/closure, wrapping, LP interactions and unknown operations separately.
8. Collapse one routed swap's intermediate hops into one economic exchange; do not count every pool hop as an independent profitable trade.
9. Sort deterministically by chain order, build inventory lots, match disposals, and compute known-basis results.
10. Generate claims from the ledger and render narrative only from those claims.

Successful balance changes are not universally swaps. Failed transactions may incur fees without fills. Rent deposits/refunds are not trading profit. Wrapped SOL needs accounting that avoids counting wrapping as a purchase. Transfers between proven owned accounts are internal movements; ownership that is merely suspected remains uncertain.

### Normalized event

```ts
type AssetId = string; // canonical chain + address, never ticker alone
type Amount = { assetId: AssetId; raw: string; decimals: number };
type LedgerEvent = {
  id: string;
  signature: string;
  slot: string;
  eventIndex: number;
  occurredAt: string | null;
  kind: 'swap' | 'transfer' | 'fee' | 'wrap' | 'lp' | 'unknown';
  debits: Amount[];
  credits: Amount[];
  evidenceIds: string[];
  decoderVersion: string;
  basisStatus: 'known' | 'partial' | 'unknown';
};
```

Use explicit source/finality fields in the persisted record even if omitted from this abbreviated interface.

### Accounting rules

- Use FIFO as the disclosed analytical lot convention for MVP; this is not a tax report.
- Known acquisition cost includes attributable fees without double-counting fees already represented in net swap flow.
- A sale's realized result equals known proceeds minus matched basis and applicable disposal costs, in a clearly identified common denomination.
- Track quantity with unknown basis separately. Received assets have unknown cost unless a verified acquisition history establishes it; never default to zero.
- Preserve fee asset and amount. If historical conversion is missing, show the native fee and mark the converted net result incomplete.
- Stablecoin denomination is not automatically exact USD. Label USDC/USDT values accordingly unless a separate conversion source exists.
- Unrealized value uses a timestamped current valuation source and is separate from realized results and actual exit proceeds.
- Present trade-level return only where its cost denominator is defined and nonzero. Do not call aggregate proceeds divided by starting balance “wallet ROI.”
- Avoid lifetime win rate and total-wallet drawdown unless the required history and valuation coverage exist.
- If some disposals have unknown basis, show known-basis subtotal and excluded quantity/count prominently; do not imply the subtotal is complete profit.

### Required counterexamples

Build fixtures for a profitable partial exit, losing exit, transferred-in inventory, fee in a third asset, failed swap, multi-hop route, wrapped SOL, truncated acquisition history, duplicate pages, closed token-account gap, unsupported LP transaction and missing price/time data.

## 7. Trading profile and adaptation

### Observable profile

Display a behavior card with sample sizes and observation period:

- Entry pattern: single purchase or multiple purchases within an explicitly defined episode.
- Exit pattern: full close versus partial disposals.
- Holding durations for matched lots, including open positions separately.
- Typical observed order size in a supported denomination.
- Concentration within the observed assets, not an inferred total net worth.
- Known-basis winning and losing episodes, with unknown episodes excluded visibly.
- Unsupported/uncertain activity that could change the interpretation.

Start with explainable rules, not a mysterious score. For example, “three of four decoded position episodes exited in stages” is defensible; “professional sniper, 94% confidence” is not. Episode grouping parameters must be versioned and visible in methodology. With fewer than five qualified episodes, label output “limited sample” and avoid stable-style claims. That threshold is a product convention, not statistical proof.

### Then versus now

| Then | Now |
|---|---|
| Observed execution price and timestamp | Current timestamped market snapshot |
| Actual acquisition amount | User-entered maximum spend |
| Observed exit sequence | Optional proposed order, not predicted exit |
| Verified historical costs | Current known/estimated fees |
| Historical liquidity only if sourced | Current order-book depth where available |
| Known outcomes | Scenarios explicitly labeled estimates |

Do not describe a current venue's order book as historical on-chain liquidity. Cross-venue comparisons must name both venues. Without historical executable depth, do not claim to know exactly what a late copy would have earned.

### Adaptation engine

Inputs: reviewed asset mapping, user budget, free balance, existing exposure within the connected account, symbol constraints, fee information, current market snapshot and declared user limits.

Outputs: `eligible`, `unsupported`, `insufficient-data`, or `blocked`, plus reasons and an optional order proposal.

The engine determines feasible size from the lesser of user maximum spend, available funds after known reserves, and user-defined exposure limits. It rounds using decimal arithmetic and current symbol rules. It must never increase size merely to satisfy an exchange minimum without a new user decision. It can suggest watching instead of trading.

Order-book estimates should sweep the correct side of the book for the proposed size. Show insufficient depth when depth is insufficient. Keep estimates and provider execution guarantees distinct. A limit price can bound execution price for a supported limit order; it does not guarantee execution or bound future investment losses.

## 8. Trading execution

### MVP bot capability

Read markets and account, preview a Spot order, submit a confirmed supported order, monitor and reconcile its status. Exclude leverage and transfers from the application allowlist even if the provider grants broader scopes. No recurring trading mandates in MVP.

Prefer a supported limit/IOC path when qualified; otherwise implement only the supported order type with its actual semantics and clear disclosure. Do not emulate unsupported exchange order types with vague agent promises.

### Internal adapter contract

These names belong to AFTERIMAGE; they are not Binance MCP tool names:

```ts
interface ExchangeAdapter {
  capabilities(): Promise<CapabilityManifest>;
  market(symbol: string): Promise<MarketSnapshot>;
  balances(accountId: string): Promise<AccountBalances>;
  preview(input: OrderProposal): Promise<OrderPreview>;
  submit(intent: ApprovedIntent): Promise<SubmissionResult>;
  reconcile(ref: OrderReference): Promise<OrderState>;
}
```

Implement schema validation between this interface and discovered tool contracts. Extend cancellation only after qualification and its own confirmed-action flow.

### Approval record

Persist an immutable intent containing owner, connection/account, symbol and canonical asset mapping, side, order type, base quantity or quote amount, limit/time-in-force where applicable, maximum spend, fee assumptions, preview timestamp, expiry, schema version and payload hash. Confirmation binds to that exact intent. Any changed quantity, account or terms requires a fresh preview and confirmation.

Default draft expiry: 60 seconds; market snapshot freshness target: 10 seconds. These are initial product parameters, not provider guarantees. Refresh immediately before submission and reject stale or materially changed terms. Preserve the provider's own confirmation step; application approval must not bypass it.

### State machine

```text
DRAFT → PREVIEWED → AWAITING_APPROVAL → APPROVED → SUBMITTING
  → ACKNOWLEDGED → PARTIALLY_FILLED → FILLED
  → REJECTED / EXPIRED / CANCELED
  → UNKNOWN → RECONCILING → resolved provider state
```

Use an atomic database transition to claim submission and a unique intent key. Supply a stable provider client-order ID when supported. A timeout after submission means unknown outcome, not failed order. Reconcile before any retry. If the provider cannot identify an uncertain order safely, block resubmission and surface manual account reconciliation.

Partial fills remain real exposure even if the remainder is canceled. Cancellation requests can race with fills. Acknowledgment is not proof of fill. Receipt totals come from fills and commissions, not the initial preview or a balance delta alone. Record commissions in their original assets.

On disconnect, stop new application submissions and invalidate pending approvals. Do not claim that local disconnect cancels exchange orders. Explain how the owner can manage outstanding orders in Binance. App cancellation, when built, is a distinct confirmed operation.

## 9. Data and API contracts

### Database

| Table | Purpose and constraints |
|---|---|
| users, sessions | Server identity; secure expiring sessions |
| exchange_connections | User-owned account association, encrypted token reference, scopes, revocation state |
| investigations | Owner, input, requested interval, status, coverage and decoder versions |
| evidence | Source, retrieval time, hash, classification and protected payload reference |
| ledger_events | Unique chain/signature/event/decoder version; normalized amounts |
| inventory_lots | Acquisition evidence, remaining units and basis status |
| claims | Deterministic metric/value, evidence IDs, limitations and calculation version |
| asset_mappings | Chain identity, exchange symbol, review source and status |
| market_snapshots | Venue, symbol, time, depth and freshness metadata |
| order_intents | Immutable payload/hash, owner/account, expiry, unique submission key |
| order_events, fills | Provider IDs, timestamps, actual state and fee assets; deduplicated |
| jobs | Kind, owner, payload, attempt, lease, heartbeat and next attempt |
| audit_events | Actor, action, record ID, outcome; secrets redacted |

Every private query includes the server-derived owner. Never trust user IDs from request bodies. Use foreign keys that prevent connecting one user's investigation or intent to another user's account. Apply least-privilege DB roles; if exposed through Supabase APIs, use RLS and deny public private-table access. Server-side ownership checks remain necessary.

### API surface

| Endpoint | Behavior |
|---|---|
| `POST /api/investigations` | Validate input/window; create idempotent ingestion job |
| `GET /api/investigations/:id` | Return owned case, coverage, metrics and claims |
| `GET /api/investigations/:id/events` | SSE progress with authenticated ownership, or polling fallback |
| `GET /api/evidence/:id` | Safe, redacted owned evidence; never credentials |
| `GET /api/account` | Current connection state and permitted balances |
| `POST /api/orders/preview` | Validate exact mapping and budget; store immutable preview |
| `POST /api/orders/:id/approve` | Confirm current owned preview; short-lived approval |
| `POST /api/orders/:id/submit` | Atomically claim approved intent; invoke qualified path |
| `GET /api/orders/:id` | Reconciled state and receipt |
| `POST /api/connections/:id/disconnect` | Revoke locally and invoke supported provider revocation when available |

All mutations require authenticated session, origin/CSRF protection appropriate to the chosen session scheme, input limits and rate limits. Public case sharing is opt-in and uses a separate redacted projection, never raw private rows.

### Jobs and resilience

Research jobs checkpoint cursors and resume after worker failure. Deduplicate page and transaction imports. Cap initial research to a configurable window and transaction budget, displaying when the cap truncates coverage. Retry transient reads with bounded backoff and respect rate-limit responses. Writes use reconciliation, not generic HTTP retries.

Cache public historical records by source and identity. Cache private balances only per connection/user and invalidate on account change or trade. A provider outage must produce stale/unavailable status, never replacement synthetic market data in live mode.

## 10. Agent behavior

Use one orchestrator with specialist functions rather than a free-form swarm. Logical stages:

1. Investigator: selects the bounded evidence collection job.
2. Accountant: deterministic normalization and arithmetic.
3. Interpreter: describes supported patterns and counterexamples.
4. Adapter: deterministic feasibility and order preparation.
5. Executor: restricted service behind approval.

Only the executor can reach write capabilities. Token metadata, RPC memos, external posts, tool descriptions and model output are untrusted content. They cannot grant permissions, change recipients, change venue allowlists or redefine risk limits.

Narrator input is a structured list of claims with evidence IDs. Output uses a schema: summary, observed patterns, limitations, changed conditions, next options. Validate cited IDs and numerical statements against the deterministic claim set. On validation failure retry once, then render a deterministic summary. The product must remain usable when the model is unavailable.

Do not send raw exchange credentials, entire account histories or unrelated user data to the model. Preserve source attribution and label hypotheses. No invented profitability score, certainty percentage or assertion that a strategy will work again.

## 11. Brand and user experience

### Direction

AFTERIMAGE is an investigation desk for trading decisions: dark ink, bright evidence trails, generous typography and a timeline that reveals what the screenshot leaves out. Keep it separate from Daybreak's fluffy social identity.

Suggested tokens: background `#090D15`, surface `#121A27`, primary text `#F3F6FC`, muted text `#A3AEC0`, electric blue `#5286FF`, amber `#FFC46B`. Verify actual contrast. Use a clean sans family with tabular numerals; mono only for addresses, timestamps and receipts. Working brand assets can be typographic; no image generation dependency is needed for the MVP.

### Screens

**Investigate:** one wallet/signature input, observation-window control, concise explanation and two clearly labeled example cases. No giant blank chatbot as the entire product.

**Case workspace:** headline finding; coverage banner; animated chronological timeline; acquisition/exit markers; realized versus remaining inventory; evidence drawer. Every headline number opens its supporting events.

**Then / Now:** paired panels with synchronized asset identity and explicit venue labels. Lead with changed conditions, not a buy button. Show unknown data inline.

**Profile:** compact behavior cards, episode counts and losing/unknown examples alongside winning ones. Avoid ranking wallets on cherry-picked profit.

**Order ticket:** account, venue, exact asset, side, amount, order semantics, estimated costs, expiry and confirmation. Show paper/live mode persistently. Follow with actual partial/full fill status and an evidence receipt.

**Connection settings:** connection status, granted capabilities, reconnect/disconnect and outstanding-order guidance.

### Motion and accessibility

Animate timeline entry and evidence linking with short transitions; use motion to explain sequence. Honor reduced motion. All actions support keyboard navigation and visible focus. Do not use red/green alone for outcomes. On mobile, stack Then/Now and keep the order summary visible before confirmation. Provide meaningful empty, partial, stale, unsupported and error states.

## 12. Implementation tasks

Create `TASKS.md` from this table and `STATE.md` before application code. A task is complete only when its evidence is recorded. Time estimates are planning budgets, not guarantees.

| ID | Task | Dependency | Required output / acceptance |
|---|---|---|---|
| T0 | Inspect workspace and qualify Agent OS | None | G0 manifest; chosen auth/deployment mode; no guessed tools |
| T1 | Scaffold app, DB, worker and checks | T0 decision | App starts; migration works on empty DB; fixture mode explicit |
| T2 | Select real example and qualify decoder/provider | None | Public source case, verified program path, coverage notes; no invented profitable wallet |
| T3 | Ingest and normalize transactions | T1, T2 | Resumable bounded ingestion; dedup; unknown events preserved |
| T4 | Implement ledger and metrics | T3 | Known/unknown basis tests; fees and partial exits correct |
| T5 | Build claims and profile | T4 | Every claim traceable; sample and coverage labels |
| T6 | Integrate live markets and asset mapping | T0, T1 | Real MCP market read; exact mapping or explicit unsupported state |
| T7 | Build case UI and comparison | T5, T6 | Complete research journey on real/redacted example |
| T8 | Implement intent policy and paper executor | T1, T6 | Immutable approvals; duplicate/timeout tests; honest paper receipts |
| T9 | Implement qualified live execution path | T0, T8 | Schema-bound adapter; no automatic trade on connect; live gate separate |
| T10 | Account access and recovery tests | T9 | Expiry, user isolation, partial fills, reconciliation verified |
| T11 | Browser polish and reproducible deployment | T7, T10 | Mobile/desktop smoke; fresh setup; no exposed credentials |
| T12 | Record approved live proof if available | T9, owner action | Timestamped read/confirmation/order/fill evidence or explicit pending status |
| T13 | Package demo, README and submission | T11 | Reproducible repo, video, limitations, owner submission checklist |

### Deadline budget

Official deadline: **8 September 2026, 23:59 UTC**, equivalent to **9 September, 00:59 Africa/Lagos**. Recheck current time and official rules at the start of the build. Do not assume a fresh seven-day sprint remains.

Suggested allocation of the remaining build time: 10% qualification, 30% ingestion/accounting, 20% UI and comparison, 20% execution/recovery, 20% final verification/video/submission. Workstreams may be performed independently where dependencies allow; the build agent should not wait idle for credentials.

If less than 24 hours remain: one transaction-led case, one decoder, one market mapping, paper order state machine plus qualified host execution. If less than 12 hours remain: preserve research evidence and real MCP read, cut profile breadth, sharing and secondary screens. Freeze features at least three hours before the deadline. Never cut accounting correctness, approval binding or truthful mode labels to preserve a decorative feature.

### Agent operating loop

Read plan, `STATE.md`, task list and git status. Pick the next unblocked task; implement and run its checks; record results and remaining unknowns; commit a coherent change if working in an initialized repo. Preserve existing user changes. Before ending a session, record exact next task, commands, files, blockers and evidence paths so the next agent resumes without rediscovery.

## 13. Verification

### Meaningful test matrix

| Area | Tests that must pass |
|---|---|
| Ledger | Partial disposal, losses, unknown basis, third-asset fees, decimals, duplicates, deterministic replay |
| Decoder | Real source fixture matches observed flows; multi-hop collapse; failed tx; unsupported instruction remains unknown |
| Coverage | Truncated pagination, missing transaction, closed token-account gap cannot produce complete-history label |
| Identity | Same ticker/different mint rejected; unreviewed mapping cannot trade |
| Profile | Insufficient samples labeled; unknown basis excluded visibly; no lifetime claims from bounded data |
| Policy | Amount rounding, minimum notional, free versus locked balance, stale market, changed account, insufficient depth |
| Approval | Expired/modified/replayed intent denied; account switch invalidates approval |
| Concurrency | Two simultaneous submits produce one provider submission using real DB transaction behavior |
| Recovery | Timeout after accepted order reconciles; no blind resend; partial-fill cancellation race represented |
| Privacy | User B cannot read/approve/submit user A's records; session logout and account switch clear UI/cache |
| Model | Invented evidence ID/number rejected; malicious metadata cannot invoke writes; outage deterministic fallback |
| Browser | Input → case → evidence → comparison → paper preview → receipt; stale/unsupported cases visible |

Use synthetic fixtures for edge cases and redacted real fixtures to validate integration assumptions. Preserve source signatures and hashes where public; redact private account identifiers and credentials. Validate one real case independently against explorer/provider evidence before recording the demo.

### Commands the implementation must provide

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm qualify:binance
pnpm demo:replay
```

These are target scripts for the builder to create, not commands claimed to work today. `qualify:binance` must default to read-only. No automated test should place real trades. Live write proof requires separate explicit approval of the concrete order.

## 14. Deployment and operations

Provide `.env.example` with names and explanations only: database URL, app origin/session settings, encryption key reference, selected RPC provider, model configuration, execution mode, and documented OAuth settings if applicable. Do not invent a `BINANCE_API_KEY` requirement for MCP or store credentials in public-prefixed variables.

Default execution mode is paper. A live configuration alone does not confer approval. Use a real background worker process for jobs; do not rely on work continuing after a serverless response. For a deadline demo, a local app plus Docker Postgres is acceptable and easier to reproduce than rushed multi-user hosting. Hosted access needs proper authentication before private account connection is exposed.

Add structured logs keyed by investigation/job/intent IDs, not full payloads. Monitor ingestion errors, missing data, decoder coverage, provider latency, reconciliation backlog and rejected approval attempts. Choose conservative request budgets and make them configurable. Document costs rather than promising free production operation.

Export only user-approved redacted cases. Delete private investigations and credential references on request according to a documented retention policy; retain only necessary redacted operational audit data with the policy stated. Database backups and restore instructions belong in the README for hosted deployment.

## 15. Demo and submission

### Storyboard: approximately 60–90 seconds

1. Show the hook: “This trade looked incredible. What actually happened?”
2. Paste a verified transaction/wallet example; show its observation window.
3. Reveal the entry and staged exit timeline, with costs and one important uncertainty or counterexample.
4. Open the evidence behind a number.
5. Reveal Then/Now: changed price/conditions and current Binance market data.
6. Show feasible order preview for an exactly supported asset, or clearly explain unsupported mapping.
7. Show approval and an actual reconciled receipt if separately authorized; otherwise show labeled paper execution and identify live execution as pending.
8. End on the product proposition: understand the trade before deciding whether to act.

Keep a replay recording of the real research inputs for reliability, labeled with its capture date. Never show replay as fresh live data. If demonstrating a different asset for execution, explicitly say so.

### README requirements

Lead with the user problem and a product screenshot. Include quick start, modes, architecture, supported chain/decoder, exact Agent OS integration, permissions, money math assumptions, evidence coverage, tests, demo link and current limitations. Separate implemented functionality from roadmap. Include dependency licenses and no secrets or private account exports.

### Entry checklist

The official event identifies Track A as the builder track. Its listed first prize is $2,000; Track B distributes $4 to qualifying participants rather than offering a $40,000 individual prize. No detailed scoring rubric was found in the inspected announcement. Do not optimize for an invented trading-volume or profit criterion. [Event source](https://www.binance.com/en/blog/community/8802181509900814931).

- Recheck current event rules and account/jurisdiction eligibility.
- Prepare public demo video and GitHub link where applicable.
- Draft the reply/quote submission and survey answers.
- Owner follows/reposts and publishes the entry, then completes the official survey.
- Record final URLs and submission timestamp in `docs/SUBMISSION.md`.

The building agent prepares concrete artifacts; it does not publish social posts without authorization.

## 16. Future LP and other capabilities

### LP reconstruction: the second product module

Preserve the original LP inspiration. Add it after the trading reconstruction proves useful. Start with one named chain, protocol and pool type; qualify official pool math and historical position data before implementation.

Required evidence: liquidity additions/removals, position ownership, ranges where applicable, fees collected and still owed, rewards, gas, both inventory assets, external transfers and timestamped valuations. Closed positions still matter.

Report separately:

- Fees earned and rewards, in their actual assets.
- Inventory value and deposits/withdrawals with matching timing.
- Net result including costs under a disclosed valuation convention.
- A same-cashflow hold comparison, when data supports it.
- Time in range and rebalances only when observable.

Fees are not net profit. Do not infer safe APR from a short hot-market period. Wallet balance changes alone cannot reconstruct concentrated-liquidity economics. No LP execution in the first release.

### Other expansions

- Broader chain adapters selected from real demand and qualified data coverage.
- Watchlists of observed behavior changes, with alerts rather than automatic copying.
- Historical scenario replay with clear assumptions and separate forward validation.
- User-owned trading journals connecting reasoning, approved intent and actual outcome.
- Optional paid research or x402 only when there is a validated product use case; it is unnecessary for this MVP.
- Shared research circles later, without merging Daybreak's databases or brand by default.

## 17. Handoff prompt

Copy this into the implementing agent's task:

> Build AFTERIMAGE end to end using `BUILD-PLAN.md` as the product contract. It is a trading reconstruction agent with basic approved Spot execution, not a generic chatbot or blind copy trader. First inspect the workspace and create TASKS.md and STATE.md. Qualify the real Binance Agent OS MCP endpoint, tools, permissions and authentication/deployment mode; record exact schemas and never guess tool names. In parallel with any owner authentication dependency, build one bounded Solana evidence case, deterministic ledger, Then/Now UI, paper executor and tests. Keep all numerical accounting outside the LLM. Unknown basis and incomplete history must remain visible. Use exact asset identities; unsupported memes must not be silently replaced with a listed asset. Bind execution to immutable, user-confirmed intents and reconcile uncertain outcomes before retrying. Preserve provider confirmations. Do not use Daybreak credentials, place real trades or publish submissions without separate authorization. Complete independent work while recording external blockers. Deliver a working app, migrations, verified commands, redacted real evidence, README, demo and precise status distinguishing paper, live reads, account connection and verified live execution. Before ending, update STATE.md with the next task and unresolved gates.

### Final acceptance

The user can inspect a real observed trade, understand what the evidence establishes, compare its conditions with a supported current market, and move to an explicitly approved order whose actual outcome is verified. If evidence or execution capability is absent, the product clearly explains that boundary. That complete loop is the release target.
