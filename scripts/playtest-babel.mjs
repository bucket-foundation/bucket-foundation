import { chromium } from "playwright";

const base = process.env.PLAY_BASE ?? "http://localhost:3101";
const out = process.env.SHOTS ?? "shots";
const width = Number(process.env.W ?? 390);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${width}-bm-${n}.png` });
await page.goto(`${base}/play/babel-match`);
await page.getByTestId("bm-board").waitFor();
await shot("board");
const cells = page.getByTestId("bm-cell");
const movesText = () => page.getByTestId("bm-moves").innerText();
let made = 0;
const start = await movesText();
for (let i = 0; i < 36 && made < 3; i++) {
  for (const j of [i + 1, i + 6]) {
    if (j >= 36 || (j === i + 1 && j % 6 === 0)) continue;
    const before = await movesText();
    await cells.nth(i).click();
    await cells.nth(j).click();
    await page.waitForTimeout(350);
    if ((await movesText()) !== before) made++;
    if (made >= 3) break;
  }
}
await shot("after");
console.log(JSON.stringify({ width, errors, start, end: await movesText(), progress: await page.getByTestId("bm-progress").innerText(), made, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) }));
await browser.close();
