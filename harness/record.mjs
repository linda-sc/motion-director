#!/usr/bin/env node
// Frame-stepped footage recorder. Screenshots each animation frame deterministically
// (no real-time jitter), so ffmpeg can assemble a clean, exact-fps, perfect-loop clip.
//
//   node harness/record.mjs baked <demo-url> <outdir>      # before/after demo players
//   node harness/record.mjs app   <clip.json> <outdir>     # play a clip in the live app
//
// Reuses the Playwright install from the npx cache (no project dependency added).
import { createRequire } from "node:module";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/lindaawad/.npm/_npx/5e2e484947874241/node_modules/playwright");

const BASE = "http://127.0.0.1:8787";
const [mode, target, outdir] = process.argv.slice(2);
if (!mode || !target || !outdir) { console.error("usage: record.mjs <baked|app> <target> <outdir>"); process.exit(2); }
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
const pad = (n) => String(n).padStart(3, "0");

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function recordBaked() {
  await page.goto(target, { waitUntil: "networkidle" });
  // Kill the auto-play setTimeout loop so #play stops mutating; then we drive it.
  const stopLoop = () => { const hi = setTimeout(() => {}, 0); for (let i = 0; i <= hi; i++) clearTimeout(i); };
  await page.evaluate(stopLoop);
  await page.waitForTimeout(150);
  await page.evaluate(stopLoop);
  const count = await page.evaluate(() => FRAMES.length);
  const playEl = await page.$("#play");
  for (let k = 0; k < count; k++) {
    await page.evaluate((i) => { play.innerHTML = gridLayer + figure(FRAMES[i].pose); }, k);
    await playEl.screenshot({ path: `${outdir}/${pad(k)}.png` });
  }
  console.log(`baked: ${count} frames -> ${outdir}`);
}

async function recordApp() {
  const raw = JSON.parse(readFileSync(target, "utf8"));
  const snap = raw.snapshot ?? raw;
  const stateValue = JSON.stringify({ version: 1, ...snap });
  await ctx.addInitScript((v) => { localStorage.setItem("motion-director-state-v1", v); }, stateValue);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#stage", { timeout: 8000 });
  await page.waitForTimeout(400);
  const count = (await page.$$(".frame-cell:not(.is-anchor-add)")).length;
  for (let k = 0; k < count; k++) {
    // Clicking re-renders the timeline (detaching handles), so re-find each step.
    const cells = await page.$$(".frame-cell:not(.is-anchor-add)");
    await cells[k].click();
    await page.waitForTimeout(80);
    await (await page.$("#stage")).screenshot({ path: `${outdir}/${pad(k)}.png` });
  }
  console.log(`app: ${count} frames -> ${outdir}`);
}

if (mode === "baked") await recordBaked();
else if (mode === "app") await recordApp();
else { console.error("unknown mode"); process.exit(2); }

await browser.close();
