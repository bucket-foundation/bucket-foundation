import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyPlacement,
  articleWord,
  buildLangCorpus,
  buildQueue,
  crossLanguageOptions,
  cardId,
  createSystem,
  editDistance,
  exerciseFor,
  gradeCard,
  judgeTyped,
  letterExercise,
  langProgress,
  learnerLevel,
  matchExercise,
  mergeSystems,
  normalizeAnswer,
  placementItem,
  placementOptions,
  placementStep,
  requeueAfterMiss,
  seededRng,
  systemSummary,
  unitStatus,
  type Exercise,
  type PlacementAnswer,
} from "../../../src/lib/academy/lang-systems";
import { normalizeState } from "../../../src/lib/academy/engine";
import { alphabetDone, alphabetUnit, dueLetters, foldMarks, HERITAGE_LANGS, judgeSpelled, letterItemId, nextLetters } from "../../../src/lib/academy/lang-script";
import { audioKey } from "../../../src/lib/academy/lang-audio";

const dir = process.argv[2];
const read = (n: string) => JSON.parse(readFileSync(join(dir, `${n}.json`), "utf8"));
const corpus = buildLangCorpus(read("core"), read("cognates"), read("phrases"), read("layers"));

const ex = (e: Exercise | null) =>
  e && {
    kind: e.kind,
    itemId: e.itemId,
    lang: e.lang,
    prompt: e.prompt,
    promptLang: e.promptLang,
    answer: e.answer ?? "",
    answerLang: e.answerLang,
    options: e.options ?? null,
    tokens: e.tokens ?? null,
    accept: e.accept ?? null,
    pairs: e.pairs?.map((p) => `${p.lang}=${p.word}`) ?? null,
    family: e.family?.map((p) => `${p.lang}=${p.word}`) ?? null,
    cloze: e.cloze ? [e.cloze.before, e.cloze.after] : null,
    person: e.person ?? null,
    tense: e.tense ?? null,
    note: e.note ?? null,
    sentenceId: e.sentenceId ?? null,
  };

const rng0 = seededRng(7);
const out: Record<string, unknown> = {
  rng: [rng0(), rng0(), rng0(), rng0()],
  items: corpus.items.map((i) => [i.id, i.kind, i.unit, i.tier, i.root, i.cognateLangs.join(","), Object.keys(i.gender).join(","), Object.keys(i.falseFriends).sort().join(",")].join("|")),
  normalize: ["  ¿Dónde está?  ", "L'Été", "Straße!", "مَرْحَبًا", "Ça   va, bien."].map((s, i) => normalizeAnswer(s, i === 3 ? "ar" : "")),
  judge: [
    ["gato", "gato", "es"],
    ["gatto", "gato", "es"],
    ["comrpar", "comprar", "es"],
    ["Hund.", "Hund", "de"],
    ["perro", "gato", "es"],
    ["mrhba", "مرحبا", "ar"],
  ].map(([g, e, l]) => judgeTyped(g, e, l)),
  edit: [editDistance("kitten", "sitting"), editDistance("ab", "ba"), editDistance("", "abc")],
  audio: [audioKey("es", "hola"), audioKey("ja", "こんにちは"), audioKey("fr", " l'été ")],
};

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 20, 15, 0, 0);
const system = createSystem("en", ["fr", "es", "it"], [], T0);
let state = normalizeState(null);
const ratings = [3, 3, 1, 3, 2, 3, 4, 3, 1, 3, 3, 2];
let r = 0;
const log: unknown[] = [];
let sys = system;

for (let day = 0; day < 4; day++) {
  if (day === 1) {
    const answers: PlacementAnswer[] = [];
    const seen = new Set<string>();
    const prng = seededRng(99);
    const steps: unknown[] = [];
    for (let k = 0; k < 20; k++) {
      const step = placementStep(answers);
      if (step.done) {
        steps.push({ done: true, tier: step.tier });
        sys = { ...sys, placement: { ...sys.placement, es: step.tier } };
        state = applyPlacement(state, sys, corpus, "es", step.tier, T0 + DAY * day);
        break;
      }
      const item = placementItem(sys, corpus, "es", step.nextTier!, seen, prng);
      if (!item) break;
      const opts = placementOptions(corpus, item, "es", sys.root, prng);
      steps.push({ tier: step.nextTier, mode: step.nextMode, item: item.id, opts });
      seen.add(item.id);
      answers.push({ tier: step.nextTier!, correct: k % 3 !== 2, mode: step.nextMode });
    }
    log.push({ placement: steps });
  }
  for (let session = 0; session < 3; session++) {
    let now = T0 + DAY * day + session * 3600_000;
    let queue = buildQueue(sys, corpus, state, now);
    const rng = seededRng(1000 + day * 10 + session);
    const rows: unknown[] = [];
    for (let i = 0; i < queue.length; i++) {
      const e = queue[i];
      const item = corpus.byId.get(e.itemId)!;
      let made: Exercise | null;
      if (e.stage === "match") made = matchExercise(corpus, sys, item, rng);
      else made = exerciseFor(corpus, sys, item, e.lang, state.cards[cardId(e.lang, e.itemId)], rng, { speech: false, afterIntro: e.stage === "check", level: learnerLevel(state, e.lang) });
      rows.push({ stage: e.stage, ex: ex(made) });
      now += 20_000;
      if (!made || made.kind === "intro") continue;
      if (made.kind === "match") {
        for (const p of made.pairs ?? []) state = gradeCard(state, p.lang, e.itemId, 3, now, "UTC");
        continue;
      }
      const rating = ratings[r++ % ratings.length] as 1 | 2 | 3 | 4;
      state = gradeCard(state, e.lang, e.itemId, rating, now, "UTC");
      if (rating === 1) queue = requeueAfterMiss(queue, i, { itemId: e.itemId, lang: e.lang, stage: "review" });
    }
    log.push({ day, session, queue: queue.map((q) => `${q.lang}:${q.itemId}:${q.stage}`), rows });
  }
}

const END = T0 + DAY * 4;
out.log = log;
out.cards = Object.entries(state.cards).map(([id, c]) => [id, c.state, c.reps, c.lapses, c.stability, c.difficulty, c.due, c.introduced ?? null, (c as { placed?: boolean }).placed ?? false]);
out.stats = [state.stats.xp, state.stats.streak, state.stats.lastStudyDay];
out.progress = langProgress(sys, corpus, state, END).map((p) => [p.lang, p.total, p.started, p.mastered, p.due, p.retention, p.placedAt, p.grammarStarted, p.grammarTotal]);
out.units = unitStatus(sys, corpus, state, "fr").map((u) => [u.unit.id, u.total, u.started, u.unlocked, u.done]);
out.summary = (({ started, total, due, xp, streak, sharedRootItems }) => [started, total, due, xp, streak, sharedRootItems])(systemSummary(sys, corpus, state, END));
const a = { systems: [{ ...system, placement: { es: 2 } }], removed: {} };
const b = { systems: [{ ...system, updatedAt: T0 + 5, name: "renamed", placement: { es: 4, fr: 1 } }, { ...system, id: "x", createdAt: T0 - 1 }], removed: { x: T0 } };
out.merge = mergeSystems(a, b);

const sweepSys = createSystem("en", ["fr", "es", "it", "de", "ja"], [], T0);
const srng = seededRng(4242);
const sweep: unknown[] = [];
for (const item of corpus.items) {
  for (const lang of sweepSys.targets) {
    if (!item.forms[lang] || !item.forms["en"]) continue;
    if (item.kind === "gender" && !item.gender[lang]) continue;
    if (item.kind === "conj" && !item.conj[lang]) continue;
    for (const reps of [1, 2, 3, 5]) {
      const card = { state: reps === 5 ? "relearning" : "review", reps, lapses: reps === 5 ? 1 : 0, stability: 3, difficulty: 5, lastReview: T0, due: T0 };
      sweep.push(ex(exerciseFor(corpus, sweepSys, item, lang, card, srng, { speech: true, level: 1 + (reps % 3) })));
    }
  }
}
out.sweep = sweep;

const crng = seededRng(808);
const cross: unknown[] = [];
for (const item of corpus.items) {
  if (item.kind !== "word" && item.kind !== "phrase") continue;
  for (const lang of sweepSys.targets) {
    if (!item.forms[lang] || !item.forms["en"]) continue;
    const card = { state: "review", reps: 1, lapses: 0, stability: 3, difficulty: 5, lastReview: T0, due: T0 };
    const made = exerciseFor(corpus, sweepSys, item, lang, card, crng, { speech: false, level: 1 });
    if (!made || made.kind !== "choose") continue;
    const c = crossLanguageOptions(made, item, sweepSys, crng);
    cross.push({ itemId: item.id, lang, options: c.options ?? null, optionLangs: c.optionLangs ? Object.entries(c.optionLangs).map(([f, l]) => `${f}=${l}`).sort() : null });
  }
}
out.cross = cross;

const H_JUDGE: [string, string[], string][] = [
  ["שָׁלוֹם", ["שלום"], "he"], ["كتـاب", ["كتاب"], "ar"], ["كتاي", ["كتاب"], "ar"], ["يك", ["یک"], "fa"],
  ["еж", ["ёж"], "ru"], ["мои", ["мой"], "ru"], ["кни\u0301га", ["книга"], "ru"], ["моско", ["москва"], "ru"],
  ["καλημερα", ["καλημέρα"], "el"], ["ΟΔΟΣ", ["οδός"], "el"], ["नमसते", ["नमस्ते"], "hi"], ["ﾈｺ", ["ネコ"], "ja"],
  ["", ["猫"], "zh"], ["все", ["всё"], "ru"], ["ВСЁ", ["всё"], "ru"], ["еж", ["ёж"], "ru"], ["ねこ", ["猫", "ねこ"], "ja"], ["한국", ["한국".normalize("NFD")], "ko"],
];
const H_FOLD: [string, string][] = [["ru", "кни\u0301га"], ["el", "ΟΔΟΣ"], ["el", "ὀδός"], ["grc", "Ἀθῆναι"], ["he", " שָׁלוֹם! "], ["fa", "يك"], ["ja", "ﾈｺ"], ["uk", "ї"]];
const lrng = seededRng(31);
const hState = () => normalizeState(null);
let hs = hState();
const sched: unknown[] = [];
for (let round = 0; round < 3; round++) {
  const fresh = nextLetters(hs, "ru", 5).map((l) => l.ch);
  for (const ch of fresh) hs = gradeCard(hs, "ru", letterItemId(ch), round === 1 ? 1 : 3, T0 + round * 86400000, "UTC");
  sched.push([fresh.join(""), dueLetters(hs, "ru", T0 + (round + 5) * 86400000).map((l) => l.ch).join(""), alphabetDone(hs, "ru")]);
}
for (const l of alphabetUnit("ru")!.letters) hs = gradeCard(hs, "ru", letterItemId(l.ch), 3, T0, "UTC");
sched.push(["all", alphabetDone(hs, "ru"), nextLetters(hs, "ru", 5).length]);
const hSys = createSystem("en", ["ru", "el", "ja"], [], T0);
let hq = normalizeState(null);
for (const l of alphabetUnit("ru")!.letters.slice(0, 3)) hq = gradeCard(hq, "ru", letterItemId(l.ch), 3, T0, "UTC");
const hQueue = buildQueue(hSys, corpus, hq, T0 + 6 * 86400000, 14, { heritage: true }).map((e) => `${e.itemId}|${e.lang}|${e.stage}`);
const spell: string[] = [];
for (const item of corpus.items) {
  if (item.kind !== "word") continue;
  for (const lang of hSys.targets) {
    if (!item.forms[lang] || !item.forms["en"]) continue;
    const card = { state: "review", reps: 3, lapses: 0, stability: 3, difficulty: 5, lastReview: T0, due: T0 };
    const ex = exerciseFor(corpus, hSys, item, lang, card as never, seededRng(5), { speech: false, level: 1, heritage: true });
    spell.push(`${item.id}|${lang}|${ex.kind}|${ex.prompt}|${ex.answer}`);
  }
}
out.heritage = {
  judge: H_JUDGE.map(([g, e, l]) => judgeSpelled(g, e, l)),
  fold: H_FOLD.map(([l, x]) => foldMarks(x, l)),
  letters: [...HERITAGE_LANGS].sort().map((l) => {
    const u = alphabetUnit(l)!;
    return [0, 1, u.letters.length - 1].map((i) => {
      const x = letterExercise(l, "en", i, lrng)!;
      return `${l}|${x.prompt}|${x.answer}|${(x.options ?? []).join("")}|${(x.accept ?? []).join("")}`;
    });
  }),
  sched,
  spell,
  queue: hQueue,
};

const ARTICLE_CASES: [string, string, string][] = [["fr","m","haricot"],["fr","m","haricots"],["fr","m","hibou"],["fr","m","hiboux"],["fr","m","héros"],["fr","f","hache"],["fr","m","hamburger"],["fr","m","Homard"],["fr","f","honte"],["fr","m","hors-d'œuvre"],["fr","m","haut de gamme"],["fr","m","homme"],["fr","f","heure"],["fr","m","hôtel"],["fr","f","herbe"],["fr","m","ami"],["fr","f","eau"],["fr","m","livre"],["it","m","zero"],["it","f","acqua"],["it","m","libro"],["es","f","agua"],["es","f","casa"],["de","f","Kirche"]];
out.articles = ARTICLE_CASES.map(([l, g, n]) => articleWord(l, g, n));

writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
