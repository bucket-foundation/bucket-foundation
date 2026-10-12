import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const bin = process.argv[2] ?? resolve(import.meta.dir, "../../bkt/dist/bkt");
const out = process.env.BKT_SHOTS_OUT ? resolve(process.env.BKT_SHOTS_OUT) : resolve(import.meta.dir, "../shots/explore");
const BLANK_CANVAS_BYTES = 6000;
const ROW_SHOTS: { hash: string; file: string; mode: string; rows: number }[] = [
  { hash: "#/explore/major-to-career/graph", file: "4-major-to-career-graph.png", mode: "graph", rows: 64 },
  { hash: "#/explore/mathematics-chain/graph", file: "5-mathematics-chain-graph.png", mode: "graph", rows: 65 },
  { hash: "#/explore/occupations-time/map", file: "6-occupations-time-map.png", mode: "map", rows: 48 },
  { hash: "#/explore/occupations-time/timeline", file: "7-occupations-time-timeline.png", mode: "timeline", rows: 48 },
  { hash: "#/explore/technology-waves/timeline", file: "8-technology-waves-timeline.png", mode: "timeline", rows: 182 },
];
mkdirSync(out, { recursive: true });
const home = mkdtempSync(join(process.env.BKT_SHOTS_TMP ?? tmpdir(), "bkt-explore-shots-"));
const env = { ...process.env, BKT_HOME: join(home, "data"), BKT_UI_DIR: resolve(import.meta.dir, "../dist"), BKT_KEYRING: "passphrase" };
const PASS = "explore shots passphrase\n";

const init = Bun.spawnSync([bin, "init", "--keyring", "passphrase", "--passphrase-fd", "0"], { env, stdin: new TextEncoder().encode(PASS), stdout: "pipe", stderr: "pipe" });
if (init.exitCode !== 0) throw new Error(`bkt init exited ${init.exitCode}: ${init.stderr.toString()}`);

const serve = Bun.spawn([bin, "serve", "--passphrase-fd", "0"], { env, stdin: new TextEncoder().encode(PASS), stdout: "pipe", stderr: "inherit" });

async function readUrl(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  let buf = "";
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += new TextDecoder().decode(value);
    const m = buf.match(/http:\/\/127\.0\.0\.1:\d+\//);
    if (m) return m[0];
  }
  throw new Error(`bkt serve printed no url: ${buf}`);
}

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const url = await readUrl(serve.stdout);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  await page.goto(url);
  await page.waitForSelector('nav a[href="#/explore"]', { timeout: 30000 });
  await page.click('nav a[href="#/explore"]');
  await page.waitForSelector('[data-testid="explore-query"]', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(out, "1-explore.png") });
  await page.fill('[data-testid="explore-query"]', "mathematical theory of communication");
  await page.press('[data-testid="explore-query"]', "Enter");
  await page.waitForSelector('[data-testid="save-button"]', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, "2-explore-results.png") });
  await page.click('[data-testid="save-button"] >> nth=0');
  await page.waitForTimeout(500);
  await page.click('nav a[href="#/canon"]');
  await page.waitForTimeout(1000);
  await page.click('nav a[href="#/explore"]');
  await page.waitForSelector('[data-testid="saved-panel"]', { state: "attached", timeout: 30000 });
  await page.locator('[data-testid="saved-panel"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(out, "3-explore-saved-after-return.png") });
  const kept = await page.locator('[data-testid="saved-panel"] li').count();
  const drawn: Record<string, { rows: number; canvas_bytes: number; notes: string }> = {};
  for (const shot of ROW_SHOTS) {
    await page.evaluate(() => void (window.location.hash = "#/canon"));
    await page.waitForTimeout(500);
    await page.evaluate((hash) => void (window.location.hash = hash), shot.hash);
    await page.waitForSelector('[data-testid="rows-attribution"]', { timeout: 30000 }).catch(async (e) => {
      await page.screenshot({ path: join(out, "trouble.png") });
      throw new Error(`${shot.hash}: ${(e as Error).message.split("\n")[0]}; problems: ${problems.join(" | ").slice(0, 600)}`);
    });
    await page.waitForSelector('[data-testid="explore-scene"] canvas', { timeout: 30000 });
    await page.waitForTimeout(4000);
    const rows = await page.locator('[data-testid="explore-result"]').count();
    const selectedMode = await page.locator('[role="tab"][aria-selected="true"]').getAttribute("data-testid");
    const canvas = await page.locator('[data-testid="explore-scene"] canvas').first().screenshot();
    const notes = (await page.locator('[data-testid="rows-notes"]').innerText()).replace(/\s+/g, " ").slice(0, 160);
    if (rows !== shot.rows) throw new Error(`${shot.hash} lists ${rows} rows, and ${shot.rows} were expected`);
    if (selectedMode !== `mode-${shot.mode}`) throw new Error(`${shot.hash} opened in ${selectedMode}`);
    if (canvas.byteLength < BLANK_CANVAS_BYTES) throw new Error(`${shot.hash} drew a blank canvas of ${canvas.byteLength} bytes`);
    await page.locator('[data-testid="explore-scene"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(out, shot.file) });
    drawn[shot.hash] = { rows, canvas_bytes: canvas.byteLength, notes };
  }
  console.log(JSON.stringify({ url, saved_after_return: kept, drawn, problems }));
} finally {
  await browser.close();
  serve.kill();
  await serve.exited;
  rmSync(home, { recursive: true, force: true });
}
