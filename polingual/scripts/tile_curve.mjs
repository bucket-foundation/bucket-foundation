import { chromium } from "@playwright/test";

export async function tileCurve(url, { from = 1920, to = 641, step = 20, height = 900 } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: from, height } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const rows = [];
  const widths = [];
  for (let w = from; w >= to; w -= step) widths.push(w);
  if (widths.at(-1) !== to) widths.push(to);
  for (const w of widths) {
    await page.setViewportSize({ width: w, height });
    await page.waitForTimeout(60);
    rows.push(await page.evaluate((w) => {
      const g = document.getElementById("hc-grid");
      const t = [...g.children].find((el) => el.offsetParent);
      return { w, tile: Math.round(t.offsetWidth * parseFloat(getComputedStyle(t).zoom || 1) * 10) / 10, layout: g.dataset.layout };
    }, w));
  }
  await browser.close();
  return rows;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const rows = await tileCurve(process.argv[2] ?? "http://localhost:3110/");
  for (const r of rows) console.log(`${r.w}\t${r.tile}\t${r.layout}`);
  const bad = rows.filter((r, i) => i && r.tile > rows[i - 1].tile + 0.5);
  if (bad.length) {
    console.error("tile grew as width shrank at", bad.map((r) => r.w).join(", "));
    process.exit(1);
  }
}
