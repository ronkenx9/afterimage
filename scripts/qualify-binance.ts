// AFTERIMAGE Binance qualification / binding verifier.
//
// This does NOT place orders or touch funds. It reads the recorded
// docs/binance-tools.json manifest (populated from an authenticated tools/list)
// and checks it against the capability catalog:
//   - every non-owner-only capability is bound
//   - every bound tool name actually appears in the recorded tools/list
//   - irreversible/owner-only capabilities stay unbound
// It prints a report and a ready-to-paste bindings skeleton for any gaps, then
// exits non-zero if a required capability is unbound or a binding is dangling.

import { readFile } from "node:fs/promises";
import { CAPABILITIES } from "@/packages/core/src/capabilities";

const MANIFEST = new URL("../docs/binance-tools.json", import.meta.url);

type Manifest = {
  qualifiedAt: string | null;
  endpoint: string;
  authentication: string;
  tools?: Array<{ name: string; summary?: string }>;
  bindings?: Record<string, string>;
  unbound?: Record<string, string>;
};

function heuristicToolFor(capabilityId: string, toolNames: string[]): string | null {
  // Cheap name-similarity guess to seed a binding for an unmatched capability.
  const tail = capabilityId.split(".").pop() ?? capabilityId;
  const wanted = [capabilityId.replace(".", ""), capabilityId.replace(".", "_"), tail].map((s) => s.toLowerCase());
  let best: { name: string; score: number } | null = null;
  for (const name of toolNames) {
    const lower = name.toLowerCase();
    let score = 0;
    for (const w of wanted) if (lower.includes(w)) score += w.length;
    if (score > 0 && (!best || score > best.score)) best = { name, score };
  }
  return best?.name ?? null;
}

async function main() {
  const manifest: Manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const bindings = manifest.bindings ?? {};
  const toolNames = (manifest.tools ?? []).map((t) => t.name);

  console.log("AFTERIMAGE Binance qualification");
  console.log(`Endpoint:       ${manifest.endpoint}`);
  console.log(`Qualified at:   ${manifest.qualifiedAt ?? "(not connected)"}`);
  console.log(`Authentication: ${manifest.authentication}`);
  console.log(`Tools recorded: ${toolNames.length}`);
  console.log("");

  const required = CAPABILITIES.filter((c) => !c.irreversible);
  const ownerOnly = CAPABILITIES.filter((c) => c.irreversible);

  const missing: string[] = [];
  const dangling: Array<{ id: string; tool: string }> = [];

  for (const c of required) {
    const tool = bindings[c.id];
    if (!tool) {
      missing.push(c.id);
      console.log(`  ✗ ${c.id.padEnd(26)} UNBOUND`);
    } else if (!toolNames.includes(tool)) {
      dangling.push({ id: c.id, tool });
      console.log(`  ! ${c.id.padEnd(26)} → ${tool}  (not in recorded tools/list)`);
    } else {
      console.log(`  ✓ ${c.id.padEnd(26)} → ${tool}`);
    }
  }

  for (const c of ownerOnly) {
    const flagged = bindings[c.id] ? "BOUND (should be owner-only!)" : "unbound (owner-only, correct)";
    console.log(`  · ${c.id.padEnd(26)} ${flagged}`);
    if (bindings[c.id]) dangling.push({ id: c.id, tool: bindings[c.id] });
  }

  if (missing.length > 0) {
    console.log("\nSkeleton for unbound capabilities (edit the tool names, then paste into bindings):");
    const skeleton: Record<string, string> = {};
    for (const id of missing) skeleton[id] = heuristicToolFor(id, toolNames) ?? "<TOOL_NAME>";
    console.log(JSON.stringify(skeleton, null, 2));
  }

  const ok = missing.length === 0 && dangling.length === 0;
  console.log(`\nResult: ${ok ? "QUALIFIED — all required capabilities bound to recorded tools." : "INCOMPLETE — see above."}`);
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
