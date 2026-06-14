/* Headless smoke test of the WIRED placement flow (bkt-efk).
 * Boots app.js against a minimal DOM shim, then drives the real UI:
 *   home → "Place me" CTA → question flow (answer correctly) → result → home,
 * and asserts:
 *   • the "Place me" CTA exists on a fresh branch,
 *   • answering correctly advances through questions,
 *   • placement seeds state (introduced > 0, none fully mastered),
 *   • the home "Continue learning" list starts PAST the foundations,
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

// ---------------- minimal DOM ----------------
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
    // Parse a lightweight child tree so querySelector("#id"/".cls"/"tag") works on
    // innerHTML-built markup (header()'s #branchPill, etc.). Good enough for the smoke.
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
    // strip simple tags from innerHTML for matching
    t += String(this._html || "").replace(/<[^>]+>/g, " ");
    return t;
  }
  setAttribute(k, v) { this.attrs[k] = v; if (k === "id") this._idAttr = v; }
  getAttribute(k) { return this.attrs[k]; }
  set id(v) { this._idAttr = v; }
  get id() { return this._idAttr; }
  set href(v) { this.attrs.href = v; } get href() { return this.attrs.href; }
  set type(v) { this.attrs.type = v; } get type() { return this.attrs.type; }
  set value(v) { this.attrs.value = v; } get value() { return this.attrs.value; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this); }
  addEventListener() {}
  _walk(fn) { fn(this); (this._htmlKids || []).forEach((c) => c._walk(fn)); this.children.forEach((c) => c._walk(fn)); }
  querySelector(sel) {
    // descendant combinator: match the LAST token, then verify an ancestor chain.
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
    // every preceding token must be matched by some ancestor, in order (loose).
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
    // supports "tag", ".cls", "#id", and chained ".a.b"
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
  URLSearchParams: globalThis.URLSearchParams,
  renderMathInElement: null,
};
win.window = win;

// ---------------- load scripts into the shim global ----------------
globalThis.window = win;
globalThis.document = document;
globalThis.localStorage = win.localStorage;
globalThis.location = win.location;

const corpus = JSON.parse(readFileSync(join(here, "corpus/biophysics.json"), "utf8"));
// URL-aware fetch so boot()'s manifest + corpus + art-cache requests all resolve.
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
  // run with `window`/`document`/`globalThis` all pointing at the shim
  new Function("window", "document", "globalThis", "localStorage", "location", "navigator", "fetch", code)
    .call(win, win, document, win, win.localStorage, win.location, win.navigator, fetchShim);
}
loadInto("js/fsrs.js");
loadInto("js/adaptive.js"); // adaptive core (encompassing + FIRe + proficiency) — must precede engine
loadInto("js/engine.js");
loadInto("js/diagnostic.js");
loadInto("js/app.js");

// fire DOMContentLoaded → boot()
await Promise.all(document._dcl.map((cb) => cb()));
// boot is async; give microtasks a tick to settle the corpus load
await new Promise((r) => setTimeout(r, 50));

function fail(msg) { console.error("SMOKE FAIL:", msg); }
let ok = 0;
function assert(name, cond) { if (cond) { console.log("  PASS", name); ok++; } else { fail(name); } }

// ---- 1. home renders with the Place-me CTA on a fresh branch ----
const E = win.__BA;
assert("engine booted with atoms", E && E.atoms && E.atoms.length > 0);
let cta = appRoot.querySelector(".place-cta");
assert("home shows the 'Place me' CTA on a fresh branch", !!cta);

// ---- 2. click it → diagnostic intro → start ----
cta.click();
let start = appRoot.querySelector(".diag-intro .btn");
assert("diagnostic intro renders with a Start button", !!start);
start.click();

// ---- 3. drive the question flow, answering CORRECTLY for low-prereq atoms ----
// We answer "I knew it" for prereq + shallow atoms (an expert), "I didn't" otherwise.
function depth(id, seen) {
  seen = seen || new Set();
  const a = E.byId[id]; if (!a || !(a.requires || []).length) return 0;
  let d = 0; (a.requires || []).forEach((r) => { if (E.byId[r] && !seen.has(r)) d = Math.max(d, 1 + depth(r, new Set(seen).add(id))); });
  return d;
}
let steps = 0, answeredCorrect = 0;
while (steps < 40) {
  const q = appRoot.querySelector(".diag-q");
  if (!q) break; // left the question flow (placing/result)
  steps++;
  // concept shown in .dq-concept; map back to atom by title
  const conceptText = appRoot.querySelector(".dq-concept").textContent.trim();
  const atom = E.atoms.find((a) => (a.title || "").trim() === conceptText);
  const knewIt = atom && (atom.shell === "prereq" || depth(atom.id) <= 2);
  // reveal then choose, exercising the real buttons
  const reveal = appRoot.querySelector(".diag-q .btn");
  if (reveal) reveal.click();
  const choiceBtn = appRoot.querySelector(knewIt ? ".dc.knew" : ".dc.didnt");
  if (!choiceBtn) break;
  if (knewIt) answeredCorrect++;
  choiceBtn.click();
  // diagAnswer uses setTimeout(360) before next question; flush it
  await new Promise((r) => setTimeout(r, 5));
  // fast-forward the placing delay
  await new Promise((r) => setTimeout(r, 400));
}
assert("question flow ran multiple questions", steps >= 5);
assert("answered several correctly (expert path)", answeredCorrect >= 3);

// ---- 4. result screen, then go home ----
const result = appRoot.querySelector(".diag-result");
assert("diagnostic result screen rendered", !!result);
const summaryAfter = E.summary();
assert("placement seeded introduced concepts", summaryAfter.introduced > 0);
assert("placement marked NOTHING fully mastered (honest)", summaryAfter.mastered < summaryAfter.introduced || summaryAfter.mastered === 0);

const startLearning = result && appRoot.querySelector(".diag-result .btn.primary");
if (startLearning) startLearning.click();

// ---- 5. home 'Continue learning' should start PAST the foundations ----
const cont = appRoot.querySelector(".route-list");
assert("home shows Continue learning after placement", !!cont);
const firstRow = appRoot.querySelector(".route-row .rtitle");
const firstTitle = firstRow ? firstRow.textContent.trim() : null;
const firstAtom = E.atoms.find((a) => (a.title || "").trim() === firstTitle);
// "past foundations" = the first suggested concept is no longer an unseen root prereq
const rootPrereqs = E.atoms.filter((a) => a.shell === "prereq" && !(a.requires || []).length);
const startsPastFoundations = firstAtom && !(rootPrereqs.some((p) => p.id === firstAtom.id && !E.cardFor(p.id)));
assert("Continue learning resumes past the placed foundations", !!startsPastFoundations);

// ---- 6. zero console errors ----
console.error = origError;
assert("zero console errors during the flow", errors.length === 0);
if (errors.length) errors.forEach((e) => origError("  console.error:", e));

console.log("\n" + (errors.length || ok < 11 ? "HEADLESS SMOKE FAILED" : "HEADLESS SMOKE PASSED"));
process.exit(errors.length || ok < 11 ? 1 : 0);
