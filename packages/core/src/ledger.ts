import Decimal from "decimal.js";
import type { Amount, AssetId, LedgerEvent } from "./types";

type Lot = { quantity: Decimal; unitCost: Decimal | null; evidenceIds: string[] };

export type Reconstruction = {
  acquired: string;
  disposed: string;
  remaining: string;
  remainingUnknownBasis: string;
  realizedKnownBasis: string;
  excludedDisposalQuantity: string;
  fees: { symbol: string; amount: string }[];
  matchedEpisodes: number;
};

function units(amount: Amount) {
  return new Decimal(amount.raw).div(new Decimal(10).pow(amount.decimals));
}

export function reconstructLedger(events: LedgerEvent[], baseAsset: AssetId, quoteAsset: AssetId): Reconstruction {
  const ordered = [...events].sort((a, b) => {
    const slot = new Decimal(a.slot).cmp(b.slot);
    return slot || a.eventIndex - b.eventIndex || a.id.localeCompare(b.id);
  });
  const lots: Lot[] = [];
  let acquired = new Decimal(0);
  let disposed = new Decimal(0);
  let realized = new Decimal(0);
  let excluded = new Decimal(0);
  let matchedEpisodes = 0;
  const fees = new Map<string, Decimal>();

  for (const event of ordered) {
    if (event.status === "failed") continue;
    if (event.kind === "fee") {
      for (const debit of event.debits) {
        fees.set(debit.symbol, (fees.get(debit.symbol) ?? new Decimal(0)).add(units(debit)));
      }
      continue;
    }
    const baseCredit = event.credits.find((a) => a.assetId === baseAsset);
    const quoteDebit = event.debits.find((a) => a.assetId === quoteAsset);
    const baseDebit = event.debits.find((a) => a.assetId === baseAsset);
    const quoteCredit = event.credits.find((a) => a.assetId === quoteAsset);

    if (baseCredit) {
      const quantity = units(baseCredit);
      acquired = acquired.add(quantity);
      const cost = quoteDebit ? units(quoteDebit) : null;
      lots.push({
        quantity,
        unitCost: cost ? cost.div(quantity) : null,
        evidenceIds: event.evidenceIds,
      });
    }

    if (baseDebit && quoteCredit) {
      let toMatch = units(baseDebit);
      const totalDisposed = toMatch;
      const proceedsPerUnit = units(quoteCredit).div(totalDisposed);
      disposed = disposed.add(totalDisposed);
      let episodeMatched = false;

      for (const lot of lots) {
        if (toMatch.lte(0)) break;
        if (lot.quantity.lte(0)) continue;
        const matched = Decimal.min(toMatch, lot.quantity);
        if (lot.unitCost === null) excluded = excluded.add(matched);
        else {
          realized = realized.add(proceedsPerUnit.minus(lot.unitCost).mul(matched));
          episodeMatched = true;
        }
        lot.quantity = lot.quantity.minus(matched);
        toMatch = toMatch.minus(matched);
      }
      if (toMatch.gt(0)) excluded = excluded.add(toMatch);
      if (episodeMatched) matchedEpisodes += 1;
    }
  }

  const remaining = lots.reduce((sum, lot) => sum.add(lot.quantity), new Decimal(0));
  const remainingUnknown = lots
    .filter((lot) => lot.unitCost === null)
    .reduce((sum, lot) => sum.add(lot.quantity), new Decimal(0));

  return {
    acquired: acquired.toFixed(),
    disposed: disposed.toFixed(),
    remaining: remaining.toFixed(),
    remainingUnknownBasis: remainingUnknown.toFixed(),
    realizedKnownBasis: realized.toFixed(2),
    excludedDisposalQuantity: excluded.toFixed(),
    fees: [...fees].map(([symbol, amount]) => ({ symbol, amount: amount.toFixed() })),
    matchedEpisodes,
  };
}
