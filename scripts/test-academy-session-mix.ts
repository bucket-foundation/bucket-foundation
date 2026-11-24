import fs from "node:fs";
import path from "node:path";
import { normalizeState, type EngineState } from "../src/lib/academy/engine";
import {
  buildLangCorpus,
  CHECK_GAP,
  cardId,
  createSystem,
  exerciseFor,
  gradeCard,
  isSentenceCard,
  isVocab,
  learnerLevel,
  letterQueue,
  type Exercise,
  newToday,
  seededRng,
  usable,
  type LangCard,
  type QueueEntry,
} from "../src/lib/academy/lang-systems";
import type { TopWord } from "../src/lib/academy/placement-cefr";
import {
  alternate,
  COMPARE_KINDS,
  curriculum,
  exerciseMix,
  FrequencyRank,
  gateComparisons,
  letterSessionExercise,
  mastered,
  soundAllowed,
  longestRun,
  mastery,
  masteryTable,
  OPEN_MIX,
  sentenceItemId,
  session,
  sessionExercise,
  SOUND_KINDS,
  SoundTally,
  soundShare,
  stage,
  startedCount,
  StudyRound,
} from "../src/lib/academy/session-mix";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const dir = path.resolve(__dirname, "../apple/Shared/Corpus");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const NOW = 1_700_000_000_000;
const freq = (langs: string[]) => new FrequencyRank(Object.fromEntries(langs.map((l) => [l, read(`top1000/${l}.json`) as TopWord[]])));
const empty = (): EngineState => normalizeState({});
const masteredCard = (): LangCard => ({ state: "review", stability: 200, reps: 8 });
const gaps = (q: QueueEntry[]) =>
  q.flatMap((e, i) => {
    if (e.stage !== "check") return [];
    let j = -1;
    for (let k = i - 1; k >= 0; k--) if (q[k].stage === "intro" && q[k].itemId === e.itemId && q[k].lang === e.lang) { j = k; break; }
    return j < 0 ? [] : [i - j - 1];
  });

{
  const sys = createSystem("en", ["es"], [], 0);
  const f = freq(["es"]);
  const list = curriculum(corpus, sys, "es", f);
  const ranks = list.map((i) => f.rank(i, "es"));
  ok(ranks.every((r, k) => k === 0 || ranks[k - 1] <= r), "curriculum follows the top-1000 rank");
  ok(ranks.some((r) => r < 1000), "curriculum holds ranked words");
  ok(list.some((i) => i.kind === "phrase") && list.some((i) => i.kind === "word"), "curriculum mixes words and phrases");
  const ranked = list.find((i) => f.ranks.es.has(i.forms.es.toLowerCase()))!;
  ok(f.rank(ranked, "es") === f.ranks.es.get(ranked.forms.es.toLowerCase()), "a listed word takes its table rank");
}

{
  const sys = createSystem("en", ["es"], [], 0);
  const word = corpus.items.find((i) => i.kind === "word" && i.forms.es)!;
  const phrase = corpus.items.find((i) => i.kind === "phrase" && i.forms.es)!;
  let state = empty();
  ok(stage(word, state, "es") === "word", "a fresh word sits at the word stage");
  state = gradeCard(state, "es", word.id, 3, NOW, "UTC");
  state = gradeCard(state, "es", phrase.id, 3, NOW, "UTC");
  state = gradeCard(state, "es", sentenceItemId("s1"), 3, NOW, "UTC");
  const table = masteryTable(sys, corpus, state, "es");
  ok(table.some((m) => m.id === word.id && m.stage === "word" && m.mastery > 0), "mastery tracked per word");
  ok(table.some((m) => m.id === phrase.id && m.stage === "phrase" && m.mastery > 0), "mastery tracked per phrase");
  ok(table.some((m) => m.id === "sent:s1" && m.stage === "sentence" && m.mastery > 0), "mastery tracked per sentence");
  state.cards[cardId("es", word.id)] = masteredCard();
  ok(stage(word, state, "es") === "sentence", "a mastered word moves to sentences");
}

{
  const sys = createSystem("en", ["ru", "es", "fr"], [], 0);
  const state = empty();
  const writing = letterQueue(sys, state, NOW);
  ok(writing.length > 0, "a Cyrillic system queues letters");
  const lead = corpus.items.filter((i) => isVocab(i) && i.forms.ru).slice(0, 2).flatMap((i): QueueEntry[] => [{ itemId: i.id, lang: "ru", stage: "intro" }, { itemId: i.id, lang: "ru", stage: "check" }]);
  const q = session(sys, corpus, state, NOW, freq(sys.targets), { lead, heritage: true });
  ok(q.some((e) => e.stage === "letter"), "the session carries letter entries");
  const round = new StudyRound(q);
  const rng = seededRng(7);
  const seen = empty();
  round.queue.forEach((e, i) => {
    if (e.stage === "letter") seen.cards[cardId(e.lang, e.itemId)] = { state: "review" };
    const ex = sessionExercise(e, sys, corpus, seen, round.tally, rng, { speech: true, heritage: true });
    if (!ex) return;
    round.record(ex.kind, String(i));
    round.record(ex.kind, String(i));
  });
  ok(round.tally.asked >= 10, `the round asks enough questions (${round.tally.asked})`);
  ok(round.tally.sounds <= soundShare(0) * round.tally.asked, `sound cap holds across the session builder (${round.tally.sounds}/${round.tally.asked})`);
}

{
  const round = new StudyRound([]);
  round.record("listen", "0");
  round.record("listen", "0");
  round.record("intro", "1");
  ok(round.tally.asked === 1 && round.tally.sounds === 1, "tally counts a key once");
  round.restart([{ itemId: "a", lang: "es", stage: "review" }]);
  ok(round.tally.asked === 0 && round.tally.sounds === 0 && round.tally instanceof SoundTally, "restart clears the tally");
  ok(round.queue.length === 1, "restart swaps the queue");
}

{
  const sys = createSystem("en", ["es", "ru"], [], 0);
  const mix = { sound: false, compare: false };
  let clean = true;
  for (const item of corpus.items.filter(isVocab).slice(0, 40))
    for (const lang of sys.targets.filter((l) => item.forms[l]))
      for (const reps of [1, 2, 5])
        for (let k = 0; k < 10; k++) {
          const ex = exerciseFor(corpus, sys, item, lang, { state: "review", reps, stability: 3 }, seededRng(k), { speech: true, heritage: true, mix });
          if (SOUND_KINDS.has(ex.kind) || COMPARE_KINDS.has(ex.kind)) clean = false;
        }
  ok(clean, "blocked sound and compare never yield those kinds");
}

{
  const sys = createSystem("en", ["es", "fr", "ru"], [], 0);
  let same = true;
  for (const item of corpus.items.slice(0, 60))
    for (const lang of sys.targets.filter((l) => usable(item, sys.root, l)))
      for (const reps of [0, 1, 2, 5])
        for (let k = 0; k < 6; k++) {
          const card: LangCard | undefined = reps === 0 ? undefined : { state: "review", reps };
          const a = seededRng(k);
          const b = seededRng(k);
          const o = { speech: true, afterIntro: k % 2 === 0, heritage: k % 3 === 0 };
          const x = exerciseFor(corpus, sys, item, lang, card, a, o);
          const y = exerciseFor(corpus, sys, item, lang, card, b, { ...o, mix: OPEN_MIX });
          if (JSON.stringify(x) !== JSON.stringify(y) || a() !== b()) same = false;
        }
  ok(same, "open mix reproduces the default exercise");
}

{
  const q: QueueEntry[] = [
    ...Array.from({ length: 6 }, (_, k): QueueEntry => ({ itemId: `a${k}`, lang: "es", stage: "review" })),
    ...Array.from({ length: 6 }, (_, k): QueueEntry => ({ itemId: `b${k}`, lang: "fr", stage: "review" })),
  ];
  const out = alternate(q);
  ok(longestRun(out) === 1, "alternate breaks single-language runs");
  ok(out.filter((e) => e.lang === "es").map((e) => e.itemId).join() === "a0,a1,a2,a3,a4,a5", "alternate keeps order per language");
}

{
  const sys = createSystem("en", ["fr", "es", "it"], [], 0);
  const q = session(sys, corpus, empty(), NOW, freq(sys.targets));
  ok(q.length >= 20, `session is full (${q.length})`);
  ok(longestRun(q) <= 2, `session alternates languages (run ${longestRun(q)})`);
  ok(gaps(q).every((g) => g >= CHECK_GAP), "session keeps check gaps");
  ok(q.filter((e) => e.stage === "check").length === q.filter((e) => e.stage === "intro").length, "every intro keeps its check");
}

{
  const sys = createSystem("en", ["fr", "es"], [], 0);
  const item = corpus.items.find((i) => isVocab(i) && i.forms.fr && i.forms.es && i.forms.en)!;
  const match: QueueEntry[] = [{ itemId: item.id, lang: "fr", stage: "match" }];
  const state = empty();
  state.cards[cardId("fr", item.id)] = masteredCard();
  ok(gateComparisons(match, sys, corpus, state).length === 0, "comparison waits while one language is unmastered");
  state.cards[cardId("es", item.id)] = masteredCard();
  ok(gateComparisons(match, sys, corpus, state).length === 1, "comparison opens once every language is mastered");
  ok(!session(sys, corpus, empty(), NOW, freq(sys.targets)).some((e) => e.stage === "match"), "a fresh session holds no comparison");
}

{
  const sys = createSystem("en", ["fr", "es", "it"], [], 0);
  const item = corpus.items.find((i) => sys.targets.some((l) => i.falseFriends[l]))!;
  const lang = sys.targets.find((l) => item.falseFriends[l])!;
  const state = empty();
  ok(!exerciseMix(sys, item, lang, state, new SoundTally()).compare, "false friends wait on a fresh card");
  state.cards[cardId(lang, item.id)] = { state: "review", stability: 16 };
  const m = mastery(state, lang, item.id);
  ok(m >= 0.5 && m < 0.8, `stability 16 sits between the bars (${m.toFixed(3)})`);
  ok(exerciseMix(sys, item, lang, state, new SoundTally()).compare, "false friends open at half mastery");
}

{
  const sys = createSystem("en", ["es"], [], 0);
  let state = empty();
  for (let k = 0; k < 70; k++) state = gradeCard(state, "es", sentenceItemId(`s${k}`), 3, NOW, "UTC");
  ok(isSentenceCard(cardId("es", "sent:s1")) && !isSentenceCard(cardId("es", "w-1")), "sentence cards are recognised");
  ok(newToday(state, "es", NOW) === 0, "sentence cards stay out of the new-card budget");
  ok(startedCount(state, sys) === 0, "sentence cards stay out of the started count");
  ok(learnerLevel(state, "es") === 1, "sentence cards stay out of the learner level");
}

{
  ok(soundShare(39) === 0.1 && soundShare(40) === 0.25 && soundShare(149) === 0.25 && soundShare(150) === 0.4, "sound share steps at 40 and 150 started cards");
  const run = (started: number, n: number) => {
    const t = new SoundTally();
    let out = "";
    for (let k = 0; k < n; k++) {
      const yes = soundAllowed(t, started);
      out += yes ? "T" : "F";
      t.record(yes ? "listen" : "choose", String(k));
    }
    return out;
  };
  ok(run(0, 20) === "FFFFFFFFFTFFFFFFFFFT", `a beginner hears one sound question in ten (${run(0, 20)})`);
  ok(run(40, 8) === "FFFTFFFT", `the middle tier hears one in four (${run(40, 8)})`);
  ok(run(150, 10) === "FFTFTFFTFT", `the top tier hears two in five (${run(150, 10)})`);
}

{
  const sys = createSystem("en", ["fr", "es"], [], 0);
  const item = corpus.items.find((i) => isVocab(i) && i.forms.fr && i.forms.es && i.forms.en)!;
  const at = (m: number): EngineState => {
    const s = empty();
    const stability = -21 * Math.log(1 - m);
    s.cards[cardId("fr", item.id)] = { state: "review", stability, reps: 5 };
    s.cards[cardId("es", item.id)] = { state: "review", stability, reps: 5 };
    return s;
  };
  ok(!mastered(at(0.79), "fr", item.id) && mastered(at(0.81), "fr", item.id), "mastery bar sits between 0.79 and 0.81");
  const match: QueueEntry[] = [{ itemId: item.id, lang: "fr", stage: "match" }];
  ok(gateComparisons(match, sys, corpus, at(0.79)).length === 0 && gateComparisons(match, sys, corpus, at(0.81)).length === 1, "comparison gate opens between 0.79 and 0.81");
}

{
  const sys = createSystem("en", ["es"], [], 0);
  const item = corpus.items.find((i) => i.kind === "word" && usable(i, "en", "es") && !i.falseFriends.es)!;
  const state = empty();
  state.cards[cardId("es", item.id)] = { state: "review", reps: 2, stability: 3 };
  const entry: QueueEntry = { itemId: item.id, lang: "es", stage: "review" };
  const low = () => 0;
  const fresh = new SoundTally();
  ok(sessionExercise(entry, sys, corpus, state, fresh, low)!.kind === "reverse", "a forced listen roll is swapped while the cap is full");
  const open = new SoundTally();
  for (let k = 0; k < 9; k++) open.record("choose", String(k));
  ok(sessionExercise(entry, sys, corpus, state, open, low)!.kind === "listen", "the same roll plays once the cap has room");
}

{
  const sys = createSystem("en", ["ru"], [], 0);
  const id = letterQueue(sys, empty(), NOW)[0];
  const heard = (lang: string, root: string, itemId: string): Exercise => ({ itemId, lang, root, kind: "letter-sound", prompt: "", promptLang: lang, answer: "", answerLang: lang });
  ok(letterSessionExercise(id, sys, empty(), new SoundTally(), seededRng(1), heard)!.kind === "letter", "a blocked sound letter falls back to the letter drill");
  const open = new SoundTally();
  for (let k = 0; k < 9; k++) open.record("choose", String(k));
  ok(letterSessionExercise(id, sys, empty(), open, seededRng(1), heard)!.kind === "letter-sound", "a sound letter plays once the cap has room");
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nsession mix: all ok");
