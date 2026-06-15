/* Headless smoke test of the WIRED "Test yourself" assessment flow (bkt-v7y).
 * Boots app.js against a minimal DOM shim (same harness as test-headless-flow.mjs),
 * seeds some practice progress, then drives the REAL assessment UI:
 *   progress → "Test yourself" CTA → intro → sealed question → submit →
 *   deterministic verdict (auto-graded) → … → results summary,
 * and asserts:
 *   • the "Test yourself" CTA appears on Progress once concepts are started,
 *   • a sealed question renders an input (answer hidden until submit),
 *   • a correct numeric/symbolic answer is AUTO-GRADED correct (deterministic),
 *   • the results summary shows score + trust split + weak-concept links to Study,
 *   • the firewall log (bucket-academy/assess/<branch>) is written separately,
 *   • assessment feeds proficiency (tested attempts recorded via grade path),
 *   • ZERO console errors throughout.
 * No browser, no jsdom — a compact element shim sufficient for app.js.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(" ")); origError("[captured]", ...a); };

// ---------------- minimal DOM (shared shape with test-headless-flow.mjs) ----------------
let nextId = 1;
class Node {
  constructor(tag) {
    this.tagName = (tag || "").toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._cls = new Set();
    this._html = "";
    this._text = "";
    this.dataset = {};
    this.style = {};
    this.attrs = {};
    this._id = nextId++;
    this.onclick = null;
    this.onchange = null;
    this.onkeydown = null;
  }
  set className(v) { this._cls = new Set(String(v || "").split(/\s+/).filter(Boolean)); }
  get className() { return [...this._cls].join(" "); }
  get classList() {
    const s = this._cls;
    return {
      add: (...c) => c.forEach((x) => s.add(x)),
      remove: (...c) => c.forEach((x) => s.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !s.has(c); f ? s.add(c) : s.delete(c); return f; },
      contains: (c) => s.has(c),
    };
  }
  set innerHTML(v) {
    this._html = String(v);
    // setting innerHTML replaces ALL existing content — clear appended children too,
    // so mount()'s `root.innerHTML = ""` actually tears down the previous screen.
    this.children = [];
    this._htmlKids = [];
    const re = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    let m;
    while ((m = re.exec(this._html))) {
      const n = new Node(m[1]);
      const attrs = m[2] || "";
      const idM = /\bid="([^"]+)"/.exec(attrs);
      const clM = /\bclass="([^"]+)"/.exec(attrs);
      if (idM) n.id = idM[1];
      if (clM) n.className = clM[1];
      n.parentNode = this;
      this._htmlKids.push(n);
    }
  }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); }
  get textContent() {
    let t = this._text || "";
    this.children.forEach((c) => (t += c.textContent || ""));
    t += String(this._html || "").replace(/<[^>]+>/g, " ");
    return t;
  }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "id") this._idAttr = v; }
  getAttribute(k) { return this.attrs[k]; }
  set id(v) { this._idAttr = v; }
  get id() { return this._idAttr; }
  set href(v) { this.attrs.href = v; } get href() { return this.attrs.href; }
  set type(v) { this.attrs.type = v; } get type() { return this.attrs.type; }
  set value(v) { this.attrs.value = v; } get value() { return this.attrs.value == null ? "" : this.attrs.value; }
  focus() {} blur() {}
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this); }
  addEventListener() {}
  _walk(fn) { fn(this); (this._htmlKids || []).forEach((c) => c._walk(fn)); this.children.forEach((c) => c._walk(fn)); }
  querySelector(sel) {
    const tokens = sel.trim().split(/\s+/);
    let found = null;
    this._walk((n) => {
      if (found) return;
      if (n._matchesToken(tokens[tokens.length - 1]) && n._ancestorChain(tokens.slice(0, -1))) found = n;
    });
    return found;
  }
  querySelectorAll(sel) {
    const tokens = sel.trim().split(/\s+/);
    const out = [];
    this._walk((n) => {
      if (n._matchesToken(tokens[tokens.length - 1]) && n._ancestorChain(tokens.slice(0, -1))) out.push(n);
    });
    return out;
  }
  _ancestorChain(tokens) {
    let cur = this.parentNode;
    for (let i = tokens.length - 1; i >= 0; i--) {
      let hit = null, p = cur;
      while (p) { if (p._matchesToken(tokens[i])) { hit = p; break; } p = p.parentNode; }
      if (!hit) return false;
      cur = hit.parentNode;
    }
    return true;
  }
  _matchesToken(tok) {
    const parts = tok.match(/(^[a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)/);
    if (!parts) return false;
    if (parts[1] && this.tagName !== parts[1].toUpperCase()) return false;
    const sub = (parts[2] || "").match(/[.#][\w-]+/g) || [];
    return sub.every((s) => (s[0] === "#" ? this.id === s.slice(1) : this._cls.has(s.slice(1))));
  }
  _matches(sel) { return this._matchesToken(sel); }
  click() { if (typeof this.onclick === "function") this.onclick({ target: this }); }
}

const document = {
  _dcl: [],
  createElement: (t) => new Node(t),
  createElementNS: (_ns, t) => { const n = new Node(t); n.namespaceURI = _ns; return n; },
  querySelector: (s) => document.body.querySelector(s),
  getElementById: (id) => document.body.querySelector("#" + id),
  addEventListener: (ev, cb) => { if (ev === "DOMContentLoaded") document._dcl.push(cb); },
  body: new Node("body"),
};
const appRoot = new Node("div");
appRoot.id = "app";
document.body.appendChild(appRoot);

const store = {};
const win = {
  document,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  },
  location: { search: "" },
  scrollTo: () => {},
  addEventListener: () => {},
  navigator: {},
  confirm: () => true,
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (cb) => cb(),
  URLSearchParams: globalThis.URLSearchParams,
  renderMathInElement: null,
};
win.window = win;

globalThis.window = win;
globalThis.document = document;
globalThis.localStorage = win.localStorage;
globalThis.location = win.location;
globalThis.confirm = win.confirm;
globalThis.requestAnimationFrame = win.requestAnimationFrame;

const corpus = JSON.parse(readFileSync(join(here, "corpus/biophysics.json"), "utf8"));
const fetchShim = async (url) => {
  const u = String(url || "");
  if (u.includes("index.json")) {
    return { ok: true, json: async () => ({ decks: [{ id: "biophysics", file: "corpus/biophysics.json", pill: "V · Biophysics", sub: "Energy, matter & life" }] }) };
  }
  if (u.includes("art/cache/")) return { ok: false, json: async () => ({}) };
  return { ok: true, json: async () => corpus };
};
globalThis.fetch = fetchShim;
win.fetch = fetchShim;

function loadInto(rel) {
  const code = readFileSync(join(here, rel), "utf8");
  new Function("window", "document", "globalThis", "localStorage", "location", "navigator", "fetch", code)
    .call(win, win, document, win, win.localStorage, win.location, win.navigator, fetchShim);
}
loadInto("js/fsrs.js");
loadInto("js/adaptive.js");
loadInto("js/engine.js");
loadInto("js/diagnostic.js");
loadInto("js/assess.js");
loadInto("js/app.js");

await Promise.all(document._dcl.map((cb) => cb()));
await new Promise((r) => setTimeout(r, 50));

function fail(msg) { console.error("SMOKE FAIL:", msg); }
let ok = 0;
function assert(name, cond) { if (cond) { console.log("  PASS", name); ok++; } else { fail(name); } }

const E = win.__BA;
assert("engine + assess booted", !!(E && E.atoms && E.atoms.length && win.Assess));

// ---- seed some practice so the assessment universe (started concepts) is non-empty ----
// Pick a concept we KNOW is deterministically auto-gradable so we can prove an auto verdict.
const A = win.Assess;
function isAuto(q) { return A.gradeAnswer(q.answer, q.answer).gradable; }
const autoAtom = E.atoms.find((a) => (a.quiz || []).some(isAuto));
assert("found an auto-gradable concept in the corpus", !!autoAtom);
// introduce ~10 atoms incl. the auto one (practice grade path)
const seedAtoms = [autoAtom].concat(E.atoms.filter((a) => a !== autoAtom).slice(0, 9));
seedAtoms.forEach((a) => E.grade(a.id, 3, "recall"));

// ---- go to Progress and find the Test-yourself CTA ----
win.__BA && win.__BA; // noop
// re-render progress via the public router by clicking the Progress tab
// (app.js exposes go() only internally; navigate by re-running boot's go through tab)
const progressTab = appRoot.querySelectorAll(".tab").find ? null : null;
// simplest: call the diagnostic-style path — the app's nav buttons drive go("progress")
const tabs = appRoot.querySelectorAll(".tabbar .tab");
const progBtn = tabs[tabs.length - 1]; // [Learn, Map, Progress]
assert("progress tab present", !!progBtn);
progBtn.click();

const assessCta = appRoot.querySelector(".assess-cta");
assert("'Test yourself' CTA shows on Progress once concepts are started", !!assessCta);

// ---- start the assessment ----
assessCta.click();
const begin = appRoot.querySelector(".assess-intro .btn");
assert("assessment intro renders with a Begin button", !!begin);
begin.click();

// ---- drive the sealed question flow ----
let steps = 0, sawAutoVerdict = false, sawInput = false, sawSealed = false;
while (steps < 30) {
  const q = appRoot.querySelector(".assess-q");
  if (!q) break;
  steps++;
  const input = appRoot.querySelector(".assess-input");
  if (input) {
    sawInput = true;
    // SEALED: the solution must NOT be on screen before we submit.
    if (!appRoot.querySelector(".assess-q .answer")) sawSealed = true;
    // figure out which atom/level this is, to feed the right canonical answer
    const conceptText = appRoot.querySelector(".dq-concept").textContent.trim();
    const atom = E.atoms.find((a) => (a.title || "").trim() === conceptText);
    const lvlText = appRoot.querySelector(".diag-step").textContent;
    let canonical = "";
    if (atom) {
      const q2 = (atom.quiz || []).find((x) => lvlText.includes(x.level)) || (atom.quiz || [])[0];
      canonical = q2 ? q2.answer : "";
    }
    // Type the EXACT canonical answer → a deterministic item must grade correct.
    input.value = canonical;
    const submit = appRoot.querySelector(".assess-q .btn.primary");
    submit.click();
  } else {
    // verdict screen — note whether it was auto-graded, then advance.
    if (appRoot.querySelector(".assess-trust.auto")) sawAutoVerdict = true;
    // either deterministic verdict (Next/See results) or a self-check choice
    const next = appRoot.querySelector(".assess-q .btn.primary");
    const selfYes = appRoot.querySelector(".diag-choice .dc.knew");
    if (next) next.click();
    else if (selfYes) selfYes.click();
    else break;
  }
  await new Promise((r) => setTimeout(r, 2));
}
assert("sealed question flow rendered an input", sawInput);
assert("answer was SEALED (hidden) before submit", sawSealed);
assert("at least one item was AUTO-GRADED deterministically", sawAutoVerdict);

// ---- results summary ----
const result = appRoot.querySelector(".assess-result");
assert("results summary screen rendered", !!result);
assert("results show a score (correct/total)", !!appRoot.querySelector(".assess-result h1"));
assert("results show the trust split (auto vs self)", !!appRoot.querySelector(".ar-trust .art-pill.auto"));

// weak-concept links to Study (may be empty if a perfect run; assert the section logic holds)
const weakRows = appRoot.querySelectorAll(".ar-weak .route-row");
const cleanNote = appRoot.querySelector(".ar-clean");
assert("results either list weak concepts to review OR show a clean-run note",
  weakRows.length > 0 || !!cleanNote);

// ---- firewall: a separate assess log was written ----
const branchKey = (E.meta && E.meta.branch) || "default";
const logRaw = store["bucket-academy/assess/" + branchKey];
assert("firewall: a separate assess log was persisted (namespaced by branch)", !!logRaw);
let logged = null;
try { logged = JSON.parse(logRaw); } catch (e) {}
assert("firewall log records a run with a trust split", !!(logged && logged.runs && logged.runs.length && logged.runs[logged.runs.length - 1].auto));

// ---- proficiency fed: the auto atom now has tested attempts via the grade path ----
const md = E.masteryDetail(autoAtom.id);
assert("assessment fed proficiency (tested attempts recorded)", md && md.attempts >= 1);

// ---- existing features still alive: leave results → Progress → nav each screen ----
const doneBtn = appRoot.querySelector(".assess-result .btn.primary"); // "Done" → progress
if (doneBtn) doneBtn.click();
assert("returns to Progress after the self-test (never blocks Study)", !!appRoot.querySelector(".screen.progress"));
let navTabs = appRoot.querySelectorAll(".tabbar .tab");
if (navTabs[0]) navTabs[0].click(); // Learn/home
assert("home re-renders after assessment", !!appRoot.querySelector(".screen.home"));
navTabs = appRoot.querySelectorAll(".tabbar .tab");
if (navTabs[1]) navTabs[1].click(); // map
assert("map re-renders after assessment", !!appRoot.querySelector(".screen.map"));
navTabs = appRoot.querySelectorAll(".tabbar .tab");
if (navTabs[0]) navTabs[0].click(); // back to home (study CTA lives here)
assert("Study & learn CTA still present (existing feature intact)", !!appRoot.querySelector(".hero .btn.primary"));

// ---- zero console errors ----
console.error = origError;
assert("zero console errors during the assessment flow", errors.length === 0);
if (errors.length) errors.forEach((e) => origError("  console.error:", e));

console.log("\n" + (errors.length || ok < 16 ? "ASSESS FLOW SMOKE FAILED" : "ASSESS FLOW SMOKE PASSED"));
process.exit(errors.length || ok < 20 ? 1 : 0);
