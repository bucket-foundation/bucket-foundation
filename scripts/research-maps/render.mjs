#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const WIDTH = 2400;

export const PAGES = [
  { name: "edtech-market-map", path: "/research/maps/edtech" },
  { name: "edtech-market-table", path: "/research/maps/edtech?view=table" },
  { name: "knowledge-coverage-map", path: "/research/maps/coverage" },
  { name: "progression-graphs", path: "/research/maps/progressions" },
  { name: "major-to-career-flow", path: "/research/maps/flow" },
];

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const base = flag("base", process.env.RESEARCH_MAPS_BASE ?? "http://localhost:3000");
  const out = flag("out", path.join(os.homedir(), "agfarms/.renders"));
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: WIDTH, height: 1400 }, deviceScaleFactor: 1 });
  for (const target of PAGES) {
    const page = await context.newPage();
    const response = await page.goto(base + target.path, { waitUntil: "networkidle", timeout: 120000 });
    if (!response || !response.ok()) throw new Error(`${target.path} returned ${response?.status()}`);
    await page.waitForSelector("[data-map-figure]");
    const height = await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (img) => (img.complete ? null : new Promise((done) => { img.onload = done; img.onerror = done; }))));
      const figure = document.querySelector("[data-map-figure]");
      document.body.replaceChildren(figure);
      document.body.style.margin = "0";
      figure.style.border = "0";
      return Math.ceil(figure.getBoundingClientRect().height);
    });
    const png = path.join(out, `${target.name}.png`);
    const pdf = path.join(out, `${target.name}.pdf`);
    await page.setViewportSize({ width: WIDTH, height: Math.min(height, 16000) });
    await page.screenshot({ path: png, fullPage: true });
    await page.emulateMedia({ media: "screen" });
    await page.pdf({ path: pdf, width: `${WIDTH}px`, height: `${height + 1}px`, printBackground: true, pageRanges: "1" });
    console.log(`${target.name} ${WIDTH}x${height} ${png} ${pdf}`);
    await page.close();
  }
  await browser.close();
}

if (process.argv[1] === new URL(import.meta.url).pathname) main().catch((err) => { console.error(err); process.exit(1); });
