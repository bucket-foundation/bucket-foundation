import fs from "node:fs";
import path from "node:path";
import { normalizeState, dayKey } from "../src/lib/academy/engine";
import { DAY_MS } from "../src/lib/academy/fsrs";
import {
  articleFor,
  articleWord,
  availableSystems,
  LANGS as CATALOG_LANGS,
  SYSTEM_CATALOG,
  applyPlacement,
  buildLangCorpus,
  buildQueue,
  cardId,
  createSystem,
  exerciseFor,
  gradeCard,
  gradeMatch,
  learnerLevel,
  editSystem,
  mergeSystems,
  interleave,
  judgeTyped,
  langProgress,
  matchExercise,
  newToday,
  NEW_PER_LANG_PER_DAY,
  PLACEMENT_MAX_ITEMS,
  PLACEMENT_TIERS,
  placementItem,
  placementOptions,
  placementStep,
  planSession,
  progressBranch,
  requeueAfterMiss,
  seededRng,
  sharedRootLangs,
  systemSummary,
  unitStatus,
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
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const NOW = Date.UTC(2026, 9, 17, 12);

ok(corpus.items.length >= 300, `corpus has words and phrases (${corpus.items.length})`);
ok(corpus.items.some((i) => i.kind === "phrase") && corpus.items.some((i) => i.kind === "word"), "both kinds present");
ok(corpus.items.every((x, k, a) => k === 0 || a[k - 1].unit < x.unit || (a[k - 1].unit === x.unit && a[k - 1].tier <= x.tier)), "items sorted by unit then tier");
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
  for (const level of [0, 3, 5, 9, 11]) {
    const answers: { tier: number; correct: boolean }[] = [];
    let step = placementStep(answers);
    while (!step.done) {
      answers.push({ tier: step.nextTier!, correct: step.nextTier! < level });
      step = placementStep(answers);
    }
    const want = PLACEMENT_TIERS.find((t) => t >= level) ?? 11;
    ok(step.tier === want, `adaptive placement finds level ${level} as tier ${step.tier} in ${answers.length} questions`);
    ok(answers.length >= 2 && answers.length <= PLACEMENT_MAX_ITEMS, "placement asks between 2 and 18 questions");
  }
  {
    const noisy = [true, false, true, false, true, false, true, false, true, false, true, false];
    const answers: { tier: number; correct: boolean }[] = [];
    let step = placementStep(answers);
    let k = 0;
    while (!step.done) {
      answers.push({ tier: step.nextTier!, correct: noisy[k++ % noisy.length] });
      step = placementStep(answers);
    }
    ok(answers.length <= PLACEMENT_MAX_ITEMS, `noisy answers still stop at the cap (${answers.length})`);
  }
  {
    let step = placementStep([]);
    ok(step.nextTier === 0 && step.nextMode === "recognize", "placement starts at the first tier with a recognition item");
    step = placementStep([{ tier: 0, correct: true }]);
    ok(step.nextTier === 0 && step.nextMode === "produce", "the second item of a tier asks for a typed answer");
    ok(placementStep([{ tier: 0, correct: true }, { tier: 0, correct: true }]).nextTier === 2, "two right at a tier moves up one tier");
    ok(placementStep([{ tier: 0, correct: true }, { tier: 0, correct: false }, { tier: 0, correct: false }]).tier === 0, "two misses at a tier stop placement there");
    const climbed = [0, 2, 4].flatMap((t) => [{ tier: t, correct: true }, { tier: t, correct: true }]);
    const stop = placementStep([...climbed, { tier: 6, correct: false }, { tier: 6, correct: false }, { tier: 8, correct: true }]);
    ok(stop.done && stop.tier === 6, "placement stops at the first tier that fails");
  }
  {
    const basics = (t: number) => t < 2;
    const answers: { tier: number; correct: boolean }[] = [];
    let step = placementStep(answers);
    while (!step.done) {
      answers.push({ tier: step.nextTier!, correct: basics(step.nextTier!) });
      step = placementStep(answers);
    }
    ok(step.tier === 2, `a learner who knows only the first tier places at tier 2 (${step.tier})`);
  }
  {
    let s0 = 7;
    const roll = () => ((s0 = (s0 * 48271) % 2147483647) / 2147483647);
    const tiers: number[] = [];
    for (let run = 0; run < 400; run++) {
      const answers: { tier: number; correct: boolean }[] = [];
      let step = placementStep(answers);
      while (!step.done) {
        answers.push({ tier: step.nextTier!, correct: step.nextMode === "produce" ? false : roll() < 0.25 });
        step = placementStep(answers);
      }
      tiers.push(step.tier);
    }
    tiers.sort((a, b) => a - b);
    ok(tiers[200] === 0, `a random guesser places at tier 0 at the median (${tiers[200]})`);
    ok(tiers.filter((t) => t >= 4).length / tiers.length < 0.02, "a random guesser reaches tier 4 in under 2% of runs");
  }
  const seen = new Set<string>();
  const first = placementItem(romance, corpus, "fr", 4, seen, seededRng(1))!;
  ok(first.tier === 4 && first.kind === "word", "placement item comes from the probed tier");
  const opts = placementOptions(corpus, first, "fr", "en", seededRng(2));
  ok(opts.length === 4 && opts.includes(first.forms.fr), "placement options hold the answer");
  const s = applyPlacement(normalizeState(null), { ...romance, placement: { fr: 4 } }, corpus, "fr", 4, NOW);
  const placed = Object.keys(s.cards).filter((k) => k.startsWith("fr:"));
  const expected = corpus.items.filter((i) => (i.kind === "word" || i.kind === "phrase") && i.tier < 4 && i.forms.fr && i.forms.en).length;
  ok(placed.length === expected, `placement seeds known cards below the tier (${placed.length})`);
  ok(newToday(s, "fr", NOW) === 0, "placed cards do not use the new-card budget");
  const plan = planSession({ ...romance, placement: { fr: 4 } }, corpus, s, NOW, 15);
  ok(plan.filter((p) => p.lang === "fr").every((p) => corpus.byId.get(p.itemId)!.tier >= 4), "new French starts at the placed tier");
}

{
  const units = unitStatus(romance, corpus, normalizeState(null), "fr");
  ok(units.length >= 10 && units[0].unlocked && !units[1].unlocked, "only the first unit is open at the start");
  let s = normalizeState(null);
  for (const i of corpus.items.filter((x) => x.unit === 0 && x.kind === "word" && x.forms.fr)) s = gradeCard(s, "fr", i.id, 3, NOW);
  const after = unitStatus(romance, corpus, s, "fr");
  ok(after[0].done && after[1].unlocked && !after[2].unlocked, "finishing a unit opens the next one");
  const plan = planSession(romance, corpus, normalizeState(null), NOW, 15);
  ok(plan.every((p) => corpus.byId.get(p.itemId)!.unit === 0), "new cards come from open units");
  ok(!plan.some((p) => p.itemId.startsWith("g-") || p.itemId.startsWith("c-")), "grammar waits for its word");
}

{
  const rng = seededRng(5);
  const dog = corpus.byId.get("g-dog")!;
  const g = exerciseFor(corpus, romance, dog, "fr", undefined, rng, { afterIntro: true });
  ok(g.kind === "gender" && g.answer === "le" && g.options!.includes("la") && g.prompt === "chien", "gender drill asks for the article");
ok(articleFor("it", "m", "zero") === "lo zero" && articleFor("it", "m", "studente") === "lo studente" && articleFor("it", "m", "libro") === "il libro", "Italian lo before z and s plus consonant");
ok(articleFor("it", "m", "amico") === "l'amico" && articleFor("fr", "f", "eau") === "l'eau" && articleFor("fr", "m", "homme") === "l'homme", "elision before a vowel or mute h");
ok(articleFor("es", "f", "agua") === "el agua" && articleFor("es", "f", "hambre") === "el hambre" && articleFor("es", "f", "casa") === "la casa", "Spanish el before stressed a");
ok(articleWord("it", "m", "sole") === "il" && articleWord("it", "m", "gnomo") === "lo", "lo only before s plus consonant, z, gn");
  const eat = corpus.byId.get("c-eat")!;
  const c1 = exerciseFor(corpus, romance, eat, "es", undefined, seededRng(1), { afterIntro: true });
  ok(c1.kind === "conjugate" && !!c1.person && eat.conj.es.includes(c1.answer) && c1.options!.includes(c1.answer), "conjugation drill starts as a choice");
  let s = normalizeState(null);
  for (let k = 0; k < 3; k++) s = gradeCard(s, "es", "c-eat", 3, NOW + k * DAY_MS);
  const c2 = exerciseFor(corpus, romance, eat, "es", s.cards[cardId("es", "c-eat")], seededRng(2));
  ok(c2.kind === "conjugate" && !c2.options, "a known verb is typed");

  let w = normalizeState(null);
  for (let k = 0; k < 4; k++) w = gradeCard(w, "fr", "dog", 3, NOW + k * DAY_MS);
  const kinds = new Map<string, ReturnType<typeof exerciseFor>>();
  for (let k = 0; k < 80; k++) {
    const e = exerciseFor(corpus, romance, corpus.byId.get("dog")!, "fr", w.cards[cardId("fr", "dog")], seededRng(k + 100));
    kinds.set(e.kind, e);
  }
  const sent = kinds.get("sentence");
  ok(!!sent && sent.options!.includes(sent.answer) && sent.options!.length >= 2 && !!corpus.pool[sent.sentenceId!].t.en, "sentence translation offers the Tatoeba sentence");
  const bank = kinds.get("wordbank");
  ok(!!bank && bank.accept![0].split(" ").every((t) => bank.tokens!.includes(t)), "word bank holds every token of the sentence");

  let f = normalizeState(null);
  f = gradeCard(f, "fr", "bread", 3, NOW);
  const ffKinds = new Set<string>();
  for (let k = 0; k < 40; k++) ffKinds.add(exerciseFor(corpus, romance, corpus.byId.get("bread")!, "fr", f.cards[cardId("fr", "bread")], seededRng(k + 7)).kind);
  ok(ffKinds.has("false-friend"), "a false friend gets its own drill");
  const ff = exerciseFor(corpus, romance, corpus.byId.get("bread")!, "fr", undefined, seededRng(1));
  ok(ff.kind === "intro" && ff.falseFriend?.looksLike === "pain", "intro warns about the false friend");

  const asianIntro = exerciseFor(corpus, asian, corpus.byId.get("woman")!, "zh", undefined, seededRng(1));
  ok(asianIntro.answer === "女人" && !!asianIntro.answerReading?.roman, "Mandarin card carries pinyin");
  const ja = exerciseFor(corpus, asian, corpus.byId.get("eat")!, "ja", undefined, seededRng(1));
  ok(!!ja.answerReading?.kana && !!ja.answerReading?.roman, "Japanese card carries kana and romaji");
  const m = matchExercise(corpus, asian, corpus.byId.get("eat")!, seededRng(1))!;
  ok(m.pairs!.every((p) => !!p.reading?.roman), "match pairs carry readings");
}

{
  const pairs = [
    { lang: "fr", word: "main" },
    { lang: "es", word: "mano" },
    { lang: "it", word: "mano" },
  ];
  const swapped = gradeMatch(pairs, { fr: "fr", es: "it", it: "es" });
  ok(swapped.every((r) => r.correct), "identical forms accept either language");
  const wrong = gradeMatch(pairs, { fr: "es", es: "fr", it: "it" });
  ok(!wrong[0].correct && !wrong[1].correct && wrong[2].correct, "a real mismatch is still wrong");
  const hand = matchExercise(corpus, romance, corpus.byId.get("hand")!, seededRng(1))!;
  ok(new Set(hand.pairs!.map((p) => p.lang)).size === 3, "match rows are keyed by language even when forms repeat");
}

{
  let s = normalizeState(null);
  for (let k = 0; k < 4; k++) s = gradeCard(s, "fr", "c-go", 3, NOW + k * DAY_MS);
  const tenses = new Set<string>();
  for (let k = 0; k < 30; k++) tenses.add(exerciseFor(corpus, romance, corpus.byId.get("c-go")!, "fr", s.cards[cardId("fr", "c-go")], seededRng(k + 9)).tense ?? "");
  ok(tenses.has("past") && tenses.has("present"), "mature verbs drill both tenses");
  const elide = exerciseFor(corpus, romance, corpus.byId.get("c-love")!, "fr", undefined, seededRng(3), { afterIntro: true });
  ok(!elide.note!.includes("je ai") && !elide.note!.includes("je aime"), "French je elides in tables");
  ok(learnerLevel(normalizeState(null), "fr") === 1, "a new learner reads A1 sentences");
  const lvl = (lv: number) => {
    let w = normalizeState(null);
    for (let k = 0; k < 4; k++) w = gradeCard(w, "de", "dog", 3, NOW + k * DAY_MS);
    const seen = new Set<number>();
    for (let k = 0; k < 60; k++) {
      const e = exerciseFor(corpus, createSystem("en", ["de"], [], NOW), corpus.byId.get("dog")!, "de", w.cards[cardId("de", "dog")], seededRng(k + 300), { level: lv });
      if (e.level) seen.add(e.level);
    }
    return seen;
  };
  ok(Array.from(lvl(1)).every((x) => x === 1), "sentences stay at the learner's level");
  const edited = editSystem(romance, ["fr", "es", "it", "pt"], NOW + 5);
  const merged = mergeSystems({ systems: [romance], removed: {} }, { systems: [edited], removed: {} });
  ok(merged.systems[0].targets.length === 4 && merged.systems[0].name.includes("Portuguese"), "the newer edit wins the merge");
}

{
  const names = SYSTEM_CATALOG.map((c) => c.name);
  ok(["Romance", "Germanic", "Semitic"].every((n) => names.includes(n)), "catalog lists Romance, Germanic and Semitic");
  ok(SYSTEM_CATALOG.find((c) => c.name === "Semitic")!.targets.includes("he"), "Semitic carries Hebrew");
  ok(SYSTEM_CATALOG.every((c) => c.targets.every((t) => CATALOG_LANGS[t] && t !== "en")), "every catalog language is in the course and differs from the root");
  ok(availableSystems([]).length === SYSTEM_CATALOG.length, "a new learner sees the whole catalog");
  const romance = createSystem("en", ["it", "fr", "es"], []);
  ok(romance.name === "Romance from English", "a catalog system keeps its family name");
  const left = availableSystems([romance]);
  ok(!left.some((c) => c.name === "Romance") && left.length === SYSTEM_CATALOG.length - 1, "an owned system leaves the available list");
  ok(availableSystems([createSystem("es", ["fr", "it", "pt"], [])]).length === SYSTEM_CATALOG.length, "a system from another root does not hide a catalog entry");
  const semitic = createSystem("en", ["he", "ar"], []);
  ok(semitic.name === "Semitic from English" && semitic.id === "en-he-ar", "starting Semitic makes en-he-ar");
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nlang systems: all ok");
