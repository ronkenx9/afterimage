import type { InvestigationCase } from "./types";
import type { Reconstruction } from "./ledger";

export function buildClaims(investigation: InvestigationCase, result: Reconstruction) {
  const allEvidence = [...new Set(investigation.events.flatMap((event) => event.evidenceIds))];
  return [
    {
      id: "claim-known-result",
      label: "Known-basis realized result",
      value: `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(result.realizedKnownBasis))} USDC-denominated`,
      evidenceIds: allEvidence,
      limitation: "FIFO analytical convention. Excludes units whose acquisition basis is outside the observed window.",
    },
    {
      id: "claim-inventory",
      label: "Remaining observed inventory",
      value: `${result.remaining} ${investigation.asset.symbol}`,
      evidenceIds: allEvidence,
      limitation: `${result.remainingUnknownBasis} units have unknown acquisition basis.`,
    },
  ];
}
