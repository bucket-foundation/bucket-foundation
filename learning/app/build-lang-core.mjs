#!/usr/bin/env node
/* build-lang-core.mjs — regenerate the Academy "Languages" deck (corpus/lang-core.json)
 * (bkt-3s9, deepened under bkt-ctj 2026-06-30).
 *
 * WHY THIS EXISTS
 * ---------------
 * The deck is a concrete-first beginner vocabulary course across 17 languages.
 *
 * TRANSLATION SOURCE — the whole point (bkt-ctj)
 * ----------------------------------------------
 * Translations come from VERIFIED Wiktionary translation tables, NOT from the
 * Polingual semantic corpus. The Polingual photon corpus/API is semantic-
 * NEIGHBOUR noise for translation (water->es returns "sopa"/soup) and its prod
 * `relations` are empty — so it is NEVER used as a translation source.
 *
 * The authoritative source is the **English Wiktionary translation tables**
 * (kaikki.org raw-wiktextract-data): each English headword carries a
 * `translations` array (top-level and/or per-sense) of {code, word, sense,
 * roman, tags} — human-curated, CC-BY-SA. The extractor
 * `corpus/_build/extract-kaikki-translations.py` pulls en->{16 langs} for a
 * curated common-word set (`corpus/_build/concepts.json`), disambiguates by
 * sense (richest sense = the everyday meaning), strips dialect/script noise,
 * and ships a concept ONLY when >=6 target languages verify. Output:
 *   corpus/_build/gold/kaikki-core.json  { lang: { concept: word } }
 *   corpus/_build/gold/kaikki-meta.json  { concept: {category, en_ipa, etymology, ...} }
 *
 * Wrong words are worse than fewer words — honest coverage over breadth.
 *
 * META vs BONUS languages
 * -----------------------
 * validate.sh requires EVERY atom to carry EVERY meta.language form. So
 * meta.languages = the languages that fully cover every kept concept; the rest
 * (e.g. zh, ko, hi, ar where Wiktionary coverage is thinner) ride along as
 * `bonusLanguages`, present where verified and selectable in the picker.
 *
 * IPA: English IPA from the Wiktionary `sounds` field (kaikki-meta). Per-target
 * IPA isn't reliably available in the en translation tables, so target forms
 * ship without IPA (honest — the on-device TTS still pronounces them).
 *
 * Idempotent: re-running regenerates corpus/lang-core.json deterministically.
 *
 * Usage:
 *   python3 learning/app/corpus/_build/extract-kaikki-translations.py   # (1) extract gold
 *   node    learning/app/build-lang-core.mjs                            # (2) build deck
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // learning/app
const CORPUS = join(HERE, "corpus", "lang-core.json");
const GOLD_DIR = join(HERE, "corpus", "_build", "gold");
const KAIKKI_CORE = join(GOLD_DIR, "kaikki-core.json"); // { lang: { concept: word } }
const KAIKKI_META = join(GOLD_DIR, "kaikki-meta.json"); // { concept: {category, en_ipa, ...} }

// ---- load the verified Wiktionary-derived gold ----
const gold = JSON.parse(readFileSync(KAIKKI_CORE, "utf8"));
const kmeta = JSON.parse(readFileSync(KAIKKI_META, "utf8"));
const concepts = Object.keys(kmeta); // the kept concept keys (clean English words)

// ---- curated EXTRAS (example sentences + etymology notes) carried over from
//      the previous hand-curated deck — powers the sentence-cloze drill + the
//      "how the words relate" note. Attached ONLY when cloze-safe. ----
let EXTRAS = {};
try { EXTRAS = JSON.parse(readFileSync(join(GOLD_DIR, "extras.json"), "utf8")); } catch { EXTRAS = {}; }

const ALL_LANGS = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "ru", "ja", "zh", "el", "fi", "pl", "ko", "hi", "ar"];

// ---- META vs BONUS: meta languages MUST cover every kept concept (validate.sh).
//      A concept is dropped if including it would shrink the meta set below the
//      Latin/Cyrillic/Greek core the original deck guaranteed. Concretely: we
//      keep a concept only if all of CORE_REQUIRED have it; languages that fully
//      cover the resulting concept set become meta, the rest become bonus. ----
const CORE_REQUIRED = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "ru", "ja", "el", "fi", "pl"];
const keptConcepts = concepts.filter((c) => CORE_REQUIRED.every((l) => gold[l] && gold[l][c]));

// languages that cover EVERY kept concept = meta; others = bonus.
const fullCoverage = ALL_LANGS.filter((l) => keptConcepts.every((c) => gold[l] && gold[l][c]));
const PREFERRED = ["es", "fr", "it", "pt", "de", "nl", "sv", "ru", "ja"];
const ordered = [];
for (const l of PREFERRED) if (fullCoverage.includes(l) && l !== "en" && !ordered.includes(l)) ordered.push(l);
for (const l of fullCoverage.slice().sort()) if (l !== "en" && !ordered.includes(l)) ordered.push(l);
const META_LANGS = ["en", ...ordered];
const BONUS_LANGS = ALL_LANGS.filter((l) => !META_LANGS.includes(l)); // zh, ko, hi, ar

// ---- CATEGORY + concrete-first ORDER -------------------------------------
const TIER = {
  number: 0, color: 1, family: 2, animal: 3, body: 4,
  food: 5, nature: 6, object: 7, time: 8, adjective: 9, verb: 10, abstract: 11,
};
function shellForTier(t) { return t <= 4 ? "prereq" : t <= 8 ? "nucleus" : "frontier"; }

// commonness: how many META langs carry the concept (all, by construction) — kept
// for a stable secondary sort that biases broadly-attested concepts first.
function commonness(c) {
  let n = 0;
  for (const l of META_LANGS) if (gold[l] && gold[l][c]) n++;
  return n;
}

const NUMERALS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, hundred: 100, thousand: 1000 };

const atoms = [];
for (const c of keptConcepts) {
  const m = kmeta[c] || {};
  const cat = m.category || "object";
  const tier = TIER[cat] != null ? TIER[cat] : 7;
  const forms = {};
  for (const l of [...META_LANGS, ...BONUS_LANGS]) {
    const word = gold[l] && gold[l][c];
    if (!word) continue;
    const f = { word };
    if (l === "en" && m.en_ipa) f.ipa = m.en_ipa;
    forms[l] = f;
  }
  // every atom MUST have all META_LANGS forms (guaranteed by keptConcepts filter)
  if (!META_LANGS.every((l) => forms[l] && forms[l].word)) continue;
  const gloss = NUMERALS[c] != null ? `${c} (${NUMERALS[c]})` : c;
  const atom = {
    id: c,
    gloss,
    category: cat,
    pos: "word",
    shell: shellForTier(tier),
    requires: [],
    tier,
    hv: true,
    forms,
    resources: [{ label: `Wiktionary: ${c}`, url: `https://en.wiktionary.org/wiki/${encodeURIComponent(c)}` }],
  };
  // attach curated extras (cloze example + note) where available & cloze-safe.
  const ex = EXTRAS[c];
  if (ex) {
    if (ex.note) atom.note = ex.note;
    if (ex.example) {
      const safe = {};
      for (const [l, sentence] of Object.entries(ex.example)) {
        const w = forms[l] && forms[l].word;
        if (!w || !sentence) continue;
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pat = new RegExp("(^|[^0-9A-Za-zÀ-ɏ'])" + esc + "(?=$|[^0-9A-Za-zÀ-ɏ])", "i");
        if (pat.test(sentence)) safe[l] = sentence;
      }
      if (Object.keys(safe).length) atom.example = safe;
    }
  }
  atoms.push(atom);
}

// deterministic sort: by tier, then -commonness, then id.
atoms.sort((a, b) => (a.tier - b.tier) || (commonness(b.id) - commonness(a.id)) || (a.id < b.id ? -1 : 1));

const out = {
  meta: {
    branch: "lang-core",
    kind: "language",
    title: "Polyglot Core — a concrete beginner course across many languages",
    languages: META_LANGS,
    bonusLanguages: BONUS_LANGS,
    version: "0.5.0",
    license:
      "Translations are VERIFIED from the English Wiktionary translation tables " +
      "(kaikki.org raw-wiktextract-data, CC-BY-SA 4.0) — each concept ships only " +
      "where Wiktionary lists a translation for the right sense. The Polingual " +
      "semantic corpus is NOT used as a translation source (it is semantic-neighbour " +
      "noise). English IPA from Wiktionary `sounds`. Concrete-first ordering & emoji " +
      "tiles are original. Attribution: Wiktionary contributors via Kaikki (kaikki.org).",
  },
  atoms,
};

writeFileSync(CORPUS, JSON.stringify(out, null, 2));

// ---- report --------------------------------------------------------------
const perLang = {};
for (const l of [...META_LANGS, ...BONUS_LANGS]) perLang[l] = atoms.filter((a) => a.forms[l]).length;
const perCat = {};
for (const a of atoms) perCat[a.category] = (perCat[a.category] || 0) + 1;
console.log(`[build-lang-core] wrote ${atoms.length} atoms`);
console.log(`  meta.languages (${META_LANGS.length}): ${META_LANGS.join(", ")}`);
console.log(`  bonus languages (${BONUS_LANGS.length}): ${BONUS_LANGS.join(", ")}`);
console.log(`  per-language word counts:`);
for (const [l, n] of Object.entries(perLang)) console.log(`    ${l}: ${n}`);
console.log(`  categories (order):`);
for (const [cat, t] of Object.entries(TIER)) if (perCat[cat]) console.log(`    ${t} ${cat}: ${perCat[cat]}`);
