import { chromium } from "playwright";

const base = process.env.PLAY_BASE ?? "http://localhost:3101";
const out = process.env.SHOTS ?? "shots";
const width = Number(process.env.W ?? 390);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/${width}-va-${n}.png` });
await page.goto(`${base}/play/voice-atlas`);
for (let i = 0; i < 5; i++) {
  await page.getByTestId("va-map").waitFor();
  const box = await page.getByTestId("va-map").boundingBox();
  await page.mouse.click(box.x + box.width * (0.45 + i * 0.05), box.y + box.height * 0.3);
  if (i === 0) await shot("pin");
  await page.getByTestId("va-lock").click();
  await page.getByTestId("va-verdict").waitFor();
  if (i === 0) await shot("verdict");
  await page.getByTestId("va-next").click();
}
await page.getByTestId("va-results").waitFor();
await shot("results");
console.log(JSON.stringify({ width, errors, total: await page.getByTestId("va-total").innerText(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) }));
await browser.close();
