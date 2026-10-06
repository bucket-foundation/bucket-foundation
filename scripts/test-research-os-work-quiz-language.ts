import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CARD_KEY_SEPARATOR, FACT_JOIN, FACT_KINDS, TYPE_FORM, cardFields, factIdOfSource } from "../src/lib/research-os/work-quiz/fact";
import { FORM_MAKERS, type SampledQuestion } from "../src/lib/research-os/work-quiz/forms";
import { LIMIT_SEC, rewriteQuestion, seededRng } from "../src/lib/research-os/work-quiz/generate";
import { gradeAnswer } from "../src/lib/research-os/work-quiz/grade";
import { checkLimits } from "../src/lib/research-os/work-quiz/limits";
import { LANGUAGE_CHOICES, MIN_PAIR_LANGUAGES, MIN_STRICT_PAIRS, buildWordSet, cleanMatch, fold, headword, knownLanguages, languageMakers, languageRivals, pairTargets, scriptOf, strictMatch, strictPairs, type RawSubset, type WordCell } from "../src/lib/research-os/work-quiz/polingual-forms";
import { SUBSET_FILE, loadWordSet, subsetPath } from "../src/lib/research-os/work-quiz/polingual-server";
import { builtCells, dueFrom, languageCells, sampleQuiz } from "../src/lib/research-os/work-quiz/sampler";
import { BLOCKED_FORMS, DEPTHS, FORMS, FORM_LIMIT_SEC, LANGUAGE_FORMS, VALID_PAIRS, type Depth, type LanguageForm } from "../src/lib/research-os/work-quiz/space";
import { ALL_QUIZ_TYPES, LANGUAGE_QUIZ_TYPES, QUIZ_TYPES, SOURCE_KINDS, TYPE_LABEL, toPublic, type WorkSources } from "../src/lib/research-os/work-quiz/types";

const RAW = JSON.parse(fs.readFileSync(path.join(process.cwd(), SUBSET_FILE), "utf8")) as RawSubset;
const SET = loadWordSet();
const TITLES = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/fixtures/quiz-titles.json"), "utf8")) as { prs: string[]; beads: string[] };
const STATUSES = ["open", "closed", "in_progress", "deferred"];
const day = (i: number) => new Date(Date.UTC(2026, 8, 1 + Math.floor(i / 4))).toISOString().slice(0, 10);
const SOURCES: WorkSources = {
  repoUrl: "https://github.com/example/repo",
  prs: TITLES.prs.map((title, i) => ({ number: 400 + i, title: `${title} (#${400 + i})`, date: day(i), order: i })),
  beads: TITLES.beads.map((title, i) => ({ id: `bkt-f${i.toString(36)}`, title, status: STATUSES[i % STATUSES.length], priority: i % 5, createdAt: day(i) })),
  notes: [],
};
const NONE: WorkSources = { beads: [], prs: [], notes: [], repoUrl: null };
const STRICT_CELLS = 844;
const STRICT_CONCEPTS = 144;
const STRICT_PAIRS = 5190;
const has = (lang: string, concept: string) => SET.cells.some((c) => c.lang === lang && c.concept === concept);
const raw = (lang: string, word: string) => RAW.words.find((w) => w.l === lang && w.s === word)!;
const TRIES = 40;

function made(form: LanguageForm, languages: string[], tries = TRIES): SampledQuestion[] {
  const maker = languageMakers(SET, languages)[form]!;
  const out: SampledQuestion[] = [];
  for (const depth of DEPTHS) for (let i = 0; i < tries; i++) {
    const q = maker(NONE, seededRng(`${languages.join()}-${form}-${depth}-${i}`), depth);
    if (q) out.push(q);
  }
  return out;
}

const cellOf = (ref: string): WordCell => SET.cells.find((c) => `${c.lang}:${c.concept}` === ref)!;

test("the loader finds the word set from the repo root and from a package folder", () => {
  assert.equal(subsetPath(), path.join(process.cwd(), SUBSET_FILE));
  assert.equal(subsetPath(path.join(process.cwd(), "packages", "bkt")), path.join(process.cwd(), SUBSET_FILE));
  assert.throws(() => subsetPath(path.parse(process.cwd()).root), /POLINGUAL_SUBSET_PATH/);
  assert.equal(loadWordSet(), SET);
  assert.equal(SET.languages.length, 27);
});

test("a cell is strict when the gloss reduces to its concept and its language holds one such word", () => {
  assert.equal(headword("to eat (food), consume"), "eat");
  assert.equal(headword("The tooth; a fang"), "tooth");
  assert.equal(strictMatch({ s: "กรม", l: "th", g: "high governmental organisation", c: "high" }), false);
  assert.equal(strictMatch({ s: "ฟัน", l: "th", g: "tooth", c: "tooth" }), true);
  assert.equal(strictMatch({ s: "Light", l: "en", g: "Electromagnetic radiation", c: "light" }), true);
  assert.equal(SET.cells.length, STRICT_CELLS);
  assert.equal(Object.values(SET.byConcept).filter((cells) => new Set(cells.map((c) => c.lang)).size > 1).length, STRICT_CONCEPTS);
  const keys = SET.cells.map((c) => `${c.lang}:${c.concept}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const c of SET.cells) {
    const twins = RAW.words.filter((w) => w.l === c.lang && w.c === c.concept && cleanMatch(w, SET.conceptPos));
    assert.equal(twins.length, 1, `${c.lang}:${c.concept}`);
    assert.equal(c.pos, SET.conceptPos[c.concept]);
    assert.ok(![c.word, c.concept, c.lang].some((s) => s.includes(FACT_JOIN) || s.includes(CARD_KEY_SEPARATOR)));
  }
});

test("the strict cell count and the pair count hold exact values", () => {
  assert.deepEqual([SET.cells.length, strictPairs(SET)], [STRICT_CELLS, STRICT_PAIRS]);
});

test("known bad cells fail the filter", () => {
  for (const [lang, word] of [["ja", "空手"], ["fr", "assises"], ["id", "asap"], ["hi", "शुभ"], ["ru", "добро"], ["la", "diu"], ["ar", "أصل"]]) {
    assert.ok(raw(lang, word).c, `${lang} ${word}`);
    assert.equal(cleanMatch(raw(lang, word), SET.conceptPos), false, `${lang} ${word}`);
    assert.ok(!SET.cells.some((c) => c.lang === lang && c.word === word), `${lang} ${word}`);
  }
  for (const [lang, concept] of [["ja", "left"], ["fr", "law"], ["id", "smoke"], ["hi", "good"], ["ru", "good"], ["la", "long"], ["ar", "ground"], ["en", "book"], ["en", "smoke"]]) assert.equal(has(lang, concept), false, `${lang}:${concept}`);
  assert.equal(SET.conceptPos.long, "adj");
  assert.equal(SET.conceptPos.good, "adj");
  assert.equal(SET.conceptPos.book, undefined);
  assert.equal(raw("en", "book").p, "verb");
  assert.equal(SET.conceptPos.smoke, undefined);
  const long = SET.cells.find((c) => c.lang === "he" && c.concept === "long")!;
  assert.ok(pairTargets(SET, long).every((c) => c.pos === "adj" && c.word !== "diu"));
  for (const c of SET.byLang.en) assert.ok(!/^(bold|terms|relating|to do with)/i.test(c.gloss), c.gloss);
  assert.equal(SET.byLang.en.find((c) => c.word === "bad")?.gloss ?? "", "");
});

test("a pair needs one part of speech and a concept held by three languages", () => {
  const ground = SET.byConcept.ground ?? [];
  assert.ok(ground.length > 0 && new Set(ground.map((c) => c.lang)).size < MIN_PAIR_LANGUAGES);
  for (const c of ground) assert.deepEqual(pairTargets(SET, c), []);
  assert.ok(!ground.some((c) => c.word === "أصل"));
  for (const c of SET.cells) for (const t of pairTargets(SET, c)) {
    assert.equal(t.pos, c.pos);
    assert.ok(new Set(SET.byConcept[c.concept].map((x) => x.lang)).size >= MIN_PAIR_LANGUAGES);
  }
  for (const q of made("pair", [...SET.languages], 80)) assert.ok(!q.explain.includes('"ground"') && ![q.lines[0], ...q.choices!].includes("أصل"));
});

test("the strict pair count clears the bar, so pair ships", () => {
  assert.equal(strictPairs(SET), STRICT_PAIRS);
  assert.ok(STRICT_PAIRS >= MIN_STRICT_PAIRS);
  assert.equal(BLOCKED_FORMS.pair, undefined);
  assert.deepEqual(Object.keys(languageMakers(SET, ["es"])).sort(), [...LANGUAGE_FORMS].sort());
  const thin = buildWordSet({ ...RAW, words: RAW.words.filter((w) => w.l === "es" || w.c === "water") });
  assert.ok(strictPairs(thin) < MIN_STRICT_PAIRS);
  assert.equal(languageMakers(thin, ["es"]).pair, undefined);
});

test("every new form, type, fact kind and source kind is wired through each table", () => {
  for (const form of LANGUAGE_FORMS) {
    assert.ok(FORMS.includes(form));
    assert.deepEqual(VALID_PAIRS[form], ["pick"]);
    assert.ok(FORM_LIMIT_SEC[form] >= 5);
    assert.equal(FORM_MAKERS[form], undefined);
  }
  for (const type of LANGUAGE_QUIZ_TYPES) {
    assert.ok(ALL_QUIZ_TYPES.includes(type));
    assert.ok(!(QUIZ_TYPES as readonly string[]).includes(type));
    assert.equal(TYPE_FORM[type], type);
    assert.equal(LIMIT_SEC[type], FORM_LIMIT_SEC[TYPE_FORM[type]]);
    assert.ok(TYPE_LABEL[type].length > 0);
  }
  for (const type of ALL_QUIZ_TYPES) assert.ok(FORMS.includes(TYPE_FORM[type]) && TYPE_LABEL[type]);
  assert.ok(FACT_KINDS.includes("word"));
  assert.ok(SOURCE_KINDS.includes("word"));
  assert.equal(factIdOfSource({ kind: "word", ref: "th:tooth", label: "", href: null }), "word:th:tooth");
  assert.deepEqual(languageCells(languageMakers(SET, ["th"])).length, LANGUAGE_FORMS.length * DEPTHS.length);
  assert.deepEqual(languageCells({}), []);
});

test("each form is the same for the same seed and differs across seeds", () => {
  for (const form of LANGUAGE_FORMS) {
    const maker = languageMakers(SET, ["de", "ja", "ar"])[form]!;
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const a = maker(NONE, seededRng(`det-${form}-${i}`), 3);
      assert.deepEqual(a, maker(NONE, seededRng(`det-${form}-${i}`), 3));
      if (a) ids.add(a.id);
    }
    assert.ok(ids.size > 5, form);
  }
});

test("every language question passes checkLimits and holds its answer once", () => {
  for (const lang of SET.languages) for (const form of LANGUAGE_FORMS) {
    const qs = made(form, [lang], 12);
    assert.ok(qs.length > 0, `${lang} ${form}`);
    for (const q of qs) {
      assert.deepEqual(checkLimits(q), [], `${lang} ${form} ${q.id}`);
      assert.equal(q.choices!.length, LANGUAGE_CHOICES[q.depth as Depth]);
      assert.equal(q.choices!.filter((c) => c === q.answer).length, 1);
      assert.equal(new Set(q.choices!.map(fold)).size, q.choices!.length);
      assert.equal(q.limitSec, FORM_LIMIT_SEC[form]);
      assert.equal(q.type, form);
      assert.equal(gradeAnswer(q, q.answer, 1000).correct, true);
      assert.equal(gradeAnswer(q, q.choices!.find((c) => c !== q.answer)!, 1000).correct, false);
      assert.equal(toPublic(q).choices!.length, q.choices!.length);
      assert.ok(!/[–—]/.test([q.prompt, q.explain, ...q.lines].join(" ")));
    }
  }
});

test("each of the 27 languages yields a meaning question in its own words", () => {
  for (const lang of SET.languages) {
    const qs = made("meaning", [lang]);
    assert.ok(qs.length > 0, lang);
    for (const q of qs) {
      const a = cellOf(q.sources[0].ref);
      assert.equal(a.lang, lang);
      assert.equal(q.answer, a.word);
      assert.ok(q.prompt.includes(SET.names[lang]) && q.prompt.includes(`"${a.gloss}"`));
      if (lang === "en") assert.ok(!new RegExp(`\\b${a.concept}\\b`, "i").test(a.gloss), q.prompt);
    }
  }
});

test("wrong words come from other concepts in the same language and script and never share the answer's meaning", () => {
  for (const lang of SET.languages) for (const form of ["meaning", "sound", "pair"] as const) for (const q of made(form, [lang], 10)) {
    const a = cellOf(q.sources[0].ref);
    for (const wrong of q.choices!.filter((c) => c !== q.answer)) {
      const cell = SET.fill[a.lang].find((c) => c.word === wrong)!;
      assert.ok(cell, `${wrong} is a strict ${a.lang} word`);
      assert.notEqual(cell.concept, a.concept);
      assert.equal(cell.script, a.script);
      assert.notEqual(fold(cell.word), fold(a.word));
      assert.ok(!cell.senseWords.has(a.concept), `${wrong} also means ${a.concept}`);
      if (form === "sound") assert.ok(cell.ipa && cell.ipa !== a.ipa);
    }
  }
});

test("right-to-left and unspaced scripts are covered by every form", () => {
  const scripts: Record<string, string[]> = { ar: ["arabic"], he: ["hebrew"], fa: ["arabic"], zh: ["han"], ja: ["han", "kana"], th: ["thai"] };
  for (const [lang, want] of Object.entries(scripts)) for (const form of LANGUAGE_FORMS) {
    const qs = made(form, [lang]);
    assert.ok(qs.length > 0, `${lang} ${form}`);
    for (const q of qs) {
      const shown = form === "language" ? q.lines[0] : form === "pair" ? (cellOf(q.sources[0].ref).lang === lang ? q.answer : q.lines[0]) : q.answer;
      assert.ok(want.includes(scriptOf(shown)), `${lang} ${form} ${shown}`);
      assert.deepEqual(checkLimits(q), []);
    }
  }
  assert.equal(scriptOf("寒い"), "kana");
  assert.equal(scriptOf("שלום"), "hebrew");
  assert.equal(fold("שָׁלוֹם"), fold("שלום"));
  assert.equal(fold("كِتَاب"), fold("كتاب"));
});

test("the sound form never shows an empty transcription", () => {
  const bare = SET.cells.filter((c) => !c.ipa);
  assert.ok(bare.length > 0);
  for (const lang of SET.languages) for (const q of made("sound", [lang], 15)) {
    assert.match(q.lines[0], /^\/[^/\s][^/]*\/$/);
    assert.ok(cellOf(q.sources[0].ref).ipa.length > 0);
  }
});

test("the language form skips shared spellings and keeps one right answer", () => {
  assert.ok(SET.cells.some((c) => c.shared));
  for (const lang of SET.languages) for (const q of made("language", [lang], 15)) {
    const a = cellOf(q.sources[0].ref);
    assert.equal(a.shared, false);
    assert.equal(RAW.words.filter((w) => fold(w.s) === a.folded && w.l !== a.lang).length, 0);
    assert.equal(q.answer, SET.names[lang]);
    for (const c of q.choices!) assert.ok(Object.values(SET.names).includes(c));
    if (lang === "zh") assert.ok(!q.choices!.includes(SET.names.ja));
    if (lang === "ja") assert.equal(a.script, "kana");
  }
  const lever = SET.cells.find((c) => c.lang === "sv" && c.word === "lever")!;
  assert.equal(lever.shared, false);
  const rivals = languageRivals(SET, lever).flat();
  for (const l of ["nl", "en", "de"]) assert.ok(!rivals.includes(l), l);
  for (const lang of ["nl", "en"]) {
    const twin = buildWordSet({ ...RAW, words: [...RAW.words, { s: "Léver", l: lang, g: "lever", p: "noun", c: "liver" }] });
    assert.equal(twin.cells.find((c) => c.lang === "sv" && c.word === "lever")!.shared, true);
    const maker = languageMakers(twin, ["sv"]).language!;
    for (let i = 0; i < 300; i++) assert.notEqual(maker(NONE, seededRng(`lever-${i}`), 3)?.lines[0], "lever");
  }
  const near = made("language", ["fa"], 40).filter((q) => q.depth === 1);
  assert.ok(near.length > 0 && near.every((q) => q.choices!.includes(SET.names.ar)));
});

test("every pair joins two strict words of one concept in two languages", () => {
  for (const q of made("pair", ["es", "ko", "he", "ru"], 60)) {
    const [from, to] = q.factIds.map((id) => cellOf(id.replace(/^word:/, "")));
    assert.equal(from.concept, to.concept);
    assert.notEqual(from.lang, to.lang);
    assert.notEqual(from.folded, to.folded);
    assert.equal(q.lines[0], from.word);
    assert.equal(q.answer, to.word);
    assert.ok(!q.choices!.map(fold).includes(from.folded));
  }
});

test("each language question carries the Wiktionary CC-BY-SA credit and link", () => {
  assert.equal(SET.credit, `${RAW.attribution.data}, ${RAW.attribution.license}`);
  assert.match(SET.credit, /Wiktionary/);
  assert.match(SET.credit, /CC-BY-SA/);
  assert.ok(SET.credit.length <= 120);
  for (const form of LANGUAGE_FORMS) for (const q of made(form, ["th", "ar", "en", "pl"], 10)) {
    assert.equal(q.sources.length, 1);
    const s = q.sources[0];
    assert.equal(s.kind, "word");
    assert.equal(s.label, SET.credit);
    assert.equal(s.href, `${RAW.attribution.wiktionary_url}/wiki/${encodeURIComponent(cellOf(s.ref).word)}`);
    assert.ok(s.href!.startsWith("https://en.wiktionary.org/wiki/") && s.href!.length <= 600 && s.ref.length <= 120);
    assert.equal(factIdOfSource(s), q.factIds[q.factIds.length - 1]);
    assert.ok(!s.ref.includes(FACT_JOIN) && !s.ref.includes(CARD_KEY_SEPARATOR));
  }
});

test("an empty or absent language list leaves the quiz byte-identical", () => {
  const before = builtCells().map((c) => c.form);
  assert.ok(!before.some((f) => (LANGUAGE_FORMS as readonly string[]).includes(f)));
  let d = Date.parse("2026-10-01T00:00:00Z");
  for (let i = 0; i < 40; i++, d += 86_400_000) {
    const on = new Date(d).toISOString().slice(0, 10);
    const base = JSON.stringify(sampleQuiz({ day: on, sources: SOURCES }));
    assert.equal(JSON.stringify(sampleQuiz({ day: on, sources: SOURCES, languages: [] })), base, on);
    assert.equal(JSON.stringify(sampleQuiz({ day: on, sources: SOURCES, languages: [], words: SET })), base, on);
    assert.equal(JSON.stringify(sampleQuiz({ day: on, sources: SOURCES, languages: ["xx", ""] })), base, on);
    assert.ok(sampleQuiz({ day: on, sources: SOURCES }).questions.every((q) => (QUIZ_TYPES as readonly string[]).includes(q.type)));
  }
  assert.deepEqual(knownLanguages(SET, ["xx", "th", "th"]), ["th"]);
});

test("a language list adds language questions, the same for the same day", () => {
  let seen = 0;
  const forms = new Set<string>();
  let d = Date.parse("2026-10-01T00:00:00Z");
  for (let i = 0; i < 30; i++, d += 86_400_000) {
    const on = new Date(d).toISOString().slice(0, 10);
    const a = sampleQuiz({ day: on, sources: SOURCES, languages: ["es", "zh", "ar"] });
    assert.deepEqual(a, sampleQuiz({ day: on, sources: SOURCES, languages: ["es", "zh", "ar"], words: SET }));
    const facts = a.picks.flatMap((p) => p.factIds);
    assert.equal(new Set(facts).size, facts.length);
    for (const q of a.questions) {
      assert.deepEqual(checkLimits(q), [], `${on} ${q.id}`);
      if ((LANGUAGE_QUIZ_TYPES as readonly string[]).includes(q.type)) {
        seen += 1;
        forms.add(q.type);
        assert.ok(["es", "zh", "ar"].includes(q.sources[0].ref.split(":")[0]) || q.type === "pair");
      }
    }
  }
  assert.ok(seen >= 30);
  assert.deepEqual(Array.from(forms).sort(), [...LANGUAGE_FORMS].sort());
  const only = sampleQuiz({ day: "2026-10-01", sources: NONE, languages: ["th"] });
  assert.equal(only.questions.length, 5);
  assert.ok(only.questions.every((q) => q.sources[0].kind === "word"));
});

test("a stored language card keeps its key, has no rewrite, and comes up when due after the languages are cleared", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  for (const form of LANGUAGE_FORMS) {
    const q = made(form, ["ko", "fr"], 10)[0];
    const stored = JSON.parse(JSON.stringify({ ...q, form: undefined, depth: undefined, factIds: undefined, cardKey: undefined })) as SampledQuestion;
    const fields = cardFields(stored);
    assert.equal(fields.form, form);
    assert.equal(fields.fact_id, factIdOfSource(q.sources[0]));
    assert.equal(cardFields(q).card_key, q.cardKey);
    assert.equal(rewriteQuestion(stored, SOURCES), null);
    const due = dueFrom(stored, now - 86_400_000);
    for (const languages of [undefined, [] as string[]]) {
      const quiz = sampleQuiz({ day: "2026-10-09", sources: SOURCES, due: [due], now, languages });
      assert.equal(quiz.reviewed, 1);
      assert.deepEqual(quiz.questions[0], stored);
      assert.ok(quiz.questions.slice(1).every((x) => (QUIZ_TYPES as readonly string[]).includes(x.type)));
    }
  }
});
