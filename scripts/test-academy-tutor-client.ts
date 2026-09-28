import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const APP = path.join(__dirname, "..", "learning", "app", "js");

class FakeElement {
  tagName: string;
  className = "";
  innerHTML = "";
  children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  attributes: Record<string, string> = {};
  style: Record<string, string> = {};
  value = "";
  type = "";
  placeholder = "";
  maxLength = 0;
  disabled = false;
  scrollTop = 0;
  scrollHeight = 0;
  onclick: ((e: unknown) => void) | null = null;
  onsubmit: ((e: unknown) => void) | null = null;
  classList = { add: () => undefined, remove: () => undefined };
  constructor(tag: string) {
    this.tagName = tag;
  }
  appendChild(child: FakeElement) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child: FakeElement) {
    this.children = this.children.filter((c) => c !== child);
    child.parentNode = null;
    return child;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
  setAttribute(k: string, v: string) {
    this.attributes[k] = v;
  }
  focus() {}
  all(): FakeElement[] {
    return [this, ...this.children.flatMap((c) => c.all())];
  }
  text(): string {
    return this.all().map((e) => e.innerHTML).join(" ");
  }
}

interface FetchCall {
  url: string;
  init: { method: string; headers: Record<string, string>; credentials?: string; body: string };
}

function load(opts: { token: string | null; enabled?: boolean; status?: number; data?: unknown }) {
  const body = new FakeElement("body");
  const calls: FetchCall[] = [];
  const opened: string[] = [];
  const document = {
    body,
    createElement: (t: string) => new FakeElement(t),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  const window: Record<string, unknown> = {
    document,
    setTimeout: (fn: () => void) => fn(),
    fetch: async (url: string, init: FetchCall["init"]) => {
      calls.push({ url, init });
      return { status: opts.status ?? 200, json: async () => opts.data ?? { reply: "Try this first.", citations: [] } };
    },
    BucketAuth: { enabled: opts.enabled ?? true, accessToken: () => opts.token, state: () => ({ enabled: true }) },
    BucketAuthUI: { open: () => opened.push("open") },
  };
  window.window = window;
  const ctx = vm.createContext({ ...window, window, document, setTimeout: window.setTimeout, fetch: window.fetch, console });
  vm.runInContext(fs.readFileSync(path.join(APP, "tutor.js"), "utf8"), ctx);
  const tutor = window.BucketTutor as { open: (o: unknown) => void };
  tutor.open({ atom: { id: "newton-2", title: "Newton's second law", summary: "S", lesson: "L" }, branch: "02-physics", byId: {} });
  const find = (cls: string) => body.all().find((e) => e.className === cls)!;
  async function ask(q: string) {
    find("tutor-input").value = q;
    find("tutor-form").onsubmit!({ preventDefault: () => undefined });
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  }
  return { body, calls, opened, ask, find };
}

test("the tutor sends the session Bearer token and no grounding", async () => {
  const t = load({ token: "tok-1" });
  await t.ask("Why?");
  assert.equal(t.calls.length, 1);
  assert.equal(t.calls[0].url, "/api/academy/tutor");
  assert.equal(t.calls[0].init.headers.Authorization, "Bearer tok-1");
  assert.equal(t.calls[0].init.credentials, "omit");
  const sent = JSON.parse(t.calls[0].init.body);
  assert.deepEqual(Object.keys(sent).sort(), ["atomId", "branch", "history", "question"]);
  assert.match(t.body.text(), /Try this first\./);
});

test("with no session the tutor shows the sign-in prompt and makes no request", async () => {
  const t = load({ token: null });
  await t.ask("Why?");
  assert.equal(t.calls.length, 0);
  assert.match(t.body.text(), /Sign in to ask the tutor\./);
  t.find("tutor-signin").onclick!({});
  assert.deepEqual(t.opened, ["open"]);
});

test("with sign-in off the prompt explains the tutor is unavailable", async () => {
  const t = load({ token: null, enabled: false });
  await t.ask("Why?");
  assert.match(t.body.text(), /Sign-in is off in this build/);
  assert.equal(t.body.all().some((e) => e.className === "tutor-signin"), false);
});

test("a 401 shows the sign-in prompt", async () => {
  const t = load({ token: "expired", status: 401, data: { error: "Sign in to use the tutor.", signIn: true } });
  await t.ask("Why?");
  assert.match(t.body.text(), /Sign in to ask the tutor\./);
});

test("a 429 shows the server's limit message", async () => {
  const t = load({ token: "tok", status: 429, data: { error: "Daily tutor limit reached (60). Try again after midnight UTC." } });
  await t.ask("Why?");
  assert.match(t.body.text(), /Daily tutor limit reached \(60\)/);
});

test("a 503 for a missing key shows the not-enabled notice, other 503s a plain message", async () => {
  const off = load({ token: "tok", status: 503, data: { error: "Tutor isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY)." } });
  await off.ask("Why?");
  assert.match(off.body.text(), /Tutor not enabled yet/);
  const down = load({ token: "tok", status: 503, data: { error: "Tutor usage limits are unavailable on the server." } });
  await down.ask("Why?");
  assert.match(down.body.text(), /The tutor is unavailable right now/);
});

test("auth.js exposes accessToken and auth-ui.js exposes open", () => {
  const ctx = vm.createContext({ localStorage: { length: 0, key: () => null, getItem: () => null, setItem: () => undefined }, console });
  (ctx as Record<string, unknown>).window = ctx;
  vm.runInContext(fs.readFileSync(path.join(APP, "auth.js"), "utf8"), ctx);
  const auth = (ctx as unknown as { BucketAuth: { accessToken: () => string | null } }).BucketAuth;
  assert.equal(typeof auth.accessToken, "function");
  assert.equal(auth.accessToken(), null);
  vm.runInContext(fs.readFileSync(path.join(APP, "auth-ui.js"), "utf8"), ctx);
  const ui = (ctx as unknown as { BucketAuthUI: { open: () => void } }).BucketAuthUI;
  assert.equal(typeof ui.open, "function");
  ui.open();
});

test("sync-academy ships the tutor and auth scripts to public/academy-app", () => {
  const sync = fs.readFileSync(path.join(__dirname, "sync-academy.mjs"), "utf8");
  assert.match(sync, /join\(root, "learning", "app"\)/);
  assert.match(sync, /join\(root, "public", "academy-app"\)/);
  const excluded = sync.slice(sync.indexOf("new Set(["), sync.indexOf("]);"));
  for (const f of ["tutor.js", "auth.js", "auth-ui.js", "js"]) assert.ok(!excluded.includes(`"${f}"`), `${f} is excluded from the sync`);
  const copy = path.join(__dirname, "..", "public", "academy-app", "js", "tutor.js");
  if (fs.existsSync(copy)) {
    const fresh = fs.statSync(copy).mtimeMs >= fs.statSync(path.join(APP, "tutor.js")).mtimeMs;
    if (fresh) assert.equal(fs.readFileSync(copy, "utf8"), fs.readFileSync(path.join(APP, "tutor.js"), "utf8"));
  }
});
