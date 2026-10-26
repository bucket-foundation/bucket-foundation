import { chromium } from "@playwright/test";

export async function mobileCta(url, sizes) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const out = [];
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(60);
    out.push(await page.evaluate(([w, h]) => {
      const seen = (sel) => {
        const e = document.querySelector(sel);
        if (!e || !e.offsetParent) return false;
        e.scrollIntoView({ block: "center" });
        const r = e.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) return false;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 8));
        return Boolean(hit && (hit === e || e.contains(hit)));
      };
      return { w, h, button: seen("#app .pill"), footer: seen("#app .ft") };
    }, [w, h]));
  }
  await browser.close();
  return out;
}

export function mobileSizes() {
  const s = [];
  for (let w = 320; w <= 640; w += 40) for (let h = 568; h <= 1400; h += 104) s.push([w, h]);
  return s;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const rows = await mobileCta(process.argv[2] ?? "http://localhost:3110/", mobileSizes());
  const bad = rows.filter((r) => !r.button || !r.footer);
  console.log(`${rows.length} viewports, ${bad.length} missing the button or footer`);
  for (const r of bad) console.log(JSON.stringify(r));
  process.exit(bad.length ? 1 : 0);
}
