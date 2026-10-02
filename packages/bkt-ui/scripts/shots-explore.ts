import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const bin = process.argv[2] ?? resolve(import.meta.dir, "../../bkt/dist/bkt");
const out = resolve(import.meta.dir, "../shots/explore");
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
  console.log(JSON.stringify({ url, saved_after_return: kept, problems }));
} finally {
  await browser.close();
  serve.kill();
  await serve.exited;
  rmSync(home, { recursive: true, force: true });
}
