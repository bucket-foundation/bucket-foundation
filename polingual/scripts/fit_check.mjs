import { chromium } from "@playwright/test";

export const VIEWPORTS = [
  [320, 568], [360, 640], [360, 780], [375, 667], [375, 812], [390, 844], [393, 852], [412, 915], [414, 896], [430, 932],
  [600, 1300], [640, 900], [700, 900], [768, 1024], [820, 1180], [900, 700], [1000, 820], [1024, 768], [1100, 900], [1180, 820],
  [1280, 720], [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1600, 900], [1680, 1050], [1920, 1080], [2048, 1152], [2560, 1440],
];

export async function fitCheck(url, sizes = VIEWPORTS) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const out = [];
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(120);
    out.push(await page.evaluate(([w, h]) => {
      scrollTo(0, 0);
      const doc = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const btn = document.querySelector(w <= 640 ? "#app .pill" : "#dk .hc .btn");
      const r = btn.getBoundingClientRect();
      const inView = r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5 && r.width > 10;
      const hit = inView && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const tile = [...document.querySelectorAll(w <= 640 ? "#app-grid .t" : "#hc-grid .t")].find((e) => e.offsetParent);
      const tw = tile ? Math.round(tile.offsetWidth * parseFloat(getComputedStyle(tile).zoom || 1)) : 0;
      return { w, h, doc, fits: doc <= h + 1, button: Boolean(hit && (hit === btn || btn.contains(hit))), tile: tw, docW: document.documentElement.scrollWidth };
    }, [w, h]));
  }
  await browser.close();
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const rows = await fitCheck(process.argv[2] ?? "http://localhost:3110/");
  for (const r of rows) console.log(`${r.w}x${r.h}\tdoc ${r.doc}\t${r.fits ? "fits" : "SCROLLS"}\tbutton ${r.button ? "ok" : "HIDDEN"}\ttile ${r.tile}\tdocW ${r.docW}`);
  process.exit(rows.every((r) => r.fits && r.button && r.docW <= r.w) ? 0 : 1);
}
