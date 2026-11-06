import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIO_FILE } from "./build_words.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WORDS_FILE = join(HERE, "../src/data/words.json");
const UA = "PolingualWordAudio/1.0 (https://polingual.com; gianyrox@gmail.com)";

export const KAIKKI_LANG = {
  en: "English", es: "Spanish", fr: "French", it: "Italian", pt: "Portuguese", de: "German", nl: "Dutch", sv: "Swedish",
  ru: "Russian", ja: "Japanese", ar: "Arabic", el: "Greek", fi: "Finnish", hi: "Hindi", ko: "Korean", pl: "Polish",
  zh: "Chinese", ang: "Old English", cs: "Czech", fa: "Persian", grc: "Ancient Greek", he: "Hebrew", id: "Indonesian",
  la: "Latin", sa: "Sanskrit", ta: "Tamil", th: "Thai", tr: "Turkish", vi: "Vietnamese",
};

const STRIP = {
  ar: /[ً-ٰٟـ]/g,
  fa: /[ً-ٰٟـ]/g,
  he: /[֑-ׇֽֿׁׂׅׄ]/g,
  ru: /[̀́]/g,
  la: /[̄̆]/g,
  grc: /[̄̆]/g,
  ang: /[̄̆̇]/g,
};

export function pageTitle(lang, word) {
  const strip = STRIP[lang];
  const w = word.trim();
  return strip ? w.normalize("NFD").replace(strip, "").normalize("NFC") : w;
}

export function kaikkiUrl(lang, word) {
  const name = KAIKKI_LANG[lang];
  if (!name) return undefined;
  const title = pageTitle(lang, word);
  const cps = [...title];
  const seg = (s) => encodeURIComponent(s);
  return `https://kaikki.org/dictionary/${seg(name)}/meaning/${seg(cps[0])}/${seg(cps.slice(0, 2).join(""))}/${seg(title)}.jsonl`;
}

const ZH_OTHER = /cantonese|hokkien|teochew|hakka|wu\b|shanghainese|min\b|taiwanese/i;

export function pickSound(entries, lang) {
  const seen = new Set();
  const sounds = [];
  for (const e of entries) {
    for (const s of e.sounds || []) {
      if (!s.audio || !s.mp3_url || seen.has(s.audio)) continue;
      seen.add(s.audio);
      sounds.push(s);
    }
  }
  const ok = lang === "zh" ? sounds.filter((s) => !ZH_OTHER.test([...(s.tags || []), s.audio].join(" "))) : sounds;
  const s = ok[0];
  return s ? { file: s.audio, src: s.mp3_url } : undefined;
}

export function plainArtist(html) {
  if (!html) return undefined;
  const text = html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 80 ? `${text.slice(0, 77).trim()}...` : text || undefined;
}

export function credit(meta) {
  if (!meta) return undefined;
  const license = meta.LicenseShortName?.value?.trim();
  if (!license) return undefined;
  const out = { license };
  const by = plainArtist(meta.Artist?.value);
  if (by) out.by = by;
  const url = meta.LicenseUrl?.value?.trim();
  if (url) out.licenseUrl = url.replace(/^\/\//, "https://");
  return out;
}

export function commonsName(file) {
  const name = file.trim().replace(/ /g, "_");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function commonsMp3(file) {
  const name = commonsName(file);
  const h = createHash("md5").update(name).digest("hex");
  const enc = encodeURIComponent(name);
  if (/\.mp3$/i.test(name)) return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${enc}`;
  return `https://upload.wikimedia.org/wikipedia/commons/transcoded/${h[0]}/${h.slice(0, 2)}/${enc}/${enc}.mp3`;
}

export function languageSection(wikitext, name) {
  const lines = wikitext.split("\n");
  const start = lines.findIndex((l) => l.trim() === `==${name}==`);
  if (start < 0) return "";
  const end = lines.findIndex((l, i) => i > start && /^==[^=].*[^=]==\s*$/.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

const AUDIO_EXT = /\.(ogg|oga|wav|mp3|flac|opus|webm)$/i;

export function wikitextAudio(wikitext, lang, title) {
  const name = KAIKKI_LANG[lang];
  const section = name ? languageSection(wikitext, name) : "";
  const found = [];
  const add = (raw) => {
    const f = raw.trim().replace(/#/g, title);
    if (raw.trim() !== "#" && AUDIO_EXT.test(f) && !found.includes(f)) found.push(f);
  };
  for (const m of section.matchAll(/\{\{audio\|[^|}]*\|([^|}]+)/g)) add(m[1]);
  for (const m of section.matchAll(/<audio:([^<>]+?)(?:<|>)/g)) add(m[1]);
  for (const m of section.matchAll(/\|\s*(?:a|audio)\d*\s*=\s*([^|}]+)/g)) add(m[1]);
  return found[0];
}

async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA } });
      if (r.status === 404) return undefined;
      if (r.ok) return await r.text();
    } catch {}
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  return undefined;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      await fn(items[k], k);
    }
  }));
}

async function main() {
  const words = JSON.parse(readFileSync(WORDS_FILE, "utf8"));
  const forms = [];
  const keys = new Set();
  for (const w of words) for (const f of w.forms) {
    const key = `${f.lang}:${f.word}`;
    if (!keys.has(key)) { keys.add(key); forms.push(f); }
  }
  const cacheFile = process.env.AUDIO_CACHE || join(HERE, "../.cache/word-audio-raw.json");
  mkdirSync(dirname(cacheFile), { recursive: true });
  const raw = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
  let done = 0;
  await pool(forms.filter((f) => !(`${f.lang}:${f.word}` in raw)), 6, async (f) => {
    const url = kaikkiUrl(f.lang, f.word);
    const body = url ? await get(url) : undefined;
    const entries = body ? body.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }) : [];
    raw[`${f.lang}:${f.word}`] = pickSound(entries, f.lang) ?? null;
    if (++done % 250 === 0) { console.log(`kaikki ${done}`); writeFileSync(cacheFile, JSON.stringify(raw)); }
  });
  writeFileSync(cacheFile, JSON.stringify(raw));
  done = 0;
  await pool(forms.filter((f) => raw[`${f.lang}:${f.word}`] === null && !(`wt:${f.lang}:${f.word}` in raw)), 6, async (f) => {
    const title = pageTitle(f.lang, f.word);
    const body = await get(`https://en.wiktionary.org/w/index.php?action=raw&title=${encodeURIComponent(title)}`);
    const file = body ? wikitextAudio(body, f.lang, title) : undefined;
    raw[`wt:${f.lang}:${f.word}`] = file ? { file, src: commonsMp3(file) } : null;
    if (++done % 250 === 0) { console.log(`wiktionary ${done}`); writeFileSync(cacheFile, JSON.stringify(raw)); }
  });
  writeFileSync(cacheFile, JSON.stringify(raw));
  for (const f of forms) {
    const key = `${f.lang}:${f.word}`;
    if (!raw[key] && raw[`wt:${key}`]) raw[key] = raw[`wt:${key}`];
  }
  const files = [...new Set(forms.map((f) => raw[`${f.lang}:${f.word}`]).filter(Boolean).map((s) => s.file))];
  const meta = {};
  for (let i = 0; i < files.length; i += 50) {
    const titles = files.slice(i, i + 50).map((f) => `File:${f}`).join("|");
    const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=LicenseShortName|Artist|LicenseUrl&titles=${encodeURIComponent(titles)}`;
    const body = await get(u);
    if (!body) continue;
    const q = JSON.parse(body).query || {};
    const norm = new Map((q.normalized || []).map((n) => [n.to, n.from]));
    for (const p of q.pages || []) {
      const from = (norm.get(p.title) || p.title).replace(/^File:/, "");
      meta[from] = { title: p.title.replace(/^File:/, ""), ...credit(p.imageinfo?.[0]?.extmetadata) };
    }
  }
  const out = {};
  for (const key of [...keys].sort()) {
    const s = raw[key];
    const m = s && meta[s.file];
    if (!s || !m?.license) continue;
    out[key] = { src: s.src, file: m.title, license: m.license, ...(m.by ? { by: m.by } : {}), ...(m.licenseUrl ? { licenseUrl: m.licenseUrl } : {}) };
  }
  writeFileSync(AUDIO_FILE, JSON.stringify(out, null, 0).replace(/},"/g, '},\n"') + "\n");
  const byLang = {};
  for (const f of forms) {
    const b = (byLang[f.lang] ||= [0, 0]);
    b[1]++;
    if (out[`${f.lang}:${f.word}`]) b[0]++;
  }
  console.log(`recordings for ${Object.keys(out).length} of ${forms.length} forms`);
  console.log(Object.entries(byLang).map(([l, [a, n]]) => `${l} ${a}/${n}`).join(" "));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
