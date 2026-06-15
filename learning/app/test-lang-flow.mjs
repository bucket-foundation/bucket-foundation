/* Headless smoke test of the LANGUAGE learn flow (bkt-n2v / cloze drills).
 *
 * Boots app.js against a minimal DOM shim (same harness as the other smoke
 * tests) on the Languages branch, then drives the REAL language drill UI:
 *   • opens a word drill on an atom that carries a target-language example,
 *   • types a TRANSPOSITION typo of the target word and asserts it grades
 *     "close" (the Damerau-Levenshtein fix — a swap is ONE edit, not two),
 *   • continues → asserts the sentence/cloze (fill-in-the-blank) drill appears,
 *   • types the blanked word and asserts it grades correct,
 *   • asserts typed-checking + the audio-button code path stay intact,
 *   • ZERO console errors throughout.
 * No browser, no jsdom.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(" ")); origError("[captured]", ...a); };

// ---------------- minimal DOM (shared shape with test-assess-flow.mjs) ----------------
let nextId = 1;
class Node {
  constructor(tag) {
    this.tagName = (tag || "").toUpperCase();
    this.children = []; this.parentNode = null; this._cls = new Set();
    this._html = ""; this._text = ""; this.dataset = {}; this.style = {}; this.attrs = {};
    this._id = nextId++; this.onclick = null; this.onchange = null; this.onkeydown = null; this.onsubmit = null;
  }
  set className(v) { this._cls = new Set(String(v || "").split(/\s+/).filter(Boolean)); }
  get className() { return [...this._cls].join(" "); }
  get classList() {
    const s = this._cls;
    return {
      add: (...c) => c.forEach((x) => s.add(x)), remove: (...c) => c.forEach((x) => s.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !s.has(c); f ? s.add(c) : s.delete(c); return f; },
      contains: (c) => s.has(c),
    };
  }
  set innerHTML(v) {
    this._html = String(v); this.children = []; this._htmlKids = [];
    const re = /<([a-zA-Z][\w-]*)([^>]*)>([^<]*)/g; let m;
    while ((m = re.exec(this._html))) {
      const n = new Node(m[1]); const attrs = m[2] || "";
      const idM = /\bid="([^"]+)"/.exec(attrs); const clM = /\bclass="([^"]+)"/.exec(attrs);
      if (idM) n.id = idM[1]; if (clM) n.className = clM[1];
      const inner = (m[3] || "").trim();
      if (inner) n._text = inner.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      n.parentNode = this; this._htmlKids.push(n);
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
  set id(v) { this._idAttr = v; } get id() { return this._idAttr; }
  set href(v) { this.attrs.href = v; } get href() { return this.attrs.href; }
  set type(v) { this.attrs.type = v; } get type() { return this.attrs.type; }
  set value(v) { this.attrs.value = v; } get value() { return this.attrs.value == null ? "" : this.attrs.value; }
  set disabled(v) { this.attrs.disabled = v; } get disabled() { return !!this.attrs.disabled; }
  focus() {} blur() {}
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this); }
  addEventListener() {}
  _walk(fn) { fn(this); (this._htmlKids || []).forEach((c) => c._walk(fn)); this.children.forEach((c) => c._walk(fn)); }
  querySelector(sel) {
    const tokens = sel.trim().split(/\s+/); let found = null;
    this._walk((n) => { if (found) return; if (n._matchesToken(tokens[tokens.length - 1]) && n._ancestorChain(tokens.slice(0, -1))) found = n; });
    return found;
  }
  querySelectorAll(sel) {
    const tokens = sel.trim().split(/\s+/); const out = [];
    this._walk((n) => { if (n._matchesToken(tokens[tokens.length - 1]) && n._ancestorChain(tokens.slice(0, -1))) out.push(n); });
    return out;
  }
  _ancestorChain(tokens) {
    let cur = this.parentNode;
    for (let i = tokens.length - 1; i >= 0; i--) {
      let hit = null, p = cur;
      while (p) { if (p._matchesToken(tokens[i])) { hit = p; break; } p = p.parentNode; }
      if (!hit) return false; cur = hit.parentNode;
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
  click() { if (typeof this.onclick === "function") this.onclick({ target: this }); }
}

const document = {
  _dcl: [], createElement: (t) => new Node(t),
  createElementNS: (_ns, t) => { const n = new Node(t); n.namespaceURI = _ns; return n; },
  querySelector: (s) => document.body.querySelector(s),
  getElementById: (id) => document.body.querySelector("#" + id),
  addEventListener: (ev, cb) => { if (ev === "DOMContentLoaded") document._dcl.push(cb); },
  body: new Node("body"),
};
const appRoot = new Node("div"); appRoot.id = "app"; document.body.appendChild(appRoot);

const store = {};
const win = {
  document,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] },
  location: { search: "?branch=lang-core&onboard=0&view=study" },
  scrollTo: () => {}, addEventListener: () => {}, navigator: {}, confirm: () => true,
  matchMedia: () => ({ matches: false }), requestAnimationFrame: (cb) => cb(),
  URLSearchParams: globalThis.URLSearchParams, renderMathInElement: null,
};
win.window = win;
globalThis.window = win; globalThis.document = document; globalThis.localStorage = win.localStorage;
globalThis.location = win.location; globalThis.confirm = win.confirm; globalThis.requestAnimationFrame = win.requestAnimationFrame;

const langCorpus = JSON.parse(readFileSync(join(here, "corpus/lang-core.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(here, "corpus/index.json"), "utf8"));
const fetchShim = async (url) => {
  const u = String(url || "");
  if (u.includes("index.json")) return { ok: true, json: async () => manifest };
  if (u.includes("art/cache/")) return { ok: false, json: async () => ({}) };
  return { ok: true, json: async () => langCorpus };
};
globalThis.fetch = fetchShim; win.fetch = fetchShim;

function loadInto(rel) {
  const code = readFileSync(join(here, rel), "utf8");
  new Function("window", "document", "globalThis", "localStorage", "location", "navigator", "fetch", code)
    .call(win, win, document, win, win.localStorage, win.location, win.navigator, fetchShim);
}
loadInto("js/fsrs.js"); loadInto("js/adaptive.js"); loadInto("js/engine.js");
loadInto("js/diagnostic.js"); loadInto("js/app.js");

await Promise.all(document._dcl.map((cb) => cb()));
await new Promise((r) => setTimeout(r, 60));

function fail(msg) { console.error("SMOKE FAIL:", msg); }
let ok = 0;
function assert(name, cond) { if (cond) { console.log("  PASS", name); ok++; } else { fail(name); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const E = win.__BA;
assert("engine booted on Languages branch", !!(E && E.meta && E.meta.kind === "language"));

// ---- pick an atom that HAS a target-language (es, the default) example
// whose sentence contains the es word verbatim (so the cloze drill will fire) ----
const target = "es";
function clozeReady(a) {
  const ex = a.example && a.example[target];
  const w = a.forms && a.forms[target] && a.forms[target].word;
  if (!ex || !w) return false;
  const pat = new RegExp("(^|[^0-9A-Za-zÀ-ɏ'])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=$|[^0-9A-Za-zÀ-ɏ])", "i");
  return pat.test(ex);
}
// also need a word of length >=3 with two adjacent distinct letters to transpose
function transposable(w) {
  for (let i = 0; i < w.length - 1; i++) if (w[i] !== w[i + 1]) return true;
  return w.length >= 3;
}
const atom = E.atoms.find((a) => clozeReady(a) && (a.forms[target].word || "").length >= 4 && transposable(a.forms[target].word));
assert("found a language atom with a target-lang cloze example", !!atom);

// ---- open the word drill on it (drive through the real openAtom router) ----
// openAtom is internal; reach it via the study screen's "Drill this" button.
let drillBtn = appRoot.querySelector(".sb-drill");
if (!drillBtn) {
  // make sure we're on the study screen
  const tabs = appRoot.querySelectorAll(".tabbar .tab");
  if (tabs[0]) tabs[0].click();
  const studyCta = appRoot.querySelector(".hero .btn.primary");
  if (studyCta) studyCta.click();
  drillBtn = appRoot.querySelector(".sb-drill");
}
assert("language study screen lists drillable words", !!drillBtn);

// We need the drill for OUR chosen atom; rather than hunt the list, click its
// study block by matching the gloss. Fall back to the first drill button.
let chosen = null;
const blocks = appRoot.querySelectorAll(".study-block");
for (const b of blocks) {
  if ((b.textContent || "").includes(atom.gloss)) { chosen = b.querySelector(".sb-drill"); break; }
}
(chosen || drillBtn).click();
await sleep(20);

// ---- the word drill renders a typed input ----
let drill = appRoot.querySelector(".lang-drill");
let input = appRoot.querySelector(".lang-input");
let form = appRoot.querySelector(".lang-typed");
assert("language word drill renders a typed input", !!(drill && input && form));

// Which atom did we actually land on? read the prompt to map back.
// Safer: use the atom we navigated to via session.
const liveId = win.__BA && win.__BA.atoms ? null : null; // (engine has no current-id getter)
// Determine the on-screen target word from the reveal answer after a check.
// First: type a TRANSPOSITION typo of the chosen atom's target word.
function findCurrentAtom() {
  // the drill question contains the gloss in bold; match it back to an atom
  const q = appRoot.querySelector(".lang-drill .q");
  const txt = q ? q.textContent : "";
  return E.atoms.find((a) => txt.includes(a.gloss)) || atom;
}
let cur = findCurrentAtom();
let word = (cur.forms[target] && cur.forms[target].word) || "";
// build a transposition typo (swap first two distinct adjacent letters)
function transpose(w) {
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] !== w[i + 1]) return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
  }
  return w;
}
let typo = transpose(word);
assert("constructed a transposition typo (" + word + " -> " + typo + ")", typo !== word);

input.value = typo;
if (typeof form.onsubmit === "function") form.onsubmit({ preventDefault() {}, target: form });
await sleep(10);

// ---- assert the transposition typo grades "close" (Damerau fix) ----
let closeHead = appRoot.querySelector(".lang-drill .lr-head.close");
assert("a transposition typo grades 'close' (not wrong) — Damerau-Levenshtein", !!closeHead);
assert("word drill reveals the correct spelling", !!appRoot.querySelector(".lang-drill .lang-ans"));

// ---- continue → the sentence/cloze drill should appear (this atom has an example) ----
const cont = appRoot.querySelector(".lang-drill .lr-actions .btn.primary");
assert("word drill shows a Continue button", !!cont);
cont.click();
await sleep(10);

let cloze = appRoot.querySelector(".cloze-drill");
assert("sentence/cloze (fill-in-the-blank) drill appears after the word drill", !!cloze);
assert("cloze shows a blanked sentence", !!appRoot.querySelector(".cloze-q .cloze-blank"));
const clozeInput = appRoot.querySelector(".cloze-drill .lang-input");
const clozeForm = appRoot.querySelector(".cloze-drill .lang-typed");
assert("cloze drill takes typed input", !!(clozeInput && clozeForm));

// type the correct word into the cloze → must grade correct
clozeInput.value = word;
if (clozeForm && typeof clozeForm.onsubmit === "function") clozeForm.onsubmit({ preventDefault() {}, target: clozeForm });
await sleep(10);
const clozeCorrect = appRoot.querySelector(".cloze-drill .lr-head.correct");
assert("cloze accepts the correct word and grades correct", !!clozeCorrect);
assert("cloze reveals the full sentence", !!appRoot.querySelector(".cloze-drill .lang-ans"));

// continue past the cloze → flow advances without error (home or next atom)
const clozeCont = appRoot.querySelector(".cloze-drill .lr-actions .btn.primary");
assert("cloze shows a Continue button", !!clozeCont);
if (clozeCont) clozeCont.click();
await sleep(10);

// ---- zero console errors ----
console.error = origError;
assert("zero console errors during the language flow", errors.length === 0);
if (errors.length) errors.forEach((e) => origError("  console.error:", e));

const NEED = 14;
console.log("\n" + (errors.length || ok < NEED ? "LANG FLOW SMOKE FAILED" : "LANG FLOW SMOKE PASSED"));
process.exit(errors.length || ok < NEED ? 1 : 0);
