import { replayCase, SOL, USDC } from "../tests/fixtures/case";
import { reconstructLedger } from "../packages/core/src/ledger";
import { buildClaims } from "../packages/core/src/evidence";

const reconstruction = reconstructLedger(replayCase.events, SOL, USDC);
console.log(JSON.stringify({
  case: replayCase.id,
  mode: "replay",
  coverage: replayCase.coverage,
  reconstruction,
  claims: buildClaims(replayCase, reconstruction),
}, null, 2));
