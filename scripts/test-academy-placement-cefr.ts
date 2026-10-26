import fs from "fs";
import path from "path";
import { normalizeState } from "../src/lib/academy/engine";
import { buildLangCorpus, cardId, createSystem, mergeSystems, seededRng, unitStatus, type LangSystem } from "../src/lib/academy/lang-systems";
import {
  applyCefrPlacement,
  BAND_ITEMS,
  bandsAvailable,
  CEFR_MAX_ITEMS,
  cefrPlacement,
  cefrQuestion,
  cefrStep,
  levelLabel,
  wilsonLower,
  type CefrAnswer,
  type CefrBand,
  type CefrTask,
} from "../src/lib/academy/placement-cefr";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const dir = path.resolve(__dirname, "../learning/app/corpus");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const NOW = Date.UTC(2026, 9, 26, 12);

function run(system: LangSystem, lang: string, knows: (band: CefrBand, task: CefrTask, i: number) => boolean, seed = 7) {
  const answers: CefrAnswer[] = [];
  const seen = new Set<string>();
  const rng = seededRng(seed);
  const available = bandsAvailable(system, corpus, lang);
  const tasks: CefrTask[] = [];
  let step = cefrStep(answers, available);
  while (!step.done && answers.length < 100) {
    const q = cefrQuestion(system, corpus, lang, step.next!.band, step.next!.task, seen, rng, { speech: true });
    if (!q) {
      step = { ...step, done: true, unknownFrom: step.next!.band };
      break;
    }
    tasks.push(q.task);
    seen.add(q.ex.itemId);
    answers.push({ band: step.next!.band, task: q.task, itemId: q.ex.itemId, correct: knows(step.next!.band, q.task, answers.length) });
    step = cefrStep(answers, available);
  }
  return { answers, step, tasks, placement: cefrPlacement(corpus, lang, answers, step) };
}

{
  const s = cefrStep([]);
  ok(!s.done && s.next?.band === "A1" && s.next.task === "recognize", "test opens on an A1 recognition item");
  const sixRecognize: CefrAnswer[] = Array.from({ length: 6 }, (_, i) => ({ band: "A1", task: "recognize", itemId: `x${i}`, correct: true }));
  ok(!cefrStep(sixRecognize).bands[0].passed, "six right with no typed recall does not pass a band");
  const withRecall = [...sixRecognize.slice(0, 5), { band: "A1" as const, task: "recall" as const, itemId: "y", correct: true }];
  ok(cefrStep(withRecall).bands[0].passed && cefrStep(withRecall).next?.band === "A2", "six right with one typed recall passes and moves to A2");
  const threeWrong: CefrAnswer[] = Array.from({ length: 3 }, (_, i) => ({ band: "A1", task: "recall", itemId: `w${i}`, correct: false }));
  const fail = cefrStep(threeWrong);
  ok(fail.done && fail.level === "pre-A1", "three misses at A1 report pre-A1");
  ok(cefrStep([], ["A1"]).done === false && cefrStep([...withRecall], ["A1"]).unknownFrom === "A2", "a band the corpus cannot fill stops the test and marks the level above unknown");
  ok(wilsonLower(6, 8) > 0.4 && wilsonLower(6, 8) < 0.5 && wilsonLower(0, 0) === 0, "band confidence is the Wilson lower bound");
}

const sys = createSystem("en", ["es", "fr", "de"], [], NOW);

for (const lang of ["es", "fr", "de"]) {
  const avail = bandsAvailable(sys, corpus, lang);
  ok(avail.length === 4, `${lang} has material for all four bands (${avail.join(",")})`);

  const strong = run(sys, lang, () => true);
  ok(strong.step.level === "B2", `${lang}: a strong learner reaches B2 (${strong.step.level})`);
  ok(strong.step.bands.every((b) => b.passed && b.asked >= 6 && b.recallRight >= 1), `${lang}: B2 comes only from four passed bands of checks`);
  ok(strong.answers.length <= CEFR_MAX_ITEMS, `${lang}: strong learner answers ${strong.answers.length} of at most ${CEFR_MAX_ITEMS}`);
  ok(new Set(strong.tasks).size >= 4, `${lang}: items mix ${new Set(strong.tasks).size} task kinds`);
  const right = new Set(strong.answers.filter((a) => a.correct).map((a) => a.itemId));
  ok(strong.placement.placeIds.every((id) => right.has(id)), `${lang}: only words answered right are placed`);
  ok(strong.placement.placeIds.length <= strong.answers.length, `${lang}: placed count ${strong.placement.placeIds.length} stays within the questions asked`);
  const state = applyCefrPlacement(normalizeState(null), { ...sys, placement: { [lang]: strong.placement.floorTier } }, corpus, lang, strong.placement, NOW);
  const cards = Object.keys(state.cards).filter((id) => id.startsWith(`${lang}:`));
  ok(cards.length === strong.placement.placeIds.length && cards.length <= CEFR_MAX_ITEMS, `${lang}: placement writes ${cards.length} cards, no tier fill`);
  ok(strong.placement.floorTier === 7, `${lang}: B2 skips new words only below B1 (floor ${strong.placement.floorTier})`);
  const units = unitStatus({ ...sys, placement: { [lang]: strong.placement.floorTier } }, corpus, state, lang);
  ok(units[1]?.unlocked === true, `${lang}: skipped words still unlock the next unit`);

  const aOnly = run(sys, lang, (band) => band === "A1" || band === "A2");
  ok(aOnly.step.level === "A2" && aOnly.placement.floorTier === 0, `${lang}: an A-level learner reports A2 and skips no words`);
  ok(aOnly.placement.placeIds.length > 0 && aOnly.placement.placeIds.every((id) => corpus.byId.get(id)!.tier <= 6), `${lang}: A2 places only checked A-band words`);

  const a1 = run(sys, lang, (band) => band === "A1");
  ok(a1.step.level === "A1" && a1.placement.placeIds.length === 0, `${lang}: one passed band places nothing`);

  const noRecall = run(sys, lang, (_, task) => task !== "recall");
  ok(noRecall.step.level === "pre-A1" && noRecall.placement.placeIds.length === 0, `${lang}: a learner who cannot type any answer is not placed`);

  let g = seededRng(3);
  const guesser = run(sys, lang, () => g() < 0.3);
  ok(guesser.step.level === "pre-A1", `${lang}: a 30 percent guesser stays pre-A1`);
  g = seededRng(5);
  const shaky = run(sys, lang, (band) => (band === "A1" ? true : g() < 0.5));
  ok(shaky.step.level === "A1" || shaky.step.level === "A2", `${lang}: a learner at 50 percent above A1 stops by A2 (${shaky.step.level})`);
}

{
  const la = createSystem("en", ["la"], [], NOW);
  const r = run(la, "la", () => true);
  ok(r.placement.mapping === "none" && levelLabel(r.placement).startsWith("band"), "Latin reports bands with no CEFR claim");
  ok(r.answers.length <= CEFR_MAX_ITEMS, `Latin run stays bounded (${r.answers.length}, bands ${bandsAvailable(la, corpus, "la").join(",") || "none"})`);
}

{
  const base = createSystem("en", ["es"], [], NOW);
  const a = { systems: [{ ...base, levels: { es: "A2" } }], removed: {} };
  const b = { systems: [{ ...base, updatedAt: NOW + 5, levels: { fr: "A1" } }], removed: {} };
  const m = mergeSystems(a, b).systems[0];
  ok(m.levels?.es === "A2" && m.levels?.fr === "A1", "merge keeps reported levels from both copies");
  ok(BAND_ITEMS === 8 && cardId("es", "x") === "es:x", "constants hold");
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nplacement cefr: all ok");
