import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

export const DATA_SHOTS = ["10-data-list.png", "11-data-table.png", "12-data-record.png", "13-data-two-tabs.png"];

const CLI = resolve(import.meta.dir, "../../bkt/src/cli.tsx");
const START_MS = 120_000;

async function firstLine(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) text += decoder.decode(value, { stream: true });
    const line = text.split("\n").find((l) => l.startsWith("http://127.0.0.1:"));
    if (line) {
      reader.releaseLock();
      return line.trim();
    }
    if (done) throw new Error(`bkt serve printed no address: ${text}`);
  }
}

export async function dataShots(out: string): Promise<string[]> {
  const scratch = mkdtempSync(join(homedir(), ".cache", "bkt-data-shots-"));
  for (const d of ["home", "user", "run"]) mkdirSync(join(scratch, d), { mode: 0o700 });
  const pass = join(scratch, "pass");
  writeFileSync(pass, "data-shots\n", { mode: 0o600 });
  const fd = openSync(pass, "r");
  const serve = Bun.spawn([process.execPath, CLI, "serve", "--keyring", "passphrase", "--passphrase-fd", "3"], {
    env: {
      PATH: process.env.PATH ?? "",
      HOME: join(scratch, "user"),
      BKT_HOME: join(scratch, "home"),
      BKT_ANALYSES: join(scratch, "analyses"),
      XDG_RUNTIME_DIR: join(scratch, "run"),
      BKT_UI_DIR: resolve(import.meta.dir, "../dist"),
    },
    stdio: ["ignore", "pipe", "inherit", fd],
  });
  const browser = await chromium.launch();
  try {
    const url = await Promise.race([firstLine(serve.stdout as ReadableStream<Uint8Array>), Bun.sleep(START_MS).then(() => Promise.reject(new Error("bkt serve did not start in time")))]);
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForSelector(".choice");
    await page.click(".choice >> nth=0");
    await page.waitForSelector(".after");
    await page.click('nav a[href="#/data"]');
    await page.waitForSelector("article.dataset");
    await page.screenshot({ path: join(out, DATA_SHOTS[0]), fullPage: true });
    await page.click('article.dataset:has(h2:text-is("Canon excerpts")) button.open');
    await page.waitForSelector(".rows tbody tr");
    await page.fill(".data-table .search", "water");
    await page.waitForSelector('[role="status"]:has-text("of")');
    await page.waitForTimeout(600);
    await page.click(".sort >> nth=0");
    await page.waitForSelector('th[aria-sort="ascending"]');
    await page.screenshot({ path: join(out, DATA_SHOTS[1]) });
    await page.click(".rows tbody tr >> nth=0 >> td.title button");
    await page.waitForSelector("article.record h2");
    await page.screenshot({ path: join(out, DATA_SHOTS[2]) });
    await page.click('[role="tab"] >> nth=0');
    await page.click('article.dataset:has(h2:text-is("Learning decks")) button.open');
    await page.waitForSelector(".rows tbody tr");
    if ((await page.locator('[role="tab"]').count()) !== 4) throw new Error("expected the home tab and three open tabs");
    await page.click('[role="tab"]:has-text("Canon excerpts") + .tab-close');
    await page.waitForFunction(() => document.querySelectorAll('[role="tab"]').length === 3);
    await page.screenshot({ path: join(out, DATA_SHOTS[3]) });
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await browser.close();
    serve.kill("SIGTERM");
    await serve.exited;
    closeSync(fd);
    rmSync(scratch, { recursive: true, force: true });
  }
  const paths = DATA_SHOTS.map((f) => join(out, f));
  for (const p of paths) if (!existsSync(p) || statSync(p).size === 0) throw new Error(`missing screenshot ${p}`);
  return paths;
}

if (import.meta.main) {
  const out = resolve(import.meta.dir, "../shots");
  mkdirSync(out, { recursive: true });
  for (const p of await dataShots(out)) console.log(p);
}
