import fs from "node:fs";
import path from "node:path";
import { ARTICLES, buildLangCorpus, distractors, isVocab, LANG_CODES, normalizeAnswer, seededRng, type RawLayers } from "../src/lib/academy/lang-systems";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}
function none<T>(xs: T[], m: string, show: (x: T) => string = (x) => JSON.stringify(x)) {
  ok(xs.length === 0, `${m}${xs.length ? `: ${xs.slice(0, 8).map(show).join("; ")}` : ""}`);
}

const dir = path.resolve(__dirname, "../learning/app/corpus");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const layers = read("lang-layers.json") as RawLayers & { meta: { coverage: Record<string, { three: number; any: number; of: number }> } };
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), layers);
const words = corpus.items.filter((i) => i.kind === "word");
const vocab = corpus.items.filter(isVocab);
const NON_LATIN_ROMAN = ["zh", "ja", "ko", "ru", "el", "hi", "ar"];
const IPA_LANGS = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ko", "hi", "ar"];
const NOUN_CATEGORIES = new Set(["family", "animal", "body", "food", "nature", "object", "time"]);

ok(words.length === 244, "244 core words");
const EXTRA: string[] = read("lang-core.json").meta.extraLanguages;
for (const l of LANG_CODES.filter((x) => !EXTRA.includes(x))) none(words.filter((w) => !w.forms[l]).map((w) => w.id), `every word has a ${l} form`);
for (const l of EXTRA) ok(LANG_CODES.includes(l) && words.filter((w) => w.forms[l]).length >= 0.8 * words.length, `${l} covers at least 80% of the words`);

for (const l of NON_LATIN_ROMAN) none(vocab.filter((i) => i.forms[l] && !i.readings[l]?.roman).map((i) => i.id), `${l} romanization on every card`);
none(vocab.filter((i) => i.forms.ja && !i.readings.ja?.kana).map((i) => i.id), "ja kana on every card");
none(words.filter((w) => !/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(w.readings.zh?.roman ?? "")).map((w) => `${w.id} ${w.readings.zh?.roman}`), "pinyin carries tone marks");
for (const l of IPA_LANGS) none(words.filter((w) => !w.readings[l]?.ipa).map((w) => w.id), `${l} IPA on every word`);

const greekVowels = /[αεηιουωάέήίόύώϊϋΐΰ]/g;
const GREEK_MONOSYLLABLES = new Set(["γεια", "μια", "γιος", "μου", "σου", "του", "πιο", "ποιος"]);
const greekTonos = /[άέήίόύώΐΰ]/;
const greekMissing: string[] = [];
for (const i of vocab) {
  const f = i.forms.el;
  if (!f) continue;
  for (const tok of f.split(/[\s,.;!?]+/).filter(Boolean)) {
    const vowels = (tok.toLowerCase().match(greekVowels) ?? []).length;
    const diphthongOnly = /^[^αεηιουω]*(ου|αι|ει|οι)[^αεηιουω]*$/.test(tok);
    if (vowels >= 2 && !diphthongOnly && !GREEK_MONOSYLLABLES.has(tok) && !greekTonos.test(tok)) greekMissing.push(`${i.id}:${tok}`);
  }
}
none(greekMissing, "Greek words of two or more syllables carry a stress accent");
none(words.filter((w) => w.forms.el !== w.forms.el.toLowerCase()).map((w) => w.id), "Greek words are lowercase");

const capital = (s: string) => s.length > 0 && s[0] !== s[0].toLowerCase();
none(
  words.flatMap((w) => LANG_CODES.filter((l) => l !== "de" && w.forms[l] && capital(w.forms[l])).map((l) => `${l}:${w.id}:${w.forms[l]}`)),
  "no stray capitals outside German"
);
none(words.filter((w) => NOUN_CATEGORIES.has(w.category) && !["today", "tomorrow", "yesterday"].includes(w.id) && !capital(w.forms.de)).map((w) => `${w.id}:${w.forms.de}`), "German nouns are capitalized");
none(words.flatMap((w) => LANG_CODES.filter((l) => /[()]/.test(w.forms[l] ?? "")).map((l) => `${l}:${w.id}`)), "no parentheses in forms");

const SENSE: [string, string, string][] = [
  ["pl", "fire", "ogień"],
  ["fi", "money", "raha"],
  ["fr", "hair", "cheveux"],
  ["ko", "stomach", "배"],
  ["hi", "buy", "खरीदना"],
  ["hi", "door", "दरवाज़ा"],
  ["de", "think", "denken"],
  ["nl", "sun", "zon"],
  ["ar", "door", "بَاب"],
  ["ar", "year", "سَنَة"],
  ["zh", "egg", "鸡蛋"],
  ["zh", "seven", "七"],
  ["zh", "woman", "女人"],
  ["zh", "milk", "牛奶"],
  ["zh", "go", "去"],
  ["ja", "take", "取る"],
  ["sv", "day", "dag"],
  ["ru", "day", "день"],
  ["el", "eye", "μάτι"],
];
for (const [l, id, want] of SENSE) ok(corpus.byId.get(id)?.forms[l] === want, `${l} ${id} is ${want}`);

const rng = seededRng(11);
const ambiguous: string[] = [];
for (const l of LANG_CODES.filter((x) => x !== "en")) {
  for (const item of vocab) {
    if (!item.forms[l] || !item.forms.en) continue;
    for (const [optionLang, promptLang] of [
      [l, "en"],
      ["en", l],
    ]) {
      for (const d of distractors(corpus, item, optionLang, promptLang, rng)) {
        const twin = vocab.find((x) => x.forms[optionLang] === d && x.forms[promptLang] && normalizeAnswer(x.forms[promptLang], promptLang) === normalizeAnswer(item.forms[promptLang], promptLang));
        if (twin) ambiguous.push(`${l}:${item.id}->${d}`);
      }
    }
  }
}
none(ambiguous, "no distractor is a second right answer");

const equalGroups: string[] = [];
for (const l of LANG_CODES) {
  const seen = new Map<string, string>();
  for (const p of vocab.filter((i) => i.kind === "phrase")) {
    const f = p.forms[l];
    if (!f) continue;
    if (seen.has(f)) equalGroups.push(`${l}:${seen.get(f)}=${p.id}`);
    else seen.set(f, p.id);
  }
}
ok(equalGroups.some((g) => g.includes("good-evening") && g.includes("good-night")), "the validator sees equal phrase answers such as good evening and good night");

for (const l of LANG_CODES.filter((x) => x !== "en" && !EXTRA.includes(x))) {
  const c = layers.meta.coverage[l];
  ok(c.any >= 0.6 * c.of, `${l} sentences for ${c.any} of ${c.of} words, ${c.three} with three`);
}
const poolIds = Object.keys(corpus.pool);
ok(poolIds.length > 1000, `sentence pool has ${poolIds.length} Tatoeba sentences`);
none(poolIds.filter((id) => !corpus.pool[id].t.en), "every pooled sentence has its English source");
ok(corpus.sources.some((s) => s.includes("Tatoeba")) && corpus.sources.some((s) => s.includes("CC-BY")), "Tatoeba is attributed");

for (const l of Object.keys(ARTICLES)) {
  const nouns = words.filter((w) => NOUN_CATEGORIES.has(w.category));
  const withG = nouns.filter((w) => w.gender[l]);
  ok(withG.length >= 120, `${l} gender for ${withG.length} nouns`);
  none(withG.filter((w) => !(w.gender[l] in ARTICLES[l]) && w.gender[l] !== "pl").map((w) => `${w.id}:${w.gender[l]}`), `${l} gender values are known articles`);
}
ok(corpus.items.some((i) => i.id === "g-dog" && i.forms.es === "el perro" && i.forms.fr === "le chien"), "gender cards carry the article");
ok(corpus.byId.get("g-water")?.forms.fr === "l'eau", "French elides before a vowel");

const verbs = words.filter((w) => w.category === "verb");
for (const l of ["es", "fr", "it", "pt", "de", "nl"]) {
  none(verbs.filter((v) => (v.conj[l] ?? []).filter(Boolean).length !== 6).map((v) => v.id), `${l} six present forms for every verb`);
}
ok(corpus.byId.get("eat")?.conj.de?.[1] === "isst" && corpus.byId.get("go")?.conj.fr?.[0] === "vais" && corpus.byId.get("speak")?.conj.es?.[0] === "hablo", "irregular and regular forms spot-check");
ok((corpus.persons.es ?? []).length === 6, "person labels present");

for (const l of ["es", "fr", "it", "pt", "de", "nl"]) {
  none(verbs.filter((v) => (v.conjPast[l] ?? []).filter(Boolean).length !== 6).map((v) => v.id), `${l} six past forms for every verb`);
}
ok(corpus.byId.get("go")?.conjPast.fr?.[0] === "suis allé" && corpus.byId.get("eat")?.conjPast.de?.[0] === "habe gegessen" && corpus.byId.get("speak")?.conjPast.es?.[0] === "hablé", "past tense spot-check");
ok(corpus.persons.pt?.[4] === "vocês" && corpus.byId.get("go")?.conj.pt?.[4] === "vão", "Portuguese uses vocês, not vós");
none(verbs.filter((v) => (v.conj.pt ?? []).includes("ides")), "no archaic Portuguese second plural");

const core = read("lang-core.json") as { atoms: { id: string; forms: Record<string, { word: string }> }[] };
const coreForm = (id: string, l: string) => core.atoms.find((a) => a.id === id)?.forms[l]?.word;
ok(coreForm("fire", "pl") === "ogień" && coreForm("seven", "zh") === "七" && coreForm("eye", "el") === "μάτι", "base lang-core.json carries the corrections");

const levels = Object.values(corpus.pool).flatMap((s) => Object.values(s.lv ?? {}));
ok(levels.length > 1000 && [1, 2, 3].every((n) => levels.includes(n)), "pooled sentences carry A1, A2 and B1 levels");
none(Object.values(corpus.pool).filter((s) => /Eure Auge sind/.test(s.t.de ?? "")).map((s) => s.t.de), "known-bad sentences are dropped");
ok(layers.meta.attribution?.some((a) => a.includes("native")) ?? false, "the native-speaker filter is documented");

none(corpus.falseFriends.filter((f) => !f.lang || !f.word || !f.means || !f.looksLike).map((f) => f.word), "false friends are complete");
none(corpus.falseFriends.filter((f) => f.itemId && corpus.byId.get(f.itemId)?.forms[f.lang]?.toLowerCase() !== f.word.toLowerCase()).map((f) => f.word), "linked false friends match the deck form");
ok(corpus.falseFriends.some((f) => f.crossWith), "cross-language false friends present");

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nlang data: all ok");
