// Headless-browser demo recorder. Drives the live dashboard and a real on-chain
// reconstruction, recording the session to a video. Reliable and reproducible.
//
//   BASE_URL=http://localhost:3014 WALLET=<addr> node scripts/record-demo.mjs

import { chromium } from "@playwright/test";
import { readdirSync } from "node:fs";

const BASE = (process.env.BASE_URL || "http://localhost:3014").replace(/\/$/, "");
const WALLET = process.env.WALLET || "";
const OUT = process.env.OUT_DIR || "/tmp/afterimage-demo";
const W = 1280;
const H = 800;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function smoothScroll(page, ys, dwell = 1500) {
  for (const y of ys) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: "smooth" }), y);
    await wait(dwell);
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: OUT, size: { width: W, height: H } },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Scene 1 — the live agent dashboard scanning the market.
  await page.goto(`${BASE}/agent`, { waitUntil: "networkidle", timeout: 60_000 });
  await wait(2800);
  await smoothScroll(page, [0, 260, 620, 1020, 1500, 2000, 2500, 3000], 1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(1200);

  // Scene 2 — a real trade on chain: live bounded reconstruction.
  if (WALLET) {
    await page.goto(`${BASE}/api/reconstruct?address=${WALLET}&limit=12`, { waitUntil: "networkidle", timeout: 60_000 });
    await wait(3600);
  }

  // Scene 3 — the enforced guardrails.
  await page.goto(`${BASE}/api/guardrails`, { waitUntil: "networkidle", timeout: 60_000 });
  await wait(2600);

  await context.close(); // finalizes the video file
  await browser.close();

  const vids = readdirSync(OUT).filter((f) => f.endsWith(".webm"));
  console.log(`VIDEO:${OUT}/${vids[vids.length - 1] ?? "(none)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
