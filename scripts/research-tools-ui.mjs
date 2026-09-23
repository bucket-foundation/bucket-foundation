import { chromium } from "playwright";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FIXTURES = path.join(ROOT, "scripts/fixtures/research-tools-ui");
const OUT = path.join(ROOT, ".tools-ui");
const FORM_VALUES = {
  stabilitydesigner: { 0: "MKTAYIAKQRQISFVK", 1: "A5V" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function args() {
  const a = process.argv.slice(2);
  const get = (flag) => {
    const i = a.indexOf(flag);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return { compare: get("--compare"), port: Number(get("--port") ?? "3471") };
}

function toolsIn(tree) {
  const dir = path.join(tree, "src/app/research/tools");
  return fs
    .readdirSync(dir)
    .filter((d) => fs.statSync(path.join(dir, d)).isDirectory())
    .filter((d) => fs.readdirSync(path.join(dir, d)).some((f) => f.endsWith("Client.tsx")))
    .sort();
}

function fixture(tool) {
  const file = path.join(FIXTURES, `${tool}.json`);
  if (!fs.existsSync(file)) throw new Error(`no fixture for ${tool}: add ${path.relative(ROOT, file)}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeBody(buf, contentType) {
  if (!buf) return null;
  const m = /boundary=(.+)$/.exec(contentType ?? "");
  if (!m) return buf.toString("utf8");
  return buf.toString("latin1").split(m[1]).join("BOUNDARY");
}

async function snapshot(page) {
  return page.evaluate(() => {
    const root = document.querySelector("main") ?? document.body;
    return { html: root.innerHTML, text: root.innerText };
  });
}

async function settle(page) {
  try {
    await page.waitForFunction(
      () => {
        const t = document.body.innerText.toLowerCase();
        return t.includes("publish to canon") || t.includes("could not complete") || t.includes("offline");
      },
      null,
      { timeout: 8000 },
    );
  } catch {
    return;
  } finally {
    await sleep(400);
  }
}

async function openTool(context, base, tool, requests) {
  const page = await context.newPage();
  await page.route(`**/api/research/${tool}**`, async (route) => {
    const req = route.request();
    const ct = req.headers()["content-type"];
    const url = new URL(req.url());
    requests.push({
      method: req.method(),
      url: url.pathname + url.search,
      contentType: ct?.replace(/boundary=.+$/, "boundary=BOUNDARY") ?? null,
      body: normalizeBody(req.postDataBuffer(), ct),
    });
    if (req.method() !== "POST") return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    const f = fixture(tool);
    const payload = f.result
      ? { status: "succeeded", job_id: "fixture", result: f.result }
      : { status: "failed", job_id: "fixture", error: { message: f.failed } };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });
  await page.goto(`${base}/research/tools/${tool}`, { waitUntil: "networkidle" });
  return page;
}

async function recordDemo(context, base, tool) {
  const requests = [];
  const page = await openTool(context, base, tool, requests);
  const rec = { initial: await snapshot(page) };
  const buttons = page.locator("button[type=button]").filter({ hasText: /demo|example|sample|try/i });
  rec.demoButtons = await buttons.count();
  if (rec.demoButtons > 0) {
    rec.demoLabel = (await buttons.first().innerText()).trim();
    await buttons.first().click();
    await sleep(300);
    const submit = page.locator("form button[type=submit]").first();
    if (requests.length === 0 && (await submit.count()) > 0 && !(await submit.isDisabled())) {
      rec.demoSubmitted = true;
      await submit.click();
    }
    await settle(page);
    rec.demo = { requests, after: await snapshot(page) };
  }
  await page.close();
  return rec;
}

async function fillValue(field, index, tool) {
  const override = FORM_VALUES[tool]?.[index];
  if (override !== undefined) return override;
  const type = (await field.getAttribute("type")) ?? "text";
  const tag = await field.evaluate((el) => el.tagName);
  if (tag === "TEXTAREA") return "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12";
  return type === "number" ? "5" : "ACDEFGHIKLMNPQRSTVWYACGT";
}

async function recordForm(context, base, tool) {
  const requests = [];
  const page = await openTool(context, base, tool, requests);
  const filled = [];
  const fields = page.locator("form textarea, form input");
  const count = await fields.count();
  for (let i = 0; i < count; i++) {
    const f = fields.nth(i);
    const type = (await f.getAttribute("type")) ?? "text";
    if (!(await f.isVisible()) || !(await f.isEnabled())) continue;
    if (type === "file") {
      await f.setInputFiles({ name: "sample.bin", mimeType: "application/octet-stream", buffer: Buffer.from([1, 2, 3, 4]) });
      filled.push([i, "file"]);
      continue;
    }
    if (["checkbox", "radio", "hidden", "submit", "button"].includes(type)) continue;
    const override = FORM_VALUES[tool]?.[i];
    if (override === undefined && (await f.inputValue()) !== "") continue;
    const value = await fillValue(f, i, tool);
    await f.fill(value);
    filled.push([i, value]);
  }
  const submit = page.locator("form button[type=submit]").first();
  const form = { filled, hasSubmit: (await submit.count()) > 0 };
  if (form.hasSubmit) {
    form.submitDisabled = await submit.isDisabled();
    form.beforeSubmit = await snapshot(page);
    if (!form.submitDisabled) {
      await submit.click();
      await settle(page);
    }
  }
  form.requests = requests;
  form.after = await snapshot(page);
  await page.close();
  return form;
}

async function record(tree, base) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const out = {};
  try {
    for (const tool of toolsIn(tree)) {
      const rec = await recordDemo(context, base, tool);
      rec.form = await recordForm(context, base, tool);
      out[tool] = rec;
    }
  } finally {
    await browser.close();
  }
  return out;
}

function run(cmd, argv, cwd) {
  execFileSync(cmd, argv, { cwd, stdio: ["ignore", "inherit", "inherit"] });
}

function build(tree) {
  try {
    run("npx", ["next", "build"], tree);
  } catch {
    run("npx", ["next", "build"], tree);
  }
}

async function serve(tree, port) {
  const child = spawn("npx", ["next", "start", "-p", String(port)], { cwd: tree, stdio: "ignore", detached: true });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${url}/research/tools`);
      if (r.ok) return { url, stop: () => process.kill(-child.pid) };
    } catch {
      await sleep(1000);
      continue;
    }
    await sleep(1000);
  }
  process.kill(-child.pid);
  throw new Error(`next start on ${port} did not answer`);
}

async function recordTree(tree, port, label) {
  build(tree);
  const server = await serve(tree, port);
  try {
    const rec = await record(tree, server.url);
    const file = path.join(OUT, `${label}.json`);
    fs.writeFileSync(file, JSON.stringify(rec, null, 2));
    return file;
  } finally {
    server.stop();
  }
}

function worktreeFor(ref) {
  const sha = execFileSync("git", ["rev-parse", ref], { cwd: ROOT, encoding: "utf8" }).trim();
  const dir = path.join(OUT, `wt-${sha.slice(0, 12)}`);
  if (!fs.existsSync(dir)) {
    run("git", ["worktree", "add", "--detach", dir, sha], ROOT);
    fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"));
  }
  return { dir, sha };
}

function removeWorktree(dir) {
  fs.rmSync(path.join(dir, "node_modules"), { force: true });
  run("git", ["worktree", "remove", "--force", dir], ROOT);
}

function firstDifference(a, b, where = "") {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return where;
  if (a && typeof a === "object") {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      const d = firstDifference(a[k], b[k], `${where}.${k}`);
      if (d !== null) return d;
    }
    return null;
  }
  return a === b ? null : where;
}

async function main() {
  const { compare, port } = args();
  fs.mkdirSync(OUT, { recursive: true });
  const current = await recordTree(ROOT, port, "current");
  if (!compare) {
    process.stdout.write(`recorded ${path.relative(ROOT, current)}\n`);
    return;
  }
  const { dir, sha } = worktreeFor(compare);
  let baseline;
  try {
    baseline = await recordTree(dir, port + 1, `ref-${sha.slice(0, 12)}`);
  } finally {
    removeWorktree(dir);
  }
  const a = fs.readFileSync(baseline, "utf8");
  const b = fs.readFileSync(current, "utf8");
  if (a === b) {
    process.stdout.write(`research tool pages match ${compare} (${sha.slice(0, 12)}) byte for byte\n`);
    return;
  }
  const diff = firstDifference(JSON.parse(a), JSON.parse(b));
  process.stderr.write(`research tool pages differ from ${compare}; first difference at ${diff}\n`);
  process.stderr.write(`recordings: ${path.relative(ROOT, baseline)} ${path.relative(ROOT, current)}\n`);
  process.exit(1);
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(1);
});
