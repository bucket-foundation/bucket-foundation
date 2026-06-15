/* Headless smoke test of the Polingual word explorer (bkt-nhy).
 *
 * Boots app.js + polingual.js against a minimal DOM shim (same harness as
 * test-headless-flow.mjs / test-assess-flow.mjs) — NO `ws`, NO real Chrome, so
 * it runs in a clean checkout and GENUINELY gates the explorer logic. It drives
 * the REAL UI on the Languages branch into the explorer and asserts:
 *   • the explorer opens from the Languages study screen (the explore CTA),
 *   • looking up "light" resolves the English illumination headword,
 *   • the MEANING lens shows CROSS-LINGUAL semantic neighbors (>=2 distinct
 *     langs, at least one different from the source lang),
 *   • SOUND / SPELLING / ETYMOLOGY / TRANSLATIONS lenses each render content
 *     (rows OR an honest empty state),
 *   • tapping a neighbor NAVIGATES to a new word,
 *   • the CC-BY-SA / Wiktionary / Kaikki attribution is visible,
 *   • ZERO console errors throughout.
 * The Polingual engine runs over the REAL baked starter asset
 * (polingual/subset.json + vectors.bin), served through the fetch shim.
 */
import { readFileSync, existsSync } from "node:fs";
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
    this.onsubmit = null;
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
    // Parse a FLAT child list of opening tags AND capture the immediate text that
    // follows each opening tag (up to the next "<"). That text becomes the kid's
    // own textContent, so per-element reads like .xpl-surface / .xpl-row-lang work
    // (the explorer builds these spans via innerHTML, not appendChild).
    const re = /<([a-zA-Z][\w-]*)([^>]*)>([^<]*)/g;
    let m;
    while ((m = re.exec(this._html))) {
      const n = new Node(m[1]);
      const attrs = m[2] || "";
      const idM = /\bid="([^"]+)"/.exec(attrs);
      const clM = /\bclass="([^"]+)"/.exec(attrs);
      if (idM) n.id = idM[1];
      if (clM) n.className = clM[1];
      const inner = (m[3] || "").trim();
      if (inner) n._text = inner.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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
  dispatchEvent(ev) {
    const type = ev && ev.type;
    if (type === "submit" && typeof this.onsubmit === "function") this.onsubmit({ preventDefault() {}, target: this });
    return true;
  }
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

// Boot straight onto the Languages branch, study view (skips onboarding via onboard=0).
const store = {};
const win = {
  document,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  },
  location: { search: "?branch=lang-core&onboard=0&view=study" },
  scrollTo: () => {},
  addEventListener: () => {},
  navigator: {},
  confirm: () => true,
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (cb) => cb(),
  URLSearchParams: globalThis.URLSearchParams,
  renderMathInElement: null,
  // No LangAudio / IntersectionObserver: app.js feature-detects both and degrades.
};
win.window = win;

globalThis.window = win;
globalThis.document = document;
globalThis.localStorage = win.localStorage;
globalThis.location = win.location;
globalThis.confirm = win.confirm;
globalThis.requestAnimationFrame = win.requestAnimationFrame;

// ---- fetch shim: manifest + the REAL language corpus + the REAL polingual asset ----
const langCorpus = JSON.parse(readFileSync(join(here, "corpus/lang-core.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(here, "corpus/index.json"), "utf8"));
const subsetPath = join(here, "polingual/subset.json");
const vectorsPath = join(here, "polingual/vectors.bin");
const haveAsset = existsSync(subsetPath) && existsSync(vectorsPath);
if (!haveAsset) {
  origError("FAIL: polingual starter asset missing (polingual/subset.json + vectors.bin)");
  process.exit(1);
}
const subset = JSON.parse(readFileSync(subsetPath, "utf8"));
const vectorsBuf = readFileSync(vectorsPath);

// Track whether the LIVE proxy was ever attempted — proves the hybrid path
// reaches for the full index first. In this OFFLINE shim we make the proxy
// FAIL (network unreachable), which forces the subset fallback the test gates.
let proxyAttempts = 0;
const fetchShim = async (url) => {
  const u = String(url || "");
  // The hybrid explorer hits the same-origin full-index proxy first. There is
  // no network in this shim, so reject it like an offline device would — the
  // engine must then fall back to the baked subset (the path this test gates).
  if (u.includes("/api/polingual")) {
    proxyAttempts++;
    throw new TypeError("Failed to fetch"); // simulate offline / no proxy
  }
  if (u.includes("index.json")) return { ok: true, json: async () => manifest };
  if (u.includes("polingual/subset.json")) return { ok: true, json: async () => subset };
  if (u.includes("polingual/vectors.bin")) {
    // return an ArrayBuffer view of the real binary (polingual.js calls .arrayBuffer())
    const ab = vectorsBuf.buffer.slice(vectorsBuf.byteOffset, vectorsBuf.byteOffset + vectorsBuf.byteLength);
    return { ok: true, arrayBuffer: async () => ab };
  }
  if (u.includes("art/cache/")) return { ok: false, json: async () => ({}) };
  // default: the language corpus (DEFAULT_BRANCH resolves to lang-core via the deep link)
  return { ok: true, json: async () => langCorpus };
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
loadInto("js/polingual.js"); // defines window.Polingual (consumed lazily by app.js)
loadInto("js/app.js");

await Promise.all(document._dcl.map((cb) => cb()));
await new Promise((r) => setTimeout(r, 60));

function fail(msg) { console.error("SMOKE FAIL:", msg); }
let ok = 0;
function assert(name, cond) { if (cond) { console.log("  PASS", name); ok++; } else { fail(name); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 0. booted on the Languages branch ----
const E = win.__BA;
assert("engine booted on Languages branch", !!(E && E.meta && E.meta.kind === "language"));
assert("Polingual engine present", !!win.Polingual);

// ---- 1. the study screen exposes the explorer CTA ----
let exploreCta = appRoot.querySelector(".explore-cta");
if (!exploreCta) {
  // ensure we're on the lang study screen (view=study should have taken us there)
  const tabs = appRoot.querySelectorAll(".tabbar .tab");
  if (tabs[0]) tabs[0].click(); // home
  // home for a language branch has a "Study & learn" primary CTA → study
  const studyCta = appRoot.querySelector(".hero .btn.primary");
  if (studyCta) studyCta.click();
  exploreCta = appRoot.querySelector(".explore-cta");
}
assert("explorer CTA present on the Languages study screen", !!exploreCta);

// ---- 2. open the explorer ----
exploreCta.click();
let explorer = appRoot.querySelector(".explorer");
assert("explorer screen opened from the Languages branch", !!explorer);

// the engine asset loads lazily on open — wait for window.Polingual.ready()
for (let i = 0; i < 60; i++) {
  if (win.Polingual.ready()) break;
  await sleep(20);
}
assert("starter asset loaded", win.Polingual.ready());
if (win.Polingual.ready()) {
  const man = win.Polingual.manifest() || {};
  console.log("    (" + (man.words || "?") + " words, " +
    ((man.languages && man.languages.length) || "?") + " langs)");
}

// helper: poll until a selector appears (the explorer is now async — each lens
// and lookup is a Promise that tries the live proxy, fails over to the subset).
async function waitFor(sel, tries = 80, ms = 15) {
  for (let i = 0; i < tries; i++) {
    if (appRoot.querySelector(sel)) return appRoot.querySelector(sel);
    await sleep(ms);
  }
  return appRoot.querySelector(sel);
}

// ---- 3. look up "light" → resolves the English illumination headword ----
const input = appRoot.querySelector(".xpl-input");
assert("explorer search input present", !!input);
input.value = "light";
const form = appRoot.querySelector(".xpl-search");
if (form && typeof form.onsubmit === "function") form.onsubmit({ preventDefault() {}, target: form });
await waitFor(".xpl-card");

// the hybrid engine must have REACHED for the live full-index proxy first
// (before failing over to the baked subset in this offline shim).
assert("hybrid: live full-index proxy was attempted first", proxyAttempts > 0);

const card = appRoot.querySelector(".xpl-card");
assert("result card rendered for 'light'", !!card);
const surface = appRoot.querySelector(".xpl-surface");
const srcLang = appRoot.querySelector(".xpl-meta .xpl-lang");
const gloss = appRoot.querySelector(".xpl-gloss");
assert("card shows the surface word", !!surface && /light/i.test(surface.textContent));
assert("card resolves to the English headword", !!srcLang && /english/i.test(srcLang.textContent));
assert("card shows an illumination-sense gloss",
  !!gloss && /light|illumin|bright|electromagn|radiat/i.test(gloss.textContent));

// ---- 4. MEANING lens — must be CROSS-LINGUAL ----
// (meaning is the default lens; rows render async after the subset fallback)
await waitFor(".xpl-panel .xpl-row");
let rows = appRoot.querySelectorAll(".xpl-panel .xpl-row");
assert("meaning lens rendered neighbor rows", rows.length > 0);
const srcLangText = srcLang ? srcLang.textContent.trim() : "";
const meaningLangs = new Set();
let crossLingual = false;
rows.forEach((r) => {
  const l = (r.querySelector(".xpl-row-lang") || {}).textContent || "";
  meaningLangs.add(l.trim());
  if (l.trim() && l.trim() !== srcLangText) crossLingual = true;
});
assert("meaning neighbors span >=2 languages", meaningLangs.size >= 2);
assert("meaning neighbors are cross-lingual (>=1 differs from source)", crossLingual);

// helper: click a lens tab by label
function clickTab(rx) {
  const t = appRoot.querySelectorAll(".xpl-tab").find((x) => rx.test(x.textContent));
  if (t) t.click();
  return !!t;
}
function lensRendered() {
  // a lens "rendered" iff it produced rows OR an honest empty state OR ety
  // content — but NOT while it's still showing its async loading placeholder.
  if (appRoot.querySelector(".xpl-lens-loading")) return false;
  return appRoot.querySelectorAll(".xpl-panel .xpl-row").length > 0 ||
    !!appRoot.querySelector(".xpl-lens-empty") ||
    !!appRoot.querySelector(".xpl-ety") ||
    appRoot.querySelectorAll(".xpl-trans .xpl-row").length > 0;
}
async function waitLens(tries = 80, ms = 15) {
  for (let i = 0; i < tries; i++) { if (lensRendered()) return true; await sleep(ms); }
  return lensRendered();
}

// ---- 5. SOUND / SPELLING / ETYMOLOGY / TRANSLATIONS each render ----
assert("Sound tab exists", clickTab(/sound/i)); await waitLens();
assert("sound lens rendered (rows or honest empty)", lensRendered());

assert("Spelling tab exists", clickTab(/spelling/i)); await waitLens();
assert("spelling lens rendered", lensRendered());

assert("Etymology tab exists", clickTab(/etymology/i)); await waitLens();
assert("etymology lens rendered", lensRendered());

assert("Translations tab exists", clickTab(/translation/i)); await waitLens();
assert("translations lens rendered", lensRendered());

// ---- 6. neighbor tap NAVIGATES to a new word ----
clickTab(/meaning/i); await waitFor(".xpl-panel .xpl-row");
const beforeSurface = (appRoot.querySelector(".xpl-surface") || {}).textContent;
const beforeLang = (appRoot.querySelector(".xpl-meta .xpl-lang") || {}).textContent;
rows = appRoot.querySelectorAll(".xpl-panel .xpl-row");
// pick a neighbor whose (lang,surface) differs from the current word
let target = null;
for (const r of rows) {
  const s = (r.querySelector(".xpl-row-surface") || {}).textContent;
  const l = (r.querySelector(".xpl-row-lang") || {}).textContent;
  if (s !== beforeSurface || l !== beforeLang) { target = { r, s, l }; break; }
}
if (!target && rows.length) target = { r: rows[0], s: null, l: null };
assert("a navigable neighbor row exists", !!target);
if (target) {
  target.r.click();
  // navigation re-resolves the headword async (live-first → subset fallback);
  // it briefly shows a loading card with NO .xpl-surface — wait until the new
  // headword card has actually painted (surface present AND changed).
  for (let i = 0; i < 80; i++) {
    const sEl = appRoot.querySelector(".xpl-surface");
    const s = sEl ? sEl.textContent : "";
    const l = (appRoot.querySelector(".xpl-meta .xpl-lang") || {}).textContent;
    if (sEl && (s !== beforeSurface || l !== beforeLang)) break;
    await sleep(15);
  }
  const afterSurface = (appRoot.querySelector(".xpl-surface") || {}).textContent;
  const afterLang = (appRoot.querySelector(".xpl-meta .xpl-lang") || {}).textContent;
  const moved = afterSurface !== beforeSurface || afterLang !== beforeLang;
  assert("neighbor tap navigated to a new word", moved);
  if (target.s) assert("navigated to the tapped neighbor", afterSurface === target.s);
  else ok++; // no distinct neighbor to verify exact landing; movement already asserted
}

// ---- 7. attribution visible (CC-BY-SA / Wiktionary / Kaikki) ----
const attrib = appRoot.querySelector(".xpl-attrib");
const attribText = attrib ? attrib.textContent : "";
assert("attribution visible (CC-BY-SA + Wiktionary + Kaikki)",
  /CC-BY-SA/i.test(attribText) && /Wiktionary/i.test(attribText) && /Kaikki/i.test(attribText));

// ---- 8. zero console errors ----
console.error = origError;
assert("zero console errors during the explorer flow", errors.length === 0);
if (errors.length) errors.forEach((e) => origError("  console.error:", e));

const NEED = 21; // +1 for the hybrid "live proxy attempted first" assertion
console.log("\n" + (errors.length || ok < NEED ? "EXPLORER SMOKE FAILED" : "EXPLORER SMOKE PASSED"));
process.exit(errors.length || ok < NEED ? 1 : 0);
