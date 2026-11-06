import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const CORPUS_DIR = join(HERE, "../../apple/Shared/Corpus");
export const OUT_FILE = join(HERE, "../src/data/words.json");
export const AUDIO_FILE = join(HERE, "word-audio.json");

const read = (dir, name) => JSON.parse(readFileSync(join(dir, name), "utf8"));


const APPOSITIVE = /^(the |a |also )?(root|source|same) |^and /i;

export function cleanNote(note) {
  if (!note) return undefined;
  const text = note
    .replace(/\(([^)]*)\)/g, (m) => m.replace(/\s*[\u2014\u2013]\s*/g, ", "))
    .replace(/\s*[\u2014\u2013]\s*(.)/g, (m, c, at, all) => (APPOSITIVE.test(all.slice(at + m.length - 1)) ? `, ${c}` : `. ${c.toUpperCase()}`))
    .replace(/\band interestingly\b/g, "and")
    .split(/(?<=\.)\s+/)
    .filter((s) => !/canon-tier/i.test(s))
    .join(" ")
    .trim();
  return text || undefined;
}

export function rootClusters(concept) {
  if (!concept?.clusters) return [];
  const seen = new Set();
  const out = [];
  for (const c of concept.clusters) {
    if (c.root.startsWith("*-") || c.langs.length < 2) continue;
    const key = [...c.langs].sort().join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ root: c.root, langs: c.langs });
    if (out.length === 4) break;
  }
  return out;
}

const NO_ATTRIBUTION = /^(public domain|cc0|pd)/i;

export function uncredited(audio) {
  return Object.entries(audio)
    .filter(([, a]) => !a.src || !a.file || !a.license || (!a.by && !NO_ATTRIBUTION.test(a.license)))
    .map(([key]) => key);
}

export function readAudio(file = AUDIO_FILE) {
  const audio = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const bad = uncredited(audio);
  if (bad.length) throw new Error(`recordings without an author or license: ${bad.join(", ")}`);
  return audio;
}

export function buildWords(dir = CORPUS_DIR, audio = readAudio()) {
  const core = read(dir, "lang-core.json");
  const cognates = read(dir, "lang-cognates.json").concepts;
  const layers = read(dir, "lang-layers.json");
  const order = [...core.meta.languages, ...(core.meta.bonusLanguages || []), ...(core.meta.extraLanguages || [])];
  return core.atoms.map((atom) => {
    const concept = cognates[atom.id];
    const readings = layers.readings[atom.id] || {};
    const forms = order
      .filter((lang) => atom.forms[lang]?.word)
      .map((lang) => {
        const r = readings[lang] || {};
        const c = concept?.forms?.[lang];
        const ipa = (r.ipa || atom.forms[lang].ipa || (c?.via === "surface" ? c.ipa : "") || "").replace(/^[[/]|[\]/]$/g, "");
        const form = { lang, word: atom.forms[lang].word };
        if (ipa) form.ipa = ipa;
        if (r.roman) form.roman = r.roman;
        if (r.kana) form.kana = r.kana;
        const a = audio[`${lang}:${form.word}`];
        if (a) form.audio = a;
        return form;
      });
    const word = { slug: atom.id, en: atom.forms.en.word, gloss: atom.gloss, category: atom.category, tier: atom.tier, forms };
    const note = cleanNote(atom.note);
    if (note) word.note = note;
    const roots = rootClusters(concept);
    if (roots.length) word.roots = roots;
    return word;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const words = buildWords();
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(words) + "\n");
  console.log(`wrote ${words.length} words to ${OUT_FILE}`);
}
