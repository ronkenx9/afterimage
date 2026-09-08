// Headless-browser demo recorder. Records: (A) a terminal session using the
// agent from the CLI, (B) the live dashboard scanning the market, (C) the owner
// setting mandates on the dashboard (tighten-only, clamped), and (D) a real
// on-chain trade reconstruction. Reliable and reproducible.
//
//   BASE_URL=http://localhost:3014 WALLET=<addr> TERMINAL=/path/terminal.html node scripts/record-demo.mjs

import { chromium } from "@playwright/test";
import { readdirSync } from "node:fs";

const BASE = (process.env.BASE_URL || "http://localhost:3014").replace(/\/$/, "");
const WALLET = process.env.WALLET || "";
const TERMINAL = process.env.TERMINAL || "";
const OUT = process.env.OUT_DIR || "/tmp/afterimage-demo";
const W = 1280;
const H = 800;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function smoothScroll(page, ys, dwell = 1400) {
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

  // Scene A — using the agent from the terminal (real captured CLI output).
  if (TERMINAL) {
    await page.goto(`file://${TERMINAL}`, { waitUntil: "load" });
    await wait(11_000); // let the session "type" out
  }

  // Scene B — the live dashboard scanning the market.
  await page.goto(`${BASE}/agent`, { waitUntil: "networkidle", timeout: 60_000 });
  await wait(2600);
  await smoothScroll(page, [0, 280, 640, 1040, 1520], 1400);

  // Scene C — the owner SETS mandates on the dashboard (tighten-only).
  // Scroll to the panel, drag the per-order cap down, and re-run.
  const applied = await page.evaluate(() => {
    const panel = document.querySelector(".mandates");
    if (!panel) return false;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = document.querySelector('.mandates-controls input[type="range"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, "60");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  });
  await wait(1800);
  if (applied) {
    await page.getByRole("button", { name: /Apply mandates/i }).click().catch(() => {});
    await wait(4200); // wait for the clamped re-run + proposals to render
    await page.evaluate(() => {
      const r = document.querySelector(".mandates-result");
      if (r) r.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await wait(2600);
  }

  // Scene D — a real trade on chain: live bounded reconstruction.
  if (WALLET) {
    await page.goto(`${BASE}/api/reconstruct?address=${WALLET}&limit=10`, { waitUntil: "networkidle", timeout: 60_000 });
    await wait(3400);
  }

  await context.close();
  await browser.close();

  const vids = readdirSync(OUT).filter((f) => f.endsWith(".webm"));
  console.log(`VIDEO:${OUT}/${vids[vids.length - 1] ?? "(none)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
