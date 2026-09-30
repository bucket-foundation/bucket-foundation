import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { newDataKey } from "../../bkt/src/crypto";
import { advisorRoutes } from "../../bkt/src/advisor";
import { localRoutes } from "../../bkt/src/local";
import { PeopleStore } from "../../bkt/src/people";
import type { Pack } from "../../bkt/src/pack/export";
import { startServe } from "../../bkt/src/serve";
import { Store } from "../../bkt/src/store";
import { parseAdvisorReview, parsePrimeDirections } from "../../../src/lib/research-os/advisor-review";

const out = resolve(import.meta.dir, "../shots");
mkdirSync(out, { recursive: true });

const content = JSON.parse(readFileSync(resolve(import.meta.dir, "../../bkt/content/pack.json"), "utf8")) as Pack;
const key = newDataKey();
const store = new Store(":memory:", key);
const people = new PeopleStore(store, key);
const FIRST = ["Avery", "Rowan", "Kai", "Lena", "Mira", "Theo", "Iris", "Jonah", "Selah", "Noor", "Ezra", "Tamsin"];
const LAST = ["Stone", "Hale", "Mercer", "Brook", "Vale", "Quill", "Frost", "Reyes", "Okafor", "Lind", "Sato", "Marsh"];
const INST = ["North Institute", "Harbor College", "East University", "Ridge Polytechnic", "Lake Science Center"];
const AXES = ["water membrane", "light cell", "redox mitochondria", "field coherence", "protein folding", "circadian clock"];
const rand = (i: number, j: number) => ((Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1 + 1) % 1;
people.importReview(
  parseAdvisorReview({
    schema: "bucket.advisor-review/1",
    context: { key: "demo", prime_axes: AXES, star_query_prime: AXES.map((_, j) => 0.4 + 0.1 * j), summary: "demo" },
    rows: Array.from({ length: 60 }, (_, i) => ({
      rank: i + 1,
      name: `${FIRST[i % 12]} ${LAST[(i * 5) % 12]}`,
      score: 0.9 - i * 0.01,
      percentile: 100 - i * 1.2,
      institution: INST[i % 5],
      department: "Physics",
      field: i % 3 ? "Biophysics" : "Physical chemistry",
      country: "US",
      h_index: 40 - (i % 20),
      works_count: 120 - i,
      shared_terms: "water interface light",
      profile_url: "https://example.org/profile",
      star_prime: AXES.map((_, j) => rand(i, j)),
    })),
  }),
  Date.now(),
);
people.importDirections(
  parsePrimeDirections({
    schema: "bucket.prime-directions/1",
    corpus: "academy",
    shape: { docs: 358, terms: 4120 },
    components: AXES.concat(["entropy information", "quantum spin", "cosmology redshift", "neuron memory", "symmetry group", "catalysis enzyme"]).map((t, i) => ({
      index: i + 1,
      angle_deg: i * 30,
      variance_ratio: 0.08 / (1 + i * 0.35),
      top_terms: t.split(" ").map((term) => ({ term, weight: 0.3 })),
      bottom_terms: [{ term: "history", weight: -0.1 }],
    })),
  }),
  Date.now(),
);
store.importPack(content.version, content.items);
const DAY = 86_400_000;
const now = Date.now();
const seen = content.items.filter((i) => i.branch === "02-physics").slice(0, 24);
seen.forEach((it, k) => store.gradeItem(it.id, (k % 4 === 0 ? 1 : 3) as 1 | 3, now - (12 - (k % 6)) * DAY));
content.items.filter((i) => i.branch === "01-mathematics").slice(0, 9).forEach((it) => store.gradeItem(it.id, 3, now - DAY));

const srv = startServe({ routes: { ...localRoutes(store, { content }), ...advisorRoutes(people) }, uiDir: resolve(import.meta.dir, "../dist") });
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

await page.click('nav a[href="#/advisors"]');
await page.waitForSelector(".people button");
await page.click(".people li:nth-child(3) button");
await page.screenshot({ path: join(out, "7-advisors.png") });

await page.click('nav a[href="#/primes"]');
await page.waitForSelector(".spokes");
await page.screenshot({ path: join(out, "8-prime-directions.png") });

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
