import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { newDataKey } from "../../bkt/src/crypto";
import { advisorRoutes } from "../../bkt/src/advisor";
import { localRoutes } from "../../bkt/src/local";
import { PeopleStore } from "../../bkt/src/people";
import { jobRoutes } from "../../bkt/src/job-routes";
import { jobSpecs } from "../../bkt/src/job-specs";
import { JobRunner } from "../../bkt/src/jobs";
import { WorkQuizStore, workQuizRoutes } from "../../bkt/src/work-quiz";
import { fermi } from "../../bkt/src/daily-quiz";
import { NotesStore, notesRoutes } from "../../bkt/src/notes";
import { HistoryStore, historyRoutes } from "../../bkt/src/history";
import { buildPySource } from "../../bkt/src/pack/pysrc";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
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

const scratch = mkdtempSync(join(tmpdir(), "bkt-shots-"));
const runner = new JobRunner({
  root: join(scratch, "jobs"),
  specs: jobSpecs({ src: buildPySource(resolve(import.meta.dir, "../../bkt"), resolve(import.meta.dir, "../../..")), cacheRoot: join(scratch, "bkt", "py"), dataRoot: join(scratch, "fit"), people }),
});
const csv = ["day,sleep_h,focus"].concat(Array.from({ length: 40 }, (_, i) => `2026-08-${String((i % 28) + 1).padStart(2, "0")},${(6 + (i % 5) * 0.5).toFixed(1)},${50 + ((i * 7) % 40)}`)).join("\n");
const job = runner.start("analyze", { data: { text: csv, ext: ".csv" } });
for (let i = 0; i < 600 && runner.get(job.id)!.state === "running"; i++) await Bun.sleep(100);
const notesStore = new NotesStore(store, key);
notesStore.save({ title: "Exclusion zone reading list", body: "## To read\n- Pollack, the fourth phase of water\n- **Ling** on the association-induction hypothesis\n\nCheck whether `EZ` width scales with $\\lambda$ of the light.", pinned: true }, Date.now() - 86_400_000);
notesStore.save({ title: "Prime directions questions", body: "Which direction separates biophysics from chemistry?", pinned: false }, Date.now());
const hist = new HistoryStore(store, key);
hist.save(
  {
    productions: [
      { id: "p1", kind: "production", status: "accepted", claim: "Exclusion-zone width grows with infrared exposure", target_node_id: "n1", related_node_id: null, node_id: "n9", notes: [{ at: "2026-09-12", decision: "accept" }], updated_at: "2026-09-12T10:00:00Z" },
      { id: "p2", kind: "extension", status: "submitted", claim: "The same effect in cellular cytoplasm", target_node_id: "n1", related_node_id: "n9", node_id: null, notes: [], updated_at: "2026-09-25T10:00:00Z" },
      { id: "p3", kind: "production", status: "returned", claim: "Water memory claims", target_node_id: "n2", related_node_id: null, node_id: null, notes: [{ at: "2026-09-20", decision: "return", reason: "Needs a primary source for the measurement." }], updated_at: "2026-09-20T10:00:00Z" },
    ],
    nodes: { n1: { slug: "water", title: "Structured water", kind: "concept" }, n2: { slug: "memory", title: "Water memory", kind: "claim" }, n9: { slug: "ez", title: "Exclusion zone", kind: "claim" } },
  },
  Date.now(),
);
const wq = new WorkQuizStore(store, key);
wq.setBeads(
  ["Grip sphere on Learn", "Prerequisite path view", "Advisor viewer", "Host jobs runner", "Work quiz from beads", "Canon circle", "Atlas views", "Notes in bkt.db"].map((title, i) => ({
    id: `bkt-${200 + i}`,
    title,
    status: i < 5 ? "closed" : "open",
    priority: i % 3,
    createdAt: `2026-09-${String(20 + i).padStart(2, "0")}`,
  })),
  Date.now(),
);
wq.daily.put(
  {
    day: "2026-09-30",
    questions: [
      fermi({ id: "f1", prompt: "How many lines of chat did the day's sessions hold?", answer: 16000, explain: "About 16,000 lines across the day's sessions." }),
      { id: "c1", type: "recall", prompt: "Which branch takes desktop pull requests?", choices: ["dev", "main"], answer: "dev", limitSec: 30, explain: "Desktop work opens pull requests into dev." },
    ],
  },
  Date.now(),
);
const srv = startServe({ routes: { ...localRoutes(store, { content }), ...advisorRoutes(people), ...jobRoutes(runner), ...workQuizRoutes(wq, { seed: () => "shots-2" }), ...notesRoutes(notesStore), ...historyRoutes(hist) }, uiDir: resolve(import.meta.dir, "../dist") });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("pageerror", (e) => (errors.push(e.message), console.error("pageerror", e.message)));
page.on("console", (m) => m.type() === "error" && !m.text().includes("status of 404") && errors.push(m.text()));

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

await page.click('nav a[href="#/learn"]');
await page.waitForSelector(".grip");
await page.screenshot({ path: join(out, "0-grip.png") });
await page.click('nav a[href="#/path"]');
await page.fill(".search", "entropy");
await page.click(".matches a >> nth=0");
await page.waitForSelector(".steps-list, .path p");
await page.screenshot({ path: join(out, "6b-path.png") });

await page.click('nav a[href="#/work"]');
await page.waitForSelector(".q");
await page.screenshot({ path: join(out, "5b-work-quiz.png") });

await page.evaluate(() => (window.location.hash = "#/work/daily/2026-09-29"));
await page.waitForSelector("text=No quiz for 2026-09-29");
await page.screenshot({ path: join(out, "5c-daily-quiz-empty.png") });
await page.evaluate(() => (window.location.hash = "#/work/daily/2026-09-30"));
await page.waitForSelector(".q");
await page.fill(".search", "4000");
await page.click(".toolbar button.primary");
await page.waitForSelector(".after-block");
await page.screenshot({ path: join(out, "5d-daily-quiz-fermi.png") });
await page.evaluate(() => (window.location.hash = "#/atlases"));
await page.waitForSelector("text=This build has no solvability atlas");
await page.setInputFiles(".toolbar .file input", resolve(import.meta.dir, "../../../src/lib/research-os/solvability-atlas-data.json"));
await page.waitForSelector(".atlas-body");
await page.screenshot({ path: join(out, "6e-atlas-solvability.png") });
await page.click(".seg button >> nth=2");
await page.setInputFiles(".toolbar .file input", resolve(import.meta.dir, "../../../src/lib/research-os/patents-design-data.json"));
await page.waitForSelector(".atlas-body");
await page.screenshot({ path: join(out, "6f-atlas-patents.png") });

await page.evaluate(() => (window.location.hash = "#/advisors"));
await page.waitForSelector(".people button");
await page.click(".people li:nth-child(3) button");
await page.screenshot({ path: join(out, "7-advisors.png") });

await page.evaluate(() => (window.location.hash = "#/primes"));
await page.waitForSelector(".spokes");
await page.screenshot({ path: join(out, "8-prime-directions.png") });

await page.click('nav a[href="#/notes"]');
await page.waitForSelector(".editor");
await page.click("text=Preview");
await page.screenshot({ path: join(out, "8b-notes.png") });

await page.click('nav a[href="#/history"]');
await page.waitForSelector(".activity");
await page.screenshot({ path: join(out, "8c-history.png") });

await page.evaluate(() => (window.location.hash = "#/jobs"));
await page.waitForSelector(".job-head");
await page.click(".job-head");
await page.waitForSelector(".log");
await page.screenshot({ path: join(out, "9-jobs.png") });

await page.evaluate(() => (window.location.hash = "#/import"));
await page.waitForSelector('h1:has-text("Import")');
await page.screenshot({ path: join(out, "6-import.png") });

await page.click("a.foot-link");
await page.waitForSelector('h1:has-text("Add your own")');
await page.screenshot({ path: join(out, "6g-add-your-own.png") });

await page.evaluate(() => (window.location.hash = "#/setup"));
await page.waitForSelector('h1:has-text("Work quiz setup")');
await page.waitForSelector("text=Claude chats");
await page.screenshot({ path: join(out, "5e-work-quiz-setup.png") });

const home = mkdtempSync(join(out, ".home-"));
const real = Bun.spawn(["bash", "-c", 'exec "$0" "$1" serve --keyring passphrase --passphrase-fd 3 3<<<"$BKT_SHOTS_PASSPHRASE"', process.execPath, resolve(import.meta.dir, "../../bkt/src/cli.tsx")], {
  env: {
    PATH: process.env.PATH ?? "",
    HOME: home,
    BKT_HOME: join(home, "data"),
    BKT_UI_DIR: resolve(import.meta.dir, "../dist"),
    BKT_SHOTS_PASSPHRASE: "shots only",
    XDG_RUNTIME_DIR: join(home, "run"),
    XDG_CACHE_HOME: join(home, "cache"),
    XDG_DATA_HOME: join(home, "share"),
    XDG_CONFIG_HOME: join(home, "config"),
  },
  stdout: "pipe",
  stderr: "inherit",
});
const printed = real.stdout.getReader();
let buffered = "";
async function nextUrl(): Promise<string> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const m = buffered.match(/http:\/\/127\.0\.0\.1:\d+\//);
    if (m) {
      buffered = buffered.slice(buffered.indexOf(m[0]) + m[0].length);
      return m[0];
    }
    const { value, done } = await printed.read();
    if (done) break;
    buffered += new TextDecoder().decode(value);
  }
  throw new Error(`bkt serve printed no address: ${buffered}`);
}

const outside: string[] = [];
async function canonPage(graphics: boolean, wide = false) {
  const p = await browser.newPage(wide ? { viewport: { width: 1650, height: 1000 }, deviceScaleFactor: 1.2 } : { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
  p.on("pageerror", (e) => (errors.push(e.message), console.error("pageerror", e.message)));
  p.on("console", (m) => m.type() === "error" && !m.text().includes("status of 404") && errors.push(m.text()));
  await p.route("**/*", (r) => {
    if (new URL(r.request().url()).hostname === "127.0.0.1") return r.continue();
    outside.push(r.request().url());
    return r.abort();
  });
  if (!graphics) await p.addInitScript(() => (HTMLCanvasElement.prototype.getContext = () => null));
  await p.goto(await nextUrl());
  await p.waitForSelector(".side nav a");
  await p.click('nav a[href="#/canon"]');
  return p;
}

try {
  const canon = await canonPage(true);
  await canon.waitForSelector(".canon-site canvas", { timeout: 30000 });
  await canon.waitForTimeout(3000);
  await canon.screenshot({ path: join(out, "6c-canon-globe.png") });
  await canon.fill('.canon-site input[type="text"]', "entropy");
  await canon.waitForSelector(".canon-site .max-h-72 > button");
  await canon.screenshot({ path: join(out, "6c-canon-results.png") });
  await canon.click(".canon-site .max-h-72 > button >> nth=0");
  await canon.waitForSelector(".canon-site aside blockquote");
  await canon.waitForSelector(".canon-site aside li a");
  await canon.waitForTimeout(1500);
  await canon.screenshot({ path: join(out, "6c-canon-drawer.png") });
  await canon.click('.canon-site [data-view="circle"]');
  await canon.waitForSelector(".canon-site details summary");
  await canon.waitForTimeout(3000);
  await canon.screenshot({ path: join(out, "6d-canon-circle.png") });
  await canon.click(".canon-site aside >> text=open full claim");
  await canon.waitForSelector(".canon-detail blockquote");
  await canon.screenshot({ path: join(out, "6d-canon-excerpt.png") });
  await canon.click("a.back");
  await canon.waitForSelector(".canon-site canvas", { timeout: 30000 });
  await canon.click(".canon-site aside >> text=full-page search");
  await canon.waitForSelector(".canon-q");
  await canon.screenshot({ path: join(out, "6d-canon-full-search.png") });
  await canon.close();

  real.kill("SIGUSR1");
  const full = await canonPage(true, true);
  await full.waitForSelector(".canon-site canvas", { timeout: 30000 });
  await full.click('.canon-site button[aria-label="expand to fullscreen"]');
  await full.waitForTimeout(4000);
  await full.screenshot({ path: join(out, "7a-canon-expanded-globe.png") });
  await full.click('.canon-site [data-view="circle"]');
  await full.waitForTimeout(3000);
  await full.screenshot({ path: join(out, "7c-canon-expanded-circle.png") });
  await full.click(".canon-site details summary");
  await full.click(".canon-site details ol button >> nth=60");
  await full.waitForSelector(".canon-site aside h2");
  await full.click(".canon-site details summary");
  await full.click('.canon-site [data-view="globe"]');
  await full.waitForTimeout(4000);
  await full.screenshot({ path: join(out, "7b-canon-expanded-pin.png") });
  await full.close();

  real.kill("SIGUSR1");
  const plain = await canonPage(false);
  await plain.waitForSelector(".canon-q");
  await plain.fill(".canon-q", "entropy");
  await plain.click('.toolbar button[type="submit"]');
  await plain.click(".hit >> nth=0");
  await plain.waitForSelector(".canon-detail blockquote");
  await plain.screenshot({ path: join(out, "6d-canon-no-graphics.png") });
  await plain.close();
} finally {
  real.kill();
  await real.exited;
  rmSync(home, { recursive: true, force: true });
}
if (outside.length) errors.push(`the canon screen asked the network for ${outside.join(", ")}`);

await browser.close();
srv.stop();
store.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`screenshots in ${out}`);
