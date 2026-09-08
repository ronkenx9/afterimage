// The baseline on-chain / trading-agent capability surface.
//
// This is the "everything an on-chain agent can do" primitive catalog, mapped
// onto Binance Agent OS Spot rails. It is deliberately venue-neutral in shape so
// the same surface can later gain EVM/Solana adapters, but the only implemented
// venue today is `binance-spot`.
//
// The catalog carries NO live Agent OS tool names. Exact tool names are resolved
// at runtime from an authenticated `tools/list` and recorded in the binding map
// (see packages/integrations/src/agentos.ts). Until then a capability is
// `unbound` and every write fails closed.

export type CapabilityAccess = "read" | "write";
export type CapabilityApproval = "none" | "owner";
export type CapabilityVenue = "binance-spot";

export type CapabilityId =
  | "market.symbols"
  | "market.quote"
  | "market.depth"
  | "account.balances"
  | "account.portfolio"
  | "trade.order"
  | "trade.cancel"
  | "order.status"
  | "order.open"
  | "order.history"
  | "convert.quote"
  | "convert.execute"
  | "transfer.depositAddress"
  | "transfer.withdraw";

export type Capability = {
  id: CapabilityId;
  title: string;
  group: "market" | "account" | "trade" | "convert" | "transfer";
  access: CapabilityAccess;
  /** Writes always require an explicit, per-action owner approval token. */
  approval: CapabilityApproval;
  /** True when the action moves value irreversibly off the account. */
  irreversible: boolean;
  venue: CapabilityVenue;
  summary: string;
};

const cap = (c: Capability): Capability => c;

export const CAPABILITIES: readonly Capability[] = [
  cap({
    id: "market.symbols",
    title: "List tradable symbols",
    group: "market",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Exchange info: tradable pairs with lot-size, tick-size, and min-notional filters.",
  }),
  cap({
    id: "market.quote",
    title: "Quote a symbol",
    group: "market",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Last price, 24h change, and best bid/ask for a Spot symbol.",
  }),
  cap({
    id: "market.depth",
    title: "Read order-book depth",
    group: "market",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Top-of-book depth used to estimate slippage before an order is planned.",
  }),
  cap({
    id: "account.balances",
    title: "Read balances",
    group: "account",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Free and locked balances per asset. Requires an authenticated account.",
  }),
  cap({
    id: "account.portfolio",
    title: "Read portfolio value",
    group: "account",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Balances valued in a quote asset using live marks. Requires authentication.",
  }),
  cap({
    id: "trade.order",
    title: "Place a Spot order",
    group: "trade",
    access: "write",
    approval: "owner",
    irreversible: false,
    venue: "binance-spot",
    summary: "BUY/SELL, MARKET/LIMIT. Planned, filter-validated, and owner-approved before submission.",
  }),
  cap({
    id: "trade.cancel",
    title: "Cancel an order",
    group: "trade",
    access: "write",
    approval: "owner",
    irreversible: false,
    venue: "binance-spot",
    summary: "Cancel a resting open order by id.",
  }),
  cap({
    id: "order.status",
    title: "Read one order",
    group: "trade",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Status and fills for a single order id.",
  }),
  cap({
    id: "order.open",
    title: "List open orders",
    group: "trade",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "All currently resting orders on the account.",
  }),
  cap({
    id: "order.history",
    title: "Read order history",
    group: "trade",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Historical orders and trades for reconciliation.",
  }),
  cap({
    id: "convert.quote",
    title: "Quote a convert",
    group: "convert",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "The Spot analogue of a DEX swap quote: from-asset to to-asset at a firm rate.",
  }),
  cap({
    id: "convert.execute",
    title: "Execute a convert",
    group: "convert",
    access: "write",
    approval: "owner",
    irreversible: false,
    venue: "binance-spot",
    summary: "Accept a firm convert quote. Owner-approved before submission.",
  }),
  cap({
    id: "transfer.depositAddress",
    title: "Get a deposit address",
    group: "transfer",
    access: "read",
    approval: "none",
    irreversible: false,
    venue: "binance-spot",
    summary: "Read-only receive address for an asset/network.",
  }),
  cap({
    id: "transfer.withdraw",
    title: "Withdraw off-account",
    group: "transfer",
    access: "write",
    approval: "owner",
    irreversible: true,
    venue: "binance-spot",
    summary: "Move value off the account. Irreversible; owner-executed only.",
  }),
];

const BY_ID = new Map<CapabilityId, Capability>(CAPABILITIES.map((c) => [c.id, c]));

export function getCapability(id: CapabilityId): Capability {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown capability: ${id}`);
  return found;
}

export function isWrite(id: CapabilityId): boolean {
  return getCapability(id).access === "write";
}

export function requiresApproval(id: CapabilityId): boolean {
  return getCapability(id).approval === "owner";
}

export const READ_CAPABILITIES = CAPABILITIES.filter((c) => c.access === "read");
export const WRITE_CAPABILITIES = CAPABILITIES.filter((c) => c.access === "write");
