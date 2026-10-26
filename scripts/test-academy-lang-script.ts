import fs from "node:fs";
import path from "node:path";
import { normalizeState } from "../src/lib/academy/engine";
import { buildLangCorpus, buildQueue, createSystem, letterExerciseFor, exerciseFor, gradeCard, gradeSpelling, LANGS, letterExercise, seededRng } from "../src/lib/academy/lang-systems";
import { alphabetDone, alphabetUnit, dueLetters, foldMarks, HERITAGE_LANGS, judgeSpelled, letterCardId, letterItemId, nextLetters } from "../src/lib/academy/lang-script";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const nonLatin = Object.keys(LANGS).filter((l) => !LANGS[l].latin);
ok(nonLatin.length === 13 && nonLatin.every((l) => HERITAGE_LANGS.includes(l)), "every non-Latin language has a script");
for (const l of nonLatin) {
  const u = alphabetUnit(l)!;
  ok(!!u && u.letters.length >= 20 && u.letters.every((x) => x.ch && x.sound), `${l} alphabet unit has ${u?.letters.length} letters with sounds`);
  ok(new Set(u.letters.map((x) => x.ch)).size === u.letters.length, `${l} letters are unique`);
}
ok(alphabetUnit("es") === null, "Latin languages have no alphabet unit");
ok(alphabetUnit("ru")!.letters.length === 33 && alphabetUnit("he")!.letters.length === 22 && alphabetUnit("th")!.letters.length === 44 + 14 && alphabetUnit("ja")!.letters.length === 92, "full alphabets for ru, he, th, ja");
ok(alphabetUnit("ja")!.letters.some((l) => l.ch === "カ" && l.sound === "ka"), "ja: katakana follows hiragana");
for (const l of ["hi", "sa", "ta", "th"]) ok(alphabetUnit(l)!.letters.filter((x) => x.ch.includes("◌")).length >= 10, `${l}: dependent vowel signs are taught`);
ok(alphabetUnit("hi")!.letters.some((l) => l.ch === "◌ा" && l.sound === "-ā"), "hi: matra aa is in the unit");
ok(alphabetUnit("ru")!.letters[0].ch === "а" && alphabetUnit("ja")!.letters[5].ch === "か", "letters keep their traditional order");

ok(judgeSpelled("שָׁלוֹם", "שלום", "he") === "exact", "he: niqqud is optional");
ok(judgeSpelled("שלום", "שָׁלוֹם", "he") === "exact", "he: bare letters match a pointed answer");
ok(judgeSpelled("كِتَاب", "كتاب", "ar") === "exact", "ar: harakat are optional");
ok(judgeSpelled("كتـاب", "كتاب", "ar") === "exact", "ar: tatweel is ignored");
ok(judgeSpelled("كتاي", "كتاب", "ar") === "close", "ar: one wrong letter is close");
ok(judgeSpelled("يك", "یک", "fa") === "exact", "fa: Arabic yeh and kaf fold to Persian forms");
ok(judgeSpelled("еж", "ёж", "ru") === "close", "ru: е for ё is close");
ok(judgeSpelled("все", "всё", "ru") !== "exact" && judgeSpelled("всё", "все", "ru") !== "exact", "ru: все and всё never grade exact for each other");
ok(judgeSpelled("ВСЁ", "всё", "ru") === "exact", "ru: ё matches ё exactly");
ok(judgeSpelled("мои", "мой", "ru") !== "exact", "ru: и and й stay distinct");
ok(judgeSpelled("кни\u0301га", "книга", "ru") === "exact", "ru: stress accent folds");
ok(foldMarks("ї", "uk") === "ї" && foldMarks("ў", "be") === "ў" && foldMarks("ϊ", "el") === "ι", "Cyrillic breve and diaeresis letters survive, Greek dialytika folds");
ok(judgeSpelled("Москва", "москва", "ru") === "exact", "ru: case is ignored");
ok(judgeSpelled("моско", "москва", "ru") === "wrong", "ru: two edits is wrong");
ok(judgeSpelled("καλημερα", "καλημέρα", "el") === "close", "el: a missing tonos is close");
ok(judgeSpelled("καλημέρα", "καλημέρα", "el") === "exact", "el: full spelling is exact");
ok(judgeSpelled("नमस्ते", "नमस्ते".normalize("NFD"), "hi") === "exact", "hi: NFC and NFD compare equal");
ok(judgeSpelled("नमसते", "नमस्ते", "hi") === "close", "hi: a dropped virama is close under keep");
ok(judgeSpelled("ﾈｺ", "ネコ", "ja") === "exact", "ja: half-width katakana folds");
ok(judgeSpelled("한국", "한국".normalize("NFD"), "ko") === "exact", "ko: decomposed jamo compose to syllables");
ok(judgeSpelled("", "猫", "zh") === "wrong", "empty answer is wrong");
ok(judgeSpelled("ねこ", ["猫", "ねこ"], "ja") === "exact", "any accepted spelling counts");
ok(foldMarks(" שָׁלוֹם! ", "he") === "שלום", "foldMarks trims punctuation and marks");

const dir = path.resolve(__dirname, "../learning/app/corpus");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const sys = createSystem("en", ["ru", "es"], [], 1);
const item = corpus.items.find((i) => i.kind === "word" && i.forms.ru && i.forms.en)!;
const card = { reps: 3 } as never;
const ex = exerciseFor(corpus, sys, item, "ru", card, seededRng(1), { heritage: true });
ok(ex.kind === "spell-heard" && ex.prompt === item.forms.ru && ex.answerLang === "ru", "heritage mode makes a hear-then-spell card");
ok(exerciseFor(corpus, sys, item, "ru", undefined, seededRng(1), { heritage: true }).kind === "intro", "heritage mode still introduces new items");
const esItem = corpus.items.find((i) => i.kind === "word" && i.forms.es && i.forms.en)!;
ok(exerciseFor(corpus, sys, esItem, "es", card, seededRng(1), { heritage: true }).kind !== "spell-heard", "Latin targets keep the normal flow");
ok(Array.from({ length: 20 }, (_, k) => exerciseFor(corpus, sys, item, "ru", card, seededRng(k)).kind).every((k) => k !== "spell-heard"), "heritage off never spells");
const g = gradeSpelling(ex, item.forms.ru.toUpperCase());
ok(g.verdict === "exact" && g.rating === 3, "spelling grades into an FSRS rating");
ok(gradeSpelling(ex, "zzz").rating === 1, "wrong spelling rates Again");

const lx = letterExercise("he", "en", 1, seededRng(2))!;
ok(lx.kind === "letter" && lx.answer === "ב" && lx.prompt === "b/v" && lx.options!.length === 4 && lx.options!.includes("ב"), "letter card asks for the letter by sound");
const thx = letterExercise("th", "en", 1, seededRng(2))!;
ok(thx.prompt === "kh · kho khai" && thx.accept!.join("") === "ข", "th: a shared sound is prompted with the letter name");
const fax = letterExercise("fa", "en", alphabetUnit("fa")!.letters.findIndex((l) => l.ch === "س"), seededRng(2))!;
ok(fax.prompt === "s · sin", "fa: sin is named apart from se and sad");
const rux = letterExercise("ru", "en", alphabetUnit("ru")!.letters.findIndex((l) => l.ch === "й"), seededRng(2))!;
ok(rux.accept!.includes("й") && rux.accept!.includes("ы"), "unnamed letters accept every letter with the same sound");
ok(letterExercise("he", "en", 99, seededRng(2)) === null && letterExercise("es", "en", 0, seededRng(2)) === null, "letter card out of range or Latin is null");

const NOW = Date.UTC(2026, 9, 25, 12);
let st = normalizeState(null);
ok(nextLetters(st, "ko", 3).map((l) => l.ch).join("") === "ㄱㄴㄷ", "new letters come in order");
st = gradeCard(st, "ko", letterItemId("ㄱ"), 3, NOW, "UTC");
ok(!!st.cards[letterCardId("ko", "ㄱ")], "letter grades through the card flow");
ok(nextLetters(st, "ko", 1)[0].ch === "ㄴ", "graded letters leave the new queue");
ok(dueLetters(st, "ko", NOW).length === 0 && dueLetters(st, "ko", NOW + 30 * 86400000).length === 1, "letters come due on schedule");
ok(!alphabetDone(st, "ko"), "alphabet not done after one letter");
for (const l of alphabetUnit("ko")!.letters) st = gradeCard(st, "ko", letterItemId(l.ch), 3, NOW, "UTC");
ok(alphabetDone(st, "ko") && alphabetDone(st, "es"), "alphabet done once letters are learned");

const fresh = normalizeState({});
const hq = buildQueue(sys, corpus, fresh, 1000, 14, { heritage: true });
const letters = hq.filter((e) => e.stage === "letter");
ok(letters.length === 5 && letters.every((e) => e.lang === "ru") && hq[0].stage === "letter", "heritage queue opens with five new ru letters and skips Latin es");
ok(buildQueue(sys, corpus, fresh, 1000).every((e) => e.stage !== "letter"), "plain queue has no letter cards");
const lex = letterExerciseFor("ru", "en", letters[0].itemId, seededRng(2));
ok(lex?.kind === "letter" && lex.answer === "а" && lex.options!.includes("а"), "letter entries resolve to letter exercises");
let lst = fresh;
for (const e of letters) lst = gradeCard(lst, "ru", e.itemId, 3, 1000);
const next = buildQueue(sys, corpus, lst, 2000, 14, { heritage: true }).filter((e) => e.stage === "letter");
ok(next.length === 5 && next.every((e) => !letters.some((l) => l.itemId === e.itemId)), "graded letters give way to the next five");
const learn = (lang: string, pick: (ch: string) => boolean) => {
  let s0 = normalizeState(null);
  for (const l of alphabetUnit(lang)!.letters) if (pick(l.ch)) s0 = gradeCard(s0, lang, letterItemId(l.ch), 3, NOW, "UTC");
  return s0;
};
const jaBase = learn("ja", (c) => /[\u3040-\u309f]/.test(c));
ok(!alphabetDone(jaBase, "ja") && nextLetters(jaBase, "ja", 5).every((l) => /[\u30a0-\u30ff]/.test(l.ch)), "ja: after hiragana, katakana comes next and the script is not done");
ok(alphabetDone(learn("ja", () => true), "ja"), "ja: hiragana and katakana together finish the script");
const hiBase = learn("hi", (c) => !c.includes("◌"));
ok(!alphabetDone(hiBase, "hi") && nextLetters(hiBase, "hi", 5).every((l) => l.ch.includes("◌")), "hi: after base letters, vowel signs come next");
ok(nextLetters(normalizeState(null), "hi", 50).every((l) => !l.ch.includes("◌")), "hi: vowel signs wait until the base block is done");
ok(!alphabetDone(learn("hi", (c) => c.includes("◌")), "hi"), "hi: vowel signs alone do not finish the script");
for (const [lang, isExtra] of [["ja", (c: string) => /[\u30a0-\u30ff]/.test(c)], ["hi", (c: string) => c.includes("◌")]] as const) {
  const hs = createSystem("en", [lang], [], 1);
  const q = buildQueue(hs, corpus, learn(lang, (c) => !isExtra(c)), NOW, 14, { heritage: true }).filter((e) => e.stage === "letter" && e.lang === lang);
  ok(q.length > 0 && q.some((e) => isExtra(e.itemId.slice(4))), `${lang}: heritage queue still offers extras after the base is done`);
}
const ruLetters = alphabetUnit("ru")!.letters.map((l) => l.ch);
ok(alphabetDone(learn("ru", (c) => ruLetters.indexOf(c) < 27), "ru") && !alphabetDone(learn("ru", (c) => ruLetters.indexOf(c) < 26), "ru"), "ru: gate stays at 27 of 33 letters");
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("lang-script: all ok");
