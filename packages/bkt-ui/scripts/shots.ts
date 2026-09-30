import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { newDataKey } from "../../bkt/src/crypto";
import { localRoutes } from "../../bkt/src/local";
import type { Pack } from "../../bkt/src/pack/export";
import { startServe } from "../../bkt/src/serve";
import { Store } from "../../bkt/src/store";

const out = resolve(import.meta.dir, "../shots");
mkdirSync(out, { recursive: true });

const content = JSON.parse(readFileSync(resolve(import.meta.dir, "../../bkt/content/pack.json"), "utf8")) as Pack;
const store = new Store(":memory:", newDataKey());
store.importPack(content.version, content.items);
const DAY = 86_400_000;
const now = Date.now();
const seen = content.items.filter((i) => i.branch === "02-physics").slice(0, 24);
seen.forEach((it, k) => store.gradeItem(it.id, (k % 4 === 0 ? 1 : 3) as 1 | 3, now - (12 - (k % 6)) * DAY));
content.items.filter((i) => i.branch === "01-mathematics").slice(0, 9).forEach((it) => store.gradeItem(it.id, 3, now - DAY));

const srv = startServe({ routes: localRoutes(store, { content }), uiDir: resolve(import.meta.dir, "../dist") });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(srv.url);
await page.waitForSelector(".deck");
await page.screenshot({ path: join(out, "1-learn.png") });

await page.click('a.deck[href="#/learn/03-chemistry"]');
await page.waitForSelector(".card h2");
await page.screenshot({ path: join(out, "2-deck-new-atom.png") });
await page.click("text=Show answer");
await page.screenshot({ path: join(out, "3-deck-answer.png") });

await page.click('nav a[href="#/quiz"]');
await page.waitForSelector(".choice");
await page.click(".choice >> nth=1");
await page.waitForSelector(".after");
await page.screenshot({ path: join(out, "4-quiz.png") });

await page.click('nav a[href="#/review"]');
await page.waitForSelector(".card .q");
await page.click("text=Show answer");
await page.screenshot({ path: join(out, "5-review.png") });

await page.click('nav a[href="#/import"]');
await page.waitForSelector(".file");
await page.screenshot({ path: join(out, "6-import.png") });

await browser.close();
srv.stop();
store.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`screenshots in ${out}`);
