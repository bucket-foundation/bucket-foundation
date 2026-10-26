#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1000;
const H = 1500;

const H3 = (a, b, c) => `linear-gradient(${a} 0 33.3%,${b} 0 66.6%,${c} 0)`;
const V3 = (a, b, c) => `linear-gradient(90deg,${a} 0 33.3%,${b} 0 66.6%,${c} 0)`;

export const FLAGS = {
  fr: { n: "French", f: "Nunito", bg: V3("#002654", "#fff", "#CE1126") },
  he: { n: "Hebrew", f: "Noto Sans Hebrew", bg: "linear-gradient(#fff 0 14%,#0038B8 0 26%,#fff 0 74%,#0038B8 0 86%,#fff 0)" },
  el: { n: "Greek", f: "Noto Sans", bg: "linear-gradient(90deg,#0D5EAF 0 0) 0 0/40% 55.5% no-repeat,repeating-linear-gradient(#0D5EAF 0 11.1%,#fff 0 22.2%)" },
  ar: { n: "Arabic", f: "Noto Sans Arabic", bg: H3("#CE1126", "#fff", "#000") },
  hi: { n: "Hindi", f: "Noto Sans Devanagari", bg: H3("#FF9933", "#fff", "#138808") },
  zh: { n: "Chinese", f: "Noto Sans SC", bg: "#EE1C25" },
  es: { n: "Spanish", f: "Nunito", bg: "linear-gradient(#AA151B 0 25%,#F1BF00 0 75%,#AA151B 0)" },
  de: { n: "German", f: "Nunito", bg: H3("#000", "#DD0000", "#FFCE00") },
  it: { n: "Italian", f: "Nunito", bg: V3("#008C45", "#F4F5F0", "#CD212A") },
  ru: { n: "Russian", f: "Noto Sans", bg: H3("#fff", "#0039A6", "#D52B1E") },
  ja: { n: "Japanese", f: "Noto Sans JP", bg: "#fff" },
  ko: { n: "Korean", f: "Noto Sans KR", bg: "#fff" },
  pt: { n: "Portuguese", f: "Nunito", bg: "#009C3B" },
  tr: { n: "Turkish", f: "Nunito", bg: "#E30A17" },
  fa: { n: "Persian", f: "Noto Sans Arabic", bg: H3("#239F40", "#fff", "#DA0000") },
  vi: { n: "Vietnamese", f: "Noto Sans", bg: "#DA251D" },
  th: { n: "Thai", f: "Noto Sans Thai", bg: "linear-gradient(#A51931 0 16%,#F4F5F8 0 33%,#2D2A4A 0 66%,#F4F5F8 0 83%,#A51931 0)" },
};

const ORDER = ["es", "ja", "ar", "fr", "ru", "hi", "de", "zh", "he", "it", "ko", "el", "pt", "th", "tr", "fa", "vi"];

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;800&family=Space+Mono:wght@700&family=Noto+Sans:wght@400;800&family=Noto+Sans+Hebrew:wght@800&family=Noto+Sans+Arabic:wght@800&family=Noto+Sans+Devanagari:wght@800&family=Noto+Sans+SC:wght@800&family=Noto+Sans+JP:wght@800&family=Noto+Sans+KR:wght@800&family=Noto+Sans+Thai:wght@800&display=block";

const CORPUS = path.resolve(ROOT, "..", "learning", "app", "corpus");
const PIN_CATEGORIES = ["animal", "food", "nature", "body", "family", "object", "time"];

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(CORPUS, f), "utf8"));

export function credit(meta) {
  const v = /CC-BY-SA (\d+\.\d+)/.exec(meta?.license ?? "")?.[1];
  if (!v) throw new Error("lang-core.json meta.license names no CC-BY-SA version");
  return { text: `Words and pronunciation from Wiktionary via Kaikki, CC BY-SA ${v}`, url: `https://creativecommons.org/licenses/by-sa/${v}/` };
}

export function loadCredit() {
  return credit(readJson("lang-core.json").meta);
}

export function loadConcepts() {
  const atoms = new Map(readJson("lang-core.json").atoms.map((a) => [a.id, a]));
  const ipa = readJson("_build/gold/kaikki-ipa.json");
  const out = new Map();
  for (const c of readJson("_build/concepts.json").concepts) {
    const atom = atoms.get(c.id);
    if (c.pos !== "noun" || !atom || !PIN_CATEGORIES.includes(atom.category)) continue;
    const langs = new Map();
    for (const [lang, form] of Object.entries(atom.forms)) {
      if (!FLAGS[lang] || !form.word) continue;
      const w = form.word.split(/[,;/(]/)[0].trim();
      if (w) langs.set(lang, { lang, w, ipa: (form.ipa ?? ipa[lang]?.[w] ?? "").replace(/^[/[]+|[/\]]+$/g, "") });
    }
    out.set(c.id, { category: atom.category, langs });
  }
  return out;
}

export function pickTiles(langs, max = 6, turn = 0) {
  const start = (turn * max) % ORDER.length;
  const order = [...ORDER.slice(start), ...ORDER.slice(0, start)];
  return order.filter((l) => langs.has(l)).slice(0, max).map((l) => langs.get(l));
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function tile(t) {
  const f = FLAGS[t.lang];
  const n = [...t.w].length;
  const size = n <= 3 ? "" : n <= 7 ? "font-size:36px;" : n <= 10 ? "font-size:27px;" : "font-size:21px;";
  return `<div class="t tt" style="--flag:${f.bg}"><span class="cc">${f.n}</span><div class="wd"><b style="${size}font-family:'${f.f}'">${esc(t.w)}</b></div>${t.ipa ? `<i>/${esc(t.ipa)}/</i>` : ""}</div>`;
}

export function pinHtml(meaning, tiles, css, creditText) {
  return `<!doctype html><html><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>${css}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;background:#231F20;background-image:radial-gradient(#3a3335 1.4px,transparent 1.5px);background-size:32px 32px;font-family:Nunito,sans-serif;display:flex;flex-direction:column;align-items:center;padding:90px 70px 70px;overflow:hidden}
.k{font-family:'Space Mono';font-weight:700;font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:#E9A23B}
h1{font-family:Fredoka;font-weight:700;font-size:${meaning.length > 9 ? 96 : 128}px;line-height:1;color:#F6EEDC;margin:18px 0 10px;text-align:center}
.sub{font-size:30px;color:#cfc3a8}
.g{flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:${tiles.length > 4 ? 44 : 70}px 70px;align-content:center;justify-items:center;width:100%}
.g .t{zoom:${tiles.length > 4 ? 1.6 : 1.85}}
.f{font-family:Fredoka;font-weight:600;font-size:40px;color:#F6EEDC}
.f span{color:#D9381E}
.cr{margin-top:14px;font-size:20px;color:#9d927c}
</style></head><body><div class="k">one word, ${tiles.length} languages</div><h1>${esc(meaning)}</h1><div class="sub">How do you say it?</div><div class="g">${tiles.map(tile).join("")}</div><div class="f">polingual<span>.com</span></div><div class="cr">${esc(creditText)}</div></body></html>`;
}

function args(argv) {
  const o = { count: 12, out: path.join(ROOT, ".pins"), meanings: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count") o.count = Number(argv[++i]);
    else if (argv[i] === "--out") o.out = path.resolve(argv[++i]);
    else if (argv[i] === "--meaning") o.meanings.push(argv[++i].toLowerCase());
  }
  return o;
}

export function defaultPins(concepts, count) {
  const usable = [...concepts.entries()].filter(([, c]) => c.langs.size >= 4);
  const step = Math.max(1, Math.floor(usable.length / count));
  return usable.filter((_, i) => i % step === 0).slice(0, count).map(([k, c]) => [k, c.langs]);
}

async function main() {
  const o = args(process.argv.slice(2));
  const concepts = loadConcepts();
  const chosen = o.meanings.length
    ? o.meanings.map((k) => [k, concepts.get(k)?.langs]).filter(([, m]) => m && m.size >= 4)
    : defaultPins(concepts, o.count);
  const cr = loadCredit();
  const css = fs.readFileSync(path.join(ROOT, "public", "d8", "tiles.css"), "utf8");
  fs.mkdirSync(o.out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  for (const [turn, [meaning, langs]] of chosen.entries()) {
    const tiles = pickTiles(langs, 6, turn);
    await page.setContent(pinHtml(meaning, tiles, css, cr.text), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(o.out, `pin-${meaning.replace(/\s+/g, "-")}.png`);
    await page.screenshot({ path: file });
    fs.writeFileSync(file.replace(/\.png$/, ".txt"), `${meaning}: ${tiles.map((t) => `${FLAGS[t.lang].n} ${t.w}`).join(", ")}\n${cr.text}\nLicense: ${cr.url}\n`);
    console.log(file);
  }
  await browser.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
