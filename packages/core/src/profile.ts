import type { InvestigationCase } from "./types";
import type { Reconstruction } from "./ledger";

export function buildProfile(investigation: InvestigationCase, result: Reconstruction) {
  const swaps = investigation.events.filter((event) => event.kind === "swap" && event.status === "confirmed");
  const exits = swaps.filter((event) => event.debits.some((amount) => amount.symbol === investigation.asset.symbol));
  return {
    sampleLabel: swaps.length < 5 ? "Limited sample" : "Observed pattern",
    decodedEpisodes: swaps.length,
    stagedExit: exits.length > 1,
    exitSummary: exits.length > 1 ? `${exits.length} decoded exits were staged` : `${exits.length} decoded exit`,
    basisSummary:
      result.remainingUnknownBasis !== "0"
        ? `${result.remainingUnknownBasis} ${investigation.asset.symbol} remains with unknown basis`
        : "Remaining inventory has observed basis",
  };
}
