import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const out = resolve(import.meta.dir, "../shots");
mkdirSync(out, { recursive: true });

const base = process.env.BKT_SHOTS_TMP ?? tmpdir();
mkdirSync(base, { recursive: true });
const scratch = mkdtempSync(join(base, "bkt-path-shots-"));
const dirs = Object.fromEntries(["home", "run", "cache", "data", "config"].map((d) => [d, join(scratch, d)]));
for (const d of Object.values(dirs)) mkdirSync(d, { recursive: true, mode: 0o700 });

const serve = Bun.spawn(["bash", "-c", 'exec bun run "$0" serve --keyring passphrase --passphrase-fd 3 3<<<"$BKT_SHOTS_PASS"', resolve(import.meta.dir, "../../bkt/src/cli.tsx")], {
  cwd: resolve(import.meta.dir, "../../bkt"),
  env: {
    ...process.env,
    BKT_HOME: dirs.home,
    XDG_RUNTIME_DIR: dirs.run,
    XDG_CACHE_HOME: dirs.cache,
    XDG_DATA_HOME: dirs.data,
    XDG_CONFIG_HOME: dirs.config,
    BKT_UI_DIR: resolve(import.meta.dir, "../dist"),
    BKT_SHOTS_PASS: "shots only",
  },
  stdout: "pipe",
  stderr: "inherit",
});

async function firstUrl(): Promise<string> {
  let seen = "";
  const text = new TextDecoder();
  const reader = serve.stdout.getReader();
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    seen += text.decode(r.value);
    const m = seen.match(/http:\/\/127\.0\.0\.1:\d+\S*/);
    if (m) return m[0];
  }
  throw new Error(`bkt serve printed no address: ${seen}`);
}

let failed = false;
const browser = await chromium.launch();
try {
  const url = await Promise.race([firstUrl(), Bun.sleep(120_000).then(() => Promise.reject(new Error("bkt serve did not start in 120 seconds")))]);
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("status of 404") && errors.push(m.text()));

  await page.goto(url);
  await page.waitForSelector(".deck, .choice");
  await page.evaluate(() => (window.location.hash = "#/learn/02-physics"));
  for (let i = 0; i < 4; i++) {
    await page.waitForSelector("text=Show answer");
    await page.click("text=Show answer");
    await page.click(i === 0 ? ".rate .r1" : ".rate .r3");
  }
  await page.waitForTimeout(500);

  await page.click('nav a[href="#/path"]');
  await page.waitForSelector(".topic-map .topic");
  await page.waitForSelector(".grip.compact");
  const counts = await page.evaluate(() => ({ topics: document.querySelectorAll(".topic-map .topic").length, links: document.querySelectorAll(".topic-map .edge").length, known: document.querySelectorAll(".topic-map .topic.known, .topic-map .topic.due").length }));
  await page.screenshot({ path: join(out, "6g-path-map.png") });

  await page.locator(".topic-map .topic.known, .topic-map .topic.due").first().dispatchEvent("click");
  await page.waitForSelector(".topic-panel h2");
  await page.locator(".topic-panel .linked .link").first().click();
  await page.waitForSelector('.grip-rows .branch[aria-pressed="true"]');
  await page.screenshot({ path: join(out, "6h-path-topic.png") });

  await page.fill(".search", "entropy");
  await page.click(".matches a >> nth=0");
  await page.waitForSelector(".topic-panel h2");
  await page.focus(".topic-map svg");
  await page.keyboard.press("0");
  await page.screenshot({ path: join(out, "6i-path-every-topic.png") });

  console.log(`${counts.topics} topics, ${counts.links} links, ${counts.known} studied`);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`screenshots in ${out}`);
} catch (e) {
  failed = true;
  console.error((e as Error).message);
} finally {
  await browser.close();
  serve.kill("SIGTERM");
  await serve.exited;
  rmSync(scratch, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
