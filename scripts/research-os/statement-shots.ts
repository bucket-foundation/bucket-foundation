import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { STATEMENT_VARIANTS } from "../../src/lib/research-os/statement-variants";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const out = process.argv[2] ?? "output/research-statement";

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const v of STATEMENT_VARIANTS) {
    await page.goto(`${base}/research/statement/${v.id}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${out}/${v.id}.png` });
    process.stdout.write(`${v.id} `);
  }
  await browser.close();
  process.stdout.write("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
