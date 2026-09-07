import { notFound } from "next/navigation";
import { replayCase, SOL, USDC } from "@/tests/fixtures/case";
import { reconstructLedger } from "@/packages/core/src/ledger";
import { buildClaims } from "@/packages/core/src/evidence";
import { buildProfile } from "@/packages/core/src/profile";
import { CaseWorkbench } from "@/components/case-workbench";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  if ((await params).id !== replayCase.id) notFound();
  const reconstruction = reconstructLedger(replayCase.events, SOL, USDC);
  return <CaseWorkbench investigation={replayCase} reconstruction={reconstruction} claims={buildClaims(replayCase, reconstruction)} profile={buildProfile(replayCase, reconstruction)} />;
}
