import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VOWELS = new Set("aeiouyɑɐɒæɛɪɔʊʌəɜɞɨʉøœɯɤɵɚɝᵻɘʏ");
const AFFRICATES = ["t͡ʃ", "d͡ʒ", "t͡s", "d͡z", "tʃ", "dʒ", "ts", "dz", "tɕ", "dʑ"];
const STOPS = new Set(["p", "b", "t", "d", "k", "ɡ", "g", "c", "ɟ"]);
const FRICATIVES = new Set(["f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "x", "ç", "ɣ"]);
const APPROXIMANTS = new Set(["r", "ɾ", "ɹ", "ʁ", "ʀ", "l", "ʎ", "j", "w"]);
const SIBILANTS = new Set(["s", "ʃ"]);
const MODIFIER = /^[̀-ͯːˑʲʰʷˠˤ̚]$/u;

function segments(word) {
  const out = [];
  const chars = Array.from(word);
  for (let i = 0; i < chars.length; ) {
    const rest = chars.slice(i, i + 3).join("");
    const unit = AFFRICATES.find((a) => rest.startsWith(a));
    let text = unit ?? chars[i];
    i += unit ? Array.from(unit).length : 1;
    while (i < chars.length && MODIFIER.test(chars[i])) text += chars[i++];
    out.push(text);
  }
  return out;
}

const base = (seg) => AFFRICATES.find((a) => seg.startsWith(a)) ?? Array.from(seg)[0];
const isVowel = (seg) => VOWELS.has(base(seg));
const isMark = (seg) => seg === "ˈ" || seg === "ˌ" || seg === ".";

function legalOnset(cluster) {
  const b = cluster.map(base);
  if (b.length === 1) return true;
  if (b.length === 2) {
    if ((STOPS.has(b[0]) || FRICATIVES.has(b[0])) && APPROXIMANTS.has(b[1])) return true;
    return SIBILANTS.has(b[0]) && STOPS.has(b[1]);
  }
  return b.length === 3 && SIBILANTS.has(b[0]) && STOPS.has(b[1]) && APPROXIMANTS.has(b[2]);
}

function fixWord(word) {
  const segs = segments(word);
  for (let i = 1; i < segs.length; i++) {
    if (segs[i] !== "ˈ" && segs[i] !== "ˌ") continue;
    if (!segs[i + 1] || !isVowel(segs[i + 1])) continue;
    let start = i;
    while (start > 0 && !isVowel(segs[start - 1]) && !isMark(segs[start - 1])) start--;
    if (start === i) continue;
    let from = start;
    if (start > 0 && !isMark(segs[start - 1])) {
      from = i - 1;
      while (from > start && legalOnset(segs.slice(from - 1, i))) from--;
    }
    const [mark] = segs.splice(i, 1);
    segs.splice(from, 0, mark);
  }
  return segs.join("");
}

export function onsetStress(ipa) {
  return ipa.split(" ").map(fixWord).join(" ");
}

export function swedishSj(ipa) {
  return ipa.replaceAll("sx", "ɧ");
}

const stripSlashes = (ipa) => ipa.replace(/^[/[]|[/\]]$/g, "");

export function fixLayers(layers, core, phrases, gold) {
  let replaced = 0;
  let moved = 0;
  const formOf = (id, lang) => layers.forms[lang]?.[id] ?? core.atoms?.[id]?.forms?.[lang] ?? phrases.get(id)?.forms?.[lang];
  for (const [id, byLang] of Object.entries(layers.readings)) {
    for (const [lang, reading] of Object.entries(byLang)) {
      if (!reading?.ipa) continue;
      const before = reading.ipa;
      const form = formOf(id, lang)?.toLowerCase();
      const found = form ? gold[lang]?.[form] : undefined;
      if (found) {
        reading.ipa = stripSlashes(found);
        if (reading.ipa !== before) replaced++;
        continue;
      }
      const next = onsetStress(lang === "sv" ? swedishSj(before) : before);
      if (next !== before) moved++;
      reading.ipa = next.replaceAll('"', "");
    }
  }
  return { replaced, moved };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const shared = join(root, "apple/Shared/Corpus");
  const read = (p) => JSON.parse(readFileSync(p, "utf8"));
  const layers = read(join(shared, "lang-layers.json"));
  const core = read(join(shared, "lang-core.json"));
  const phrases = new Map(read(join(shared, "lang-phrases.json")).phrases.map((p) => [`ph-${p.id}`, p]));
  const gold = {};
  for (const f of readdirSync(join(shared, "top1000"))) {
    const lang = f.replace(".json", "");
    gold[lang] = Object.fromEntries(read(join(shared, "top1000", f)).filter((w) => w.ipa).map((w) => [w.word.toLowerCase(), w.ipa]));
  }
  console.log(fixLayers(layers, core, phrases, gold));
  const text = JSON.stringify(layers);
  writeFileSync(join(shared, "lang-layers.json"), text);
  writeFileSync(join(root, "learning/app/corpus/lang-layers.json"), text);
}
