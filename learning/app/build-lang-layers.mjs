#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CORPUS = path.join(HERE, "corpus");
const TOOLS = process.env.LANG_TOOLS_DIR;
const TATOEBA = process.env.TATOEBA_DIR;
if (!TOOLS || !TATOEBA) {
  console.error("usage: LANG_TOOLS_DIR=<dir with node_modules: pinyin-pro kuroshiro kuroshiro-analyzer-kuromoji> TATOEBA_DIR=<per-language exports> node build-lang-layers.mjs");
  process.exit(2);
}
const req = createRequire(path.join(TOOLS, "package.json"));

const LANGS = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ja", "zh", "ko", "hi", "ar"];
const ISO3 = { en: "eng", es: "spa", fr: "fra", it: "ita", pt: "por", de: "deu", nl: "nld", sv: "swe", pl: "pol", fi: "fin", ru: "rus", el: "ell", ja: "jpn", zh: "cmn", ko: "kor", hi: "hin", ar: "ara" };
const ESPEAK = { en: "en-us", es: "es", fr: "fr", it: "it", pt: "pt", de: "de", nl: "nl", sv: "sv", pl: "pl", fi: "fi", ru: "ru", el: "el", ko: "ko", hi: "hi", ar: "ar" };
const SENTENCES_PER = 3;
const MAX_LEN = 60;

const read = (f) => JSON.parse(fs.readFileSync(path.join(CORPUS, f), "utf8"));
const core = read("lang-core.json");
const phrases = read("lang-phrases.json");
const fixes = JSON.parse(fs.readFileSync(path.join(HERE, "lang-fixes.json"), "utf8"));

const words = core.atoms.map((a) => {
  const forms = {};
  for (const [l, f] of Object.entries(a.forms)) if (f?.word) forms[l] = f.word;
  for (const [l, m] of Object.entries(fixes.forms)) if (m[a.id]) forms[l] = m[a.id];
  return { id: a.id, category: a.category, forms };
});
const phraseItems = phrases.phrases.map((p) => ({ id: `ph-${p.id}`, category: p.category, forms: { ...p.forms } }));

const RU = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "'", э: "e", ю: "yu", я: "ya" };
export function translitRu(s) {
  return Array.from(s).map((c) => {
    const lo = c.toLowerCase();
    const t = RU[lo];
    if (t === undefined) return c;
    return c !== lo && t ? t[0].toUpperCase() + t.slice(1) : t;
  }).join("");
}

const EL1 = { α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o", ά: "á", έ: "é", ή: "í", ί: "í", ό: "ó", ύ: "ý", ώ: "ó", ϊ: "i", ϋ: "y", ΐ: "í", ΰ: "ý" };
const EL2 = [["ού", "oú"], ["ου", "ou"], ["αί", "é"], ["αι", "e"], ["εί", "í"], ["ει", "i"], ["οί", "í"], ["οι", "i"], ["μπ", "b"], ["ντ", "nt"], ["γκ", "gk"], ["γγ", "ng"], ["αυ", "av"], ["ευ", "ev"], ["αύ", "áv"], ["εύ", "év"]];
export function translitEl(s) {
  let out = "";
  const lo = s.toLowerCase();
  for (let i = 0; i < lo.length; ) {
    const two = lo.slice(i, i + 2);
    const hit = EL2.find(([g]) => g === two);
    if (hit) {
      out += hit[0] === "μπ" && i > 0 && /\p{L}/u.test(lo[i - 1]) ? "mp" : hit[1];
      i += 2;
      continue;
    }
    out += EL1[lo[i]] ?? lo[i];
    i++;
  }
  return out;
}

const HI_C = { क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ṅ", च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "ñ", ट: "ṭ", ठ: "ṭh", ड: "ḍ", ढ: "ḍh", ण: "ṇ", त: "t", थ: "th", द: "d", ध: "dh", न: "n", प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", व: "v", श: "sh", ष: "ṣh", स: "s", ह: "h" };
const HI_NUKTA = { क: "q", ख: "kh", ग: "gh", ज: "z", फ: "f", ड: "ṛ", ढ: "ṛh" };
const HI_V = { अ: "a", आ: "ā", इ: "i", ई: "ī", उ: "u", ऊ: "ū", ऋ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऑ: "o" };
const HI_M = { "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o" };
export function translitHi(s) {
  return s.split(/(\s+)/).map((w) => {
    let out = "";
    const cs = Array.from(w);
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (HI_C[c]) {
        let cons = HI_C[c];
        if (cs[i + 1] === "़") {
          cons = HI_NUKTA[c] ?? cons;
          i++;
        }
        const nx = cs[i + 1];
        if (nx === "्") {
          out += cons;
          i++;
        } else if (HI_M[nx]) {
          out += cons + HI_M[nx];
          i++;
        } else {
          const last = i === cs.length - 1 || !/[ऀ-ॿ]/.test(cs[i + 1] ?? "");
          out += cons + (last && out.length > 0 ? "" : "a");
        }
      } else if (HI_V[c]) out += HI_V[c];
      else if (c === "ं" || c === "ँ") out += "n";
      else if (c === "ः") out += "h";
      else if (c === "़") continue;
      else out += c;
    }
    return out;
  }).join("");
}

const AR_C = { ء: "ʼ", أ: "ʼ", إ: "ʼ", آ: "ʼā", ؤ: "ʼ", ئ: "ʼ", ا: "ā", ٱ: "", ب: "b", ت: "t", ث: "th", ج: "j", ح: "ḥ", خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "ṣ", ض: "ḍ", ط: "ṭ", ظ: "ẓ", ع: "ʿ", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y", ى: "ā", ة: "a" };
const AR_V = { "َ": "a", "ِ": "i", "ُ": "u", "ً": "an", "ٍ": "in", "ٌ": "un", "ْ": "" };
export function translitAr(s) {
  const cs = Array.from(s);
  let out = "";
  let lastVowel = "";
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c === "ّ") {
      const m = out.match(/(kh|sh|th|dh|gh|[^aiu])([aiu]?)$/u);
      if (m) out = out.slice(0, out.length - m[0].length) + m[1] + m[1] + m[2];
      continue;
    }
    if (c === "ة") {
      if (!/a$/.test(out)) out += "a";
      lastVowel = "";
      continue;
    }
    if (AR_V[c] !== undefined) {
      out += AR_V[c];
      lastVowel = AR_V[c];
      continue;
    }
    if (c === "ا" && lastVowel === "a") {
      out = out.slice(0, -1) + "ā";
      lastVowel = "";
      continue;
    }
    if (c === "و" && lastVowel === "u" && cs[i + 1] && AR_V[cs[i + 1]] === undefined) {
      out = out.slice(0, -1) + "ū";
      lastVowel = "";
      continue;
    }
    if (c === "ي" && lastVowel === "i" && cs[i + 1] && AR_V[cs[i + 1]] === undefined) {
      out = out.slice(0, -1) + "ī";
      lastVowel = "";
      continue;
    }
    if (c === "ا" && i === 0) {
      lastVowel = "";
      continue;
    }
    out += AR_C[c] ?? c;
    lastVowel = "";
  }
  return out.replace(/^al-?/, "al-").replace(/^ʼ/, "");
}

const KO_I = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const KO_M = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const KO_F = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
const KO_FL = ["", "g", "kk", "gs", "n", "nj", "nh", "d", "r", "lg", "lm", "lb", "ls", "lt", "lp", "lh", "m", "b", "bs", "s", "ss", "", "j", "ch", "k", "t", "p", "h"];
export function romanizeKo(s) {
  const cs = Array.from(s);
  let out = "";
  for (let i = 0; i < cs.length; i++) {
    const code = cs[i].codePointAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      out += cs[i];
      continue;
    }
    const ini = Math.floor(code / 588);
    const med = Math.floor((code % 588) / 28);
    const fin = code % 28;
    out += KO_I[ini] + KO_M[med];
    const next = cs[i + 1];
    const nextCode = next ? next.codePointAt(0) - 0xac00 : -1;
    const nextIni = nextCode >= 0 && nextCode <= 11171 ? Math.floor(nextCode / 588) : -1;
    if (fin) out += nextIni === 11 && fin !== 21 ? KO_FL[fin] : KO_F[fin];
  }
  return out;
}

function ipa(lang, text) {
  const v = ESPEAK[lang];
  if (!v) return "";
  const r = spawnSync("espeak-ng", ["-q", "--ipa", "-v", v, text], { encoding: "utf8" });
  return (r.stdout || "").trim().replace(/\s+/g, " ");
}

const { pinyin } = req("pinyin-pro");
const Kuroshiro = req("kuroshiro").default ?? req("kuroshiro");
const KuromojiAnalyzer = req("kuroshiro-analyzer-kuromoji");
const kuroshiro = new Kuroshiro();
await kuroshiro.init(new KuromojiAnalyzer());
const kuromoji = req("kuromoji");
const dicPath = path.join(path.dirname(req.resolve("kuromoji/package.json")), "dict");
const tokenizer = await new Promise((res, rej) => kuromoji.builder({ dicPath }).build((e, t) => (e ? rej(e) : res(t))));

async function readingFor(lang, text) {
  if (lang === "zh") return { roman: pinyin(text, { toneType: "symbol" }) };
  if (lang === "ja") {
    const kana = await kuroshiro.convert(text, { to: "hiragana" });
    const roman = await kuroshiro.convert(text, { to: "romaji", mode: "spaced", romajiSystem: "hepburn" });
    return { kana, roman: roman.replace(/\s+/g, " ").trim() };
  }
  if (lang === "ko") return { roman: romanizeKo(text) };
  if (lang === "ru") return { roman: translitRu(text) };
  if (lang === "el") return { roman: translitEl(text) };
  if (lang === "hi") return { roman: translitHi(text) };
  if (lang === "ar") return /[ً-ْ]/.test(text) ? { roman: translitAr(text) } : {};
  return {};
}

const readings = {};
for (const item of [...words, ...phraseItems]) {
  const r = {};
  for (const [l, text] of Object.entries(item.forms)) {
    const one = await readingFor(l, text);
    const i = l === "zh" || l === "ja" ? "" : ipa(l, text);
    if (i) one.ipa = i;
    const fixed = fixes.romanization?.[l]?.[item.id];
    if (fixed) one.roman = fixed;
    if (Object.keys(one).length) r[l] = one;
  }
  readings[item.id] = r;
}
console.log(`[layers] readings for ${Object.keys(readings).length} items`);

function loadTsv(file, onRow) {
  return new Promise((resolve) => {
    const p = path.join(TATOEBA, file);
    if (!fs.existsSync(p)) return resolve(false);
    const rl = readline.createInterface({ input: fs.createReadStream(p), crlfDelay: Infinity });
    rl.on("line", (line) => onRow(line.split("\t")));
    rl.on("close", () => resolve(true));
  });
}

const links = {};
const engNeeded = new Set();
for (const l of LANGS.filter((x) => x !== "en")) {
  const m = new Map();
  await loadTsv(`eng-${ISO3[l]}_links.tsv`, ([a, b]) => {
    if (!m.has(b)) m.set(b, []);
    m.get(b).push(a);
    engNeeded.add(a);
  });
  links[l] = m;
}
const eng = new Map();
await loadTsv("eng_sentences.tsv", ([id, , text]) => {
  if (engNeeded.has(id) && text && text.length <= MAX_LEN) eng.set(id, text);
});
console.log(`[layers] ${eng.size} short English sentences linked`);

const VERB_SUFFIX = { fi: /(a|ä|da|dä|ta|tä)$/u, sv: /a$/u, pl: /(ć|ać|eć|ić|yć)$/u, ru: /(ть|ться|ти)$/u, el: /(ω|ώ|ω|άω|ομαι|άμαι)$/u, hi: /ना$/u, ko: /다$/u, ja: /[うくぐすつぬぶむるい]$/u };
const strip = (s) => s.normalize("NFD").replace(/[ً-ْٰ]/g, "").normalize("NFC");

function needles(item, lang) {
  const base = item.forms[lang];
  if (!base) return [];
  const out = new Set([base.toLowerCase()]);
  const conj = fixes.conjugation[item.id]?.[lang]?.present;
  if (conj) conj.forEach((f) => out.add(f.toLowerCase()));
  if (item.category === "verb" || item.category === "adjective") {
    const suf = VERB_SUFFIX[lang];
    const stem = suf ? base.replace(suf, "") : base.length > 4 ? base.slice(0, -1) : base;
    if (stem.length >= (["ja", "zh", "ko"].includes(lang) ? 1 : 3)) out.add("^" + stem.toLowerCase());
  }
  if (lang === "ar") return Array.from(out).map(strip);
  return Array.from(out);
}

const CJK = new Set(["ja", "zh", "ko"]);
const norm = (lang, text) => (lang === "ar" ? strip(text).toLowerCase() : text.toLowerCase());
const tokensOf = (t) => t.split(/[^\p{L}\p{M}'’-]+/u).filter(Boolean);

function buildIndex(lang, perEng) {
  const rows = [];
  const inv = new Map();
  for (const [e, text] of perEng) {
    const t = norm(lang, text);
    rows.push([e, t]);
    if (CJK.has(lang)) continue;
    for (const tok of new Set(tokensOf(t))) {
      if (!inv.has(tok)) inv.set(tok, []);
      inv.get(tok).push(e);
    }
  }
  return { rows, inv, keys: Array.from(inv.keys()) };
}

function matches(index, lang, list) {
  const out = new Set();
  for (const n of list) {
    const prefix = n.startsWith("^");
    const w = prefix ? n.slice(1) : n;
    if (CJK.has(lang) || w.includes(" ")) {
      for (const [e, t] of index.rows) if (t.includes(w)) out.add(e);
    } else if (prefix) {
      for (const k of index.keys) if (k.startsWith(w)) for (const e of index.inv.get(k)) out.add(e);
    } else for (const e of index.inv.get(w) ?? []) out.add(e);
  }
  return out;
}

const enRegex = new Map();
function englishHas(enText, en) {
  if (!en) return true;
  if (!enRegex.has(en)) {
    const w = en.toLowerCase().split(" ")[0];
    enRegex.set(en, new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es|ed|d|ing|'s)?\\b`, "i"));
  }
  return enRegex.get(en).test(enText);
}

const pool = {};
const byItem = {};
const engIndex = {};
const searchIndex = {};
for (const l of LANGS.filter((x) => x !== "en")) {
  const sents = new Map();
  await loadTsv(`${ISO3[l]}_sentences.tsv`, ([id, , text]) => {
    if (links[l].has(id) && text && text.length <= MAX_LEN) sents.set(id, text);
  });
  const perEng = new Map();
  for (const [id, text] of sents) for (const e of links[l].get(id) ?? []) if (eng.has(e)) {
    const prev = perEng.get(e);
    if (!prev || text.length < prev.length) perEng.set(e, text);
  }
  engIndex[l] = perEng;
  searchIndex[l] = buildIndex(l, perEng);
  console.log(`[layers] ${l}: ${perEng.size} aligned sentences`);
}

for (const item of words) {
  const row = {};
  for (const l of LANGS.filter((x) => x !== "en")) {
    const list = needles(item, l);
    if (!list.length) continue;
    const hits = [];
    for (const e of matches(searchIndex[l], l, list)) {
      if (!englishHas(eng.get(e), item.forms.en)) continue;
      hits.push([e, engIndex[l].get(e)]);
    }
    hits.sort((a, b) => a[1].length - b[1].length || (a[0] < b[0] ? -1 : 1));
    const pick = [];
    const texts = new Set();
    for (const [e, text] of hits) {
      if (pick.length >= SENTENCES_PER) break;
      const key = text.replace(/[\s.!?。！？]+$/u, "").toLowerCase();
      if (texts.has(key)) continue;
      texts.add(key);
      pick.push(e);
    }
    if (pick.length) row[l] = pick;
    for (const e of pick) pool[e] = pool[e] ?? {};
  }
  byItem[item.id] = row;
}

const rich = Array.from(eng.entries())
  .filter(([e, text]) => text.length <= 40 && LANGS.filter((l) => l !== "en" && engIndex[l]?.has(e)).length >= 8)
  .sort((a, b) => a[1].length - b[1].length);
for (const item of words) {
  const en = item.forms.en;
  const ids = [];
  for (const [e, text] of rich) {
    if (ids.length >= SENTENCES_PER) break;
    if (englishHas(text, en)) ids.push(e);
  }
  if (ids.length) {
    byItem[item.id].en = ids;
    for (const e of ids) pool[e] = pool[e] ?? {};
  }
}

for (const e of Object.keys(pool)) {
  const t = { en: eng.get(e) };
  for (const l of LANGS.filter((x) => x !== "en")) {
    const s = engIndex[l].get(e);
    if (s) t[l] = s;
  }
  const r = {};
  for (const [l, text] of Object.entries(t)) {
    const one = await readingFor(l, text);
    if (one.roman) r[l] = one.roman;
  }
  const tok = t.ja ? tokenizer.tokenize(t.ja).map((x) => x.surface_form) : undefined;
  pool[e] = { t, r, ...(tok ? { jaTokens: tok } : {}) };
}

const coverage = {};
for (const l of LANGS) {
  const n = words.filter((w) => (byItem[w.id][l]?.length ?? 0) >= SENTENCES_PER).length;
  const any = words.filter((w) => (byItem[w.id][l]?.length ?? 0) >= 1).length;
  coverage[l] = { three: n, any, of: words.length };
}
console.log("[layers] sentence coverage", JSON.stringify(coverage));

const out = {
  meta: {
    builder: "build-lang-layers.mjs",
    built: new Date().toISOString(),
    attribution: [
      "Example sentences from Tatoeba (tatoeba.org), CC-BY 2.0 FR. Each sentence keeps its Tatoeba number.",
      "IPA generated with eSpeak NG. Pinyin from pinyin-pro. Japanese readings from Kuroshiro with the Kuromoji dictionary.",
      "Corrections, gender and conjugation tables curated in lang-fixes.json.",
    ],
    coverage,
  },
  forms: fixes.forms,
  readings,
  sentences: { byItem, pool },
  gender: fixes.gender,
  conjugation: fixes.conjugation,
  persons: fixes.persons,
  falseFriends: fixes.falseFriends,
};
fs.writeFileSync(path.join(CORPUS, "lang-layers.json"), JSON.stringify(out));
console.log(`[layers] wrote lang-layers.json, ${(fs.statSync(path.join(CORPUS, "lang-layers.json")).size / 1024).toFixed(0)} KB, ${Object.keys(pool).length} sentences`);
