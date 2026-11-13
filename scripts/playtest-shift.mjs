import { chromium } from "playwright";

const base = process.env.PLAY_BASE ?? "http://localhost:3101";
const out = process.env.SHOTS ?? "shots";
const width = Number(process.env.W ?? 390);
const board = (await (await fetch(`${base}/api/academy/shift`)).json()).board;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${width}-sh-${n}.png` });
await page.goto(`${base}/play/shift`);
await page.getByTestId("sh-board").waitFor();
const offsets = board.columns.map(() => 0);
for (const t of board.targets) {
  const letters = Array.from(t.form);
  for (let c = 0; c < letters.length; c++) {
    const col = board.columns[c];
    const cur = ((offsets[c] % col.length) + col.length) % col.length;
    const want = col.indexOf(letters[c]);
    const steps = (want - cur + col.length) % col.length;
    for (let s = 0; s < steps; s++) await page.getByTestId("sh-down").nth(c).click();
    offsets[c] += steps;
  }
  await page.waitForTimeout(150);
  if (t === board.targets[0]) await shot("found");
}
await page.getByTestId("sh-done").waitFor({ timeout: 5000 });
await shot("done");
console.log(JSON.stringify({ width, errors, clues: await page.getByTestId("sh-clues").innerText().then((s) => s.split("\n").length), overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) }));
await browser.close();
