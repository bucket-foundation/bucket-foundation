import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { PIECES, embedFonts, pieceFile } from "../src/ui/art/brand";
import tokens from "../src/ui/tokens.json";

const ROOT = join(__dirname, "..", "public", "brand");
const SCREENS: [string, string][] = [["home", "/"], ["app", "/app"], ["play", "/play"], ["ispy", "/play/ispy"], ["word", "/word/hundred"], ["join", "/join"]];

async function shoot(base: string) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  mkdirSync(join(ROOT, "screens"), { recursive: true });
  for (const [file, path] of SCREENS) {
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(ROOT, "screens", `${file}.png`) });
  }
  await browser.close();
}

const FACTS = `Polingual
Language learning for multilingual learners.

Polingual teaches one word across many languages and scripts. Hear every word said, see its roots, and keep a daily streak.
After 100 days, expect to know 280 words across 4 languages, and remember 95% of them.
28 languages, each with a top 1,000 words and 300 phrases.
Site: https://www.polingual.com
Press: https://www.polingual.com/support

Colors: paper ${tokens.color.paper}, tyrian ${tokens.color.tyrian}, vermilion ${tokens.color.vermilion}, ink ${tokens.color.ink}
Type: Fredoka for display, Nunito for text, Space Mono for labels, Noto Sans for scripts
Word data: Wiktionary via Kaikki, CC BY-SA 4.0.
`;

async function main() {
  const base = process.env.BRAND_BASE;
  if (base) await shoot(base.replace(/\/$/, ""));
  const files: Record<string, Uint8Array> = {};
  const add = (path: string, data: Uint8Array) => (files[`polingual-brand-kit/${path}`] = data);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const pages = await Promise.all([1, 4].map(async (scale) => [scale, await (await browser.newContext({ deviceScaleFactor: scale })).newPage()] as const));
  for (const p of PIECES) {
    add(`artwork/svg/${pieceFile(p)}.svg`, Buffer.from(p.svg));
    const svg = await embedFonts(p.svg);
    for (const [scale, page] of pages) {
      await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
      await page.evaluate(() => document.fonts.ready);
      add(`artwork/png/${pieceFile(p)}@${scale}x.png`, await page.locator("svg").first().screenshot({ omitBackground: true }));
    }
  }
  await browser.close();
  for (const f of readdirSync(join(ROOT, "kit"))) add(`logos/${f}`, readFileSync(join(ROOT, "kit", f)));
  for (const [file] of SCREENS) {
    const path = join(ROOT, "screens", `${file}.png`);
    if (existsSync(path)) add(`screens/${file}.png`, readFileSync(path));
  }
  add("og.jpg", readFileSync(join(ROOT, "og.jpg")));
  add("tokens.json", readFileSync(join(__dirname, "..", "src", "ui", "tokens.json")));
  add("FACTS.txt", strToU8(FACTS));
  writeFileSync(join(ROOT, "polingual-press-kit.zip"), zipSync(files, { level: 9 }));
  writeFileSync(join(ROOT, "tokens.json"), readFileSync(join(__dirname, "..", "src", "ui", "tokens.json")));
  console.log(`wrote ${Object.keys(files).length} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
