import { chromium } from "playwright";

const base = process.env.PLAY_BASE ?? "http://localhost:3101";
const out = process.env.SHOTS ?? "shots";
const width = Number(process.env.W ?? 390);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${width}-ws-${n}.png` });
await page.goto(`${base}/play/word-snake`);
await page.getByTestId("ws-start").click();
await page.getByTestId("ws-canvas").waitFor();
const box = await page.getByTestId("ws-canvas").boundingBox();
for (let i = 0; i < 12; i++) {
  await page.mouse.move(box.x + box.width * (0.2 + 0.6 * ((i % 4) / 3)), box.y + box.height * (0.2 + 0.6 * (Math.floor(i / 4) / 2)));
  await page.waitForTimeout(500);
}
await shot("play");
const length = await page.getByTestId("ws-length").innerText().catch(() => "dead");
console.log(JSON.stringify({ width, errors, length, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) }));
await browser.close();
