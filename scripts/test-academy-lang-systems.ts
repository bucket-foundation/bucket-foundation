import fs from "node:fs";
import path from "node:path";
import { normalizeState, dayKey } from "../src/lib/academy/engine";
import { DAY_MS } from "../src/lib/academy/fsrs";
import {
  applyPlacement,
  buildLangCorpus,
  buildQueue,
  cardId,
  createSystem,
  exerciseFor,
  gradeCard,
  interleave,
  judgeTyped,
  langProgress,
  matchExercise,
  newToday,
  NEW_PER_LANG_PER_DAY,
  placementItems,
  placementTier,
  planSession,
  progressBranch,
  requeueAfterMiss,
  seededRng,
  sharedRootLangs,
  systemSummary,
  validateSystem,
  verdictRating,
} from "../src/lib/academy/lang-systems";

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
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"));
const NOW = Date.UTC(2026, 9, 17, 12);

ok(corpus.items.length >= 300, `corpus has words and phrases (${corpus.items.length})`);
ok(corpus.items.some((i) => i.kind === "phrase") && corpus.items.some((i) => i.kind === "word"), "both kinds present");
ok(corpus.items.every((x, k, a) => k === 0 || a[k - 1].tier <= x.tier), "items sorted by tier");
ok(corpus.items.some((i) => i.root && i.cognateLangs.length >= 2), "some items carry a shared root");

ok(validateSystem("en", []) === "no-targets", "empty target set rejected");
ok(validateSystem("en", ["en", "fr"]) === "root-in-targets", "root in targets rejected");
ok(validateSystem("en", ["xx"]) === "unknown-language", "unknown language rejected");
ok(validateSystem("en", ["fr", "es", "it", "de", "nl", "sv", "pl"]) === "too-many", "seven targets rejected");
const romance = createSystem("en", ["fr", "es", "it"], [], NOW);
ok(romance.id === "en-fr-es-it" && romance.name === "Romance from English", "Romance preset named");
ok(validateSystem("en", ["it", "fr", "es"], [romance]) === "duplicate", "same set rejected as duplicate");
const asian = createSystem("en", ["zh", "ja"], [romance], NOW);
ok(asian.name === "East Asian from English", "East Asian preset named");
const spanishRoot = createSystem("es", ["fr", "it"], [romance, asian], NOW);
ok(spanishRoot.root === "es" && progressBranch(spanishRoot) === "lang-sys-es-fr-it", "non-English root works and gets its own branch");

ok(judgeTyped("número", "número") === "exact", "exact match");
ok(judgeTyped("numero", "número") === "close", "missing accent is close");
ok(judgeTyped("Bonjour!", "bonjour") === "exact", "case and trailing punctuation ignored");
ok(judgeTyped("bonjuor", "bonjour") === "close", "one-edit typo is close");
ok(judgeTyped("chat", "chien") === "wrong", "different word is wrong");
ok(judgeTyped("", "x") === "wrong", "empty answer is wrong");
ok(verdictRating("exact") === 3 && verdictRating("close") === 2 && verdictRating("wrong") === 1, "verdict ratings");

{
  const s0 = normalizeState(null);
  const plan = planSession(romance, corpus, s0, NOW, 15);
  ok(plan.length === 15, "fresh session fills with new cards");
  const langs = new Set(plan.map((p) => p.lang));
  ok(langs.size === 3, "fresh session spans every target language");
  ok(plan.every((p, k) => k === 0 || p.lang !== plan[k - 1].lang), "new cards alternate languages");
  ok(plan.filter((p) => p.lang === "fr").length <= NEW_PER_LANG_PER_DAY, "new-per-language cap holds");
}

{
  const mixed = interleave([
    { itemId: "a", lang: "fr" },
    { itemId: "b", lang: "fr" },
    { itemId: "c", lang: "fr" },
    { itemId: "d", lang: "es" },
    { itemId: "e", lang: "es" },
  ]);
  ok(mixed.every((p, k) => k === 0 || p.lang !== mixed[k - 1].lang), "interleave avoids back-to-back languages when it can");
}

{
  let s = normalizeState(null);
  s = gradeCard(s, "fr", "eight", 3, NOW);
  s = gradeCard(s, "es", "eight", 1, NOW);
  ok(!!s.cards[cardId("fr", "eight")] && !!s.cards[cardId("es", "eight")], "cards keyed per language");
  ok(s.stats.xp === 5, "xp only for the recalled card");
  ok(s.stats.streak === 1 && s.stats.lastStudyDay === dayKey(NOW), "streak starts");
  ok(newToday(s, "fr", NOW) === 1 && newToday(s, "it", NOW) === 0, "new-today counted per language");
  const s2 = gradeCard(s, "fr", "eight", 3, NOW + DAY_MS);
  ok(s2.stats.streak === 2, "streak grows on the next day");
  const per = langProgress(romance, corpus, s, NOW);
  ok(per.find((p) => p.lang === "fr")!.started === 1 && per.find((p) => p.lang === "it")!.started === 0, "progress tracked per language");
  const later = planSession(romance, corpus, s, NOW + 2 * DAY_MS, 10);
  ok(later[0].itemId === "eight", "due cards come first");
  const sum = systemSummary(romance, corpus, s, NOW);
  ok(sum.started === 2 && sum.total > 0, "system summary sums languages");
}

{
  const s0 = normalizeState(null);
  const q = buildQueue(romance, corpus, s0, NOW, 9);
  const intros = q.filter((e) => e.stage === "intro");
  const checks = q.filter((e) => e.stage === "check");
  ok(intros.length === 9 && checks.length === 9, "each new card gets an intro and a later check");
  const first = q.findIndex((e) => e.stage === "intro");
  const firstCheck = q.findIndex((e) => e.stage === "check" && e.itemId === q[first].itemId && e.lang === q[first].lang);
  ok(firstCheck - first > 1, "check is spaced after its intro");
  ok(q[q.length - 1].stage === "match", "session ends on a cross-language match");
  const r = requeueAfterMiss(q, 0, { itemId: "zzz", lang: "fr", stage: "review" });
  ok(r.length === q.length + 1 && r[4].itemId === "zzz", "missed card comes back later in the session");
  ok(requeueAfterMiss(r, 0, { itemId: "zzz", lang: "fr", stage: "review" }) === r, "no double requeue");
  const twice = requeueAfterMiss(r, 4, { itemId: "zzz", lang: "fr", stage: "review" });
  ok(twice.length === r.length + 1, "second miss comes back once more");
  ok(requeueAfterMiss(twice, 8, { itemId: "zzz", lang: "fr", stage: "review" }) === twice, "a card stops returning after two retries");
}

{
  const rng = seededRng(7);
  const item = corpus.byId.get("eight")!;
  const intro = exerciseFor(corpus, romance, item, "fr", undefined, rng);
  ok(intro.kind === "intro" && intro.answer === "huit" && intro.prompt === "eight", "new card opens with an intro");
  const check = exerciseFor(corpus, romance, item, "fr", undefined, rng, { afterIntro: true });
  ok((check.kind === "choose" || check.kind === "cognate") && check.options!.includes("huit") && check.options!.length === 4, "check is four-way recognition");
  let s = normalizeState(null);
  for (let k = 0; k < 4; k++) s = gradeCard(s, "fr", "eight", 3, NOW + k * DAY_MS);
  const kinds = new Set<string>();
  for (let k = 0; k < 40; k++) kinds.add(exerciseFor(corpus, romance, item, "fr", s.cards[cardId("fr", "eight")], seededRng(k + 1), { speech: true }).kind);
  ok(kinds.has("translate") && kinds.has("speak") && kinds.has("type-heard"), `mature cards get production kinds (${Array.from(kinds).join(",")})`);
  let z = normalizeState(null);
  for (let k = 0; k < 4; k++) z = gradeCard(z, "ja", "eight", 3, NOW + k * DAY_MS);
  const jk = new Set<string>();
  for (let k = 0; k < 40; k++) jk.add(exerciseFor(corpus, asian, item, "ja", z.cards[cardId("ja", "eight")], seededRng(k + 1)).kind);
  ok(!jk.has("translate") && !jk.has("type-heard"), "non-Latin scripts stay on recognition");
  const m = matchExercise(corpus, romance, item, rng)!;
  ok(m.kind === "match" && m.pairs!.length === 3 && new Set(m.pairs!.map((p) => p.lang)).size === 3, "match pairs one word per language");
}

{
  const withCloze = corpus.items.find((i) => i.kind === "word" && i.example.es && i.example.es.toLowerCase().includes(i.forms.es.toLowerCase()));
  ok(!!withCloze, "some words carry a cloze sentence");
  if (withCloze) {
    let s = normalizeState(null);
    for (let k = 0; k < 4; k++) s = gradeCard(s, "es", withCloze.id, 3, NOW + k * DAY_MS);
    const ex = [...Array(60)].map((_, k) => exerciseFor(corpus, romance, withCloze, "es", s.cards[cardId("es", withCloze.id)], seededRng(k + 3))).find((e) => e.kind === "cloze");
    ok(!!ex && (ex.cloze!.before + ex.answer + ex.cloze!.after).toLowerCase() === withCloze.example.es.toLowerCase(), "cloze blanks the word in its sentence");
  }
}

{
  const germanic = createSystem("en", ["de", "nl", "sv"], [], NOW);
  const fam = corpus.items.filter((i) => sharedRootLangs(i, germanic).length >= 2);
  ok(fam.length > 10, `Germanic set exposes shared-root words (${fam.length})`);
  const item = fam.find((i) => sharedRootLangs(i, germanic).some((l) => germanic.targets.includes(l)))!;
  const lang = sharedRootLangs(item, germanic).find((l) => germanic.targets.includes(l))!;
  const ex = exerciseFor(corpus, germanic, item, lang, undefined, seededRng(3), { afterIntro: true });
  ok(ex.kind === "cognate" && (ex.family?.length ?? 0) >= 1, "first check on a shared-root word is a cognate drill");
}

{
  const items = placementItems(romance, corpus, "fr", seededRng(1));
  ok(items.length >= 10 && items.every((i) => i.forms.fr && i.forms.en), "placement samples across tiers");
  ok(placementTier([]) === 0, "no answers places at zero");
  ok(placementTier([{ tier: 0, correct: false }, { tier: 0, correct: false }]) === 0, "missing tier 0 places at zero");
  ok(
    placementTier([
      { tier: 0, correct: true },
      { tier: 0, correct: true },
      { tier: 2, correct: true },
      { tier: 2, correct: false },
      { tier: 4, correct: false },
      { tier: 4, correct: false },
    ]) === 4,
    "placement stops at the first failed tier"
  );
  const s = applyPlacement(normalizeState(null), { ...romance, placement: { fr: 4 } }, corpus, "fr", 4, NOW);
  const placed = Object.keys(s.cards).filter((k) => k.startsWith("fr:"));
  const expected = corpus.items.filter((i) => i.tier < 4 && i.forms.fr && i.forms.en).length;
  ok(placed.length === expected, `placement seeds known cards below the tier (${placed.length})`);
  ok(newToday(s, "fr", NOW) === 0, "placed cards do not use the new-card budget");
  const plan = planSession({ ...romance, placement: { fr: 4 } }, corpus, s, NOW, 15);
  ok(plan.filter((p) => p.lang === "fr").every((p) => corpus.byId.get(p.itemId)!.tier >= 4), "new French starts at the placed tier");
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nlang systems: all ok");
