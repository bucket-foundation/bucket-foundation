import { chromium } from "playwright";

const base = process.env.PLAY_BASE ?? "http://localhost:3101";
const out = process.env.SHOTS ?? "shots";
const width = Number(process.env.W ?? 390);
const deck = (await (await fetch(`${base}/api/academy/flag-tiles`)).json()).deck;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${width}-ft-${n}.png` });
await page.goto(`${base}/play/flag-tiles`);
await page.getByTestId("ft-start").waitFor();
await shot("ready");
await page.getByTestId("ft-start").click();
for (let i = 0; i < 12; i++) {
  await page.getByTestId("ft-word").waitFor();
  if (i === 11) await shot("running");
  await page.getByTestId("ft-lane").nth(deck.langs.indexOf(deck.tiles[i].lang)).dispatchEvent("pointerdown");
}
const wrong = (deck.langs.indexOf(deck.tiles[12].lang) + 1) % 4;
await page.getByTestId("ft-word").waitFor();
await page.getByTestId("ft-lane").nth(wrong).dispatchEvent("pointerdown");
await page.getByTestId("ft-verdict").waitFor();
await shot("missed");
await page.getByTestId("ft-end").first().click();
await page.getByTestId("ft-results").waitFor();
await shot("results");
console.log(JSON.stringify({ width, errors, final: await page.getByTestId("ft-final").innerText(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) }));
await browser.close();
