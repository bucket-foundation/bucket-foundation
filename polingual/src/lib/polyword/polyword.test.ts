import assert from "node:assert/strict";
import { test } from "node:test";
import { WORDS } from "../words";
import { buildBank, fold, ordered, playable, shuffled, TARGETS } from "./bank";
import { accountOf, archiveOffer, ctasFor, pauseFrameAds, resultsAd } from "./policy";
import { emptyProgress, firstGame, isUnlocked, parseProgress, statsFor, withGame, withUnlock } from "./progress";
import { checkGuess, dateOfDay, dayNumber, finished, keyMarks, puzzleFor, revealedHints, score } from "./puzzle";
import { installH5, requestReward, type H5Window } from "./reward";
import { shareText } from "./share";

const bank = buildBank(WORDS);

test("fold strips accents and lowercases", () => {
  assert.equal(fold("Árbol"), "arbol");
  assert.equal(fold("niño"), "nino");
  assert.equal(fold("Größe"), "große");
  assert.equal(playable("Größe"), false);
  assert.equal(playable("perro"), true);
  assert.equal(playable("sol"), false);
});

test("every target language has a month of puzzles of five or six letters", () => {
  for (const lang of TARGETS) {
    const list = bank.langs[lang];
    assert.ok(list.length >= 30, `${lang} has ${list.length}`);
    for (const slug of list) {
      const w = bank.words[slug].forms[lang].word;
      assert.ok(playable(w), `${lang} ${w}`);
    }
    assert.equal(new Set(list.map((s) => fold(bank.words[s].forms[lang].word))).size, list.length);
  }
});

test("the frozen order keeps every past day when words come and go", () => {
  assert.deepEqual(ordered(["a", "b", "c"], ["c", "a", "b"]), ["a", "b", "c"]);
  assert.deepEqual(ordered(["a", "b", "c"], ["c", "a", "b", "d"]), ["a", "b", "c", "d"]);
  assert.deepEqual(ordered(["a", "b", "c"], ["c", "a", "d", "e"]), ["a", "d", "c", "e"]);
  const kept = ordered(["a", "b", "c"], ["a", "c"]);
  assert.equal(kept.length, 3);
  assert.deepEqual([kept[0], kept[2]], ["a", "c"]);
  assert.deepEqual(ordered(["a"], []), []);
  const before = buildBank(WORDS).langs.es;
  const grown = buildBank([...WORDS, { slug: "zzz-new", en: "new", gloss: "new", category: "object", tier: 9, forms: [{ lang: "es", word: "nuevo" }] }]).langs.es;
  assert.deepEqual(grown.slice(0, before.length), before);
  const gone = before[4];
  const shrunk = buildBank(WORDS.filter((w) => w.slug !== gone)).langs.es;
  assert.equal(shrunk.length, before.length);
  shrunk.forEach((s, i) => i !== 4 && assert.equal(s, before[i]));
});

test("the checked-in order matches today's word list", () => {
  const fresh = buildBank(WORDS, {}).langs;
  for (const lang of TARGETS) assert.deepEqual([...bank.langs[lang]].sort(), [...fresh[lang]].sort(), lang);
});

test("the shuffle is stable for a seed", () => {
  assert.deepEqual(shuffled([1, 2, 3, 4, 5], "a"), shuffled([1, 2, 3, 4, 5], "a"));
  assert.deepEqual([...shuffled([1, 2, 3, 4, 5], "a")].sort(), [1, 2, 3, 4, 5]);
});

test("day numbers count local days from the first of November 2026", () => {
  assert.equal(dayNumber(new Date(2026, 10, 1, 0, 1)), 1);
  assert.equal(dayNumber(new Date(2026, 10, 1, 23, 59)), 1);
  assert.equal(dayNumber(new Date(2026, 10, 13, 9)), 13);
  assert.equal(dayNumber(new Date(2027, 0, 1, 12)), 62);
  assert.equal(dateOfDay(13).toISOString().slice(0, 10), "2026-11-13");
});

test("a puzzle is the same for everyone on a day and changes the next day", () => {
  const a = puzzleFor(bank, "es", 13)!;
  assert.deepEqual(puzzleFor(bank, "es", 13), a);
  assert.notEqual(puzzleFor(bank, "es", 14)!.slug, a.slug);
  assert.equal(a.answer, fold(a.word));
  assert.ok(a.hints.length >= 3 && a.hints.length <= 5);
  assert.equal(a.hints[0].lang, "en");
  assert.ok(a.hints.every((h) => h.lang !== "es"));
  assert.equal(puzzleFor(bank, "es", 0), null);
  assert.equal(puzzleFor(bank, "xx", 3), null);
});

test("an English puzzle opens hints in Spanish first", () => {
  assert.equal(puzzleFor(bank, "en", 5)!.hints[0].lang, "es");
});

test("score marks hits, near letters and repeats the Wordle way", () => {
  assert.deepEqual(score("perro", "perro"), ["hit", "hit", "hit", "hit", "hit"]);
  assert.deepEqual(score("opera", "perro"), ["near", "near", "near", "hit", "miss"]);
  assert.deepEqual(score("rrxxx", "perro"), ["near", "near", "miss", "miss", "miss"]);
  assert.deepEqual(score("errrr", "perro"), ["near", "miss", "hit", "hit", "miss"]);
  assert.deepEqual(score("aabbb", "xaxxx"), ["miss", "hit", "miss", "miss", "miss"]);
});

test("keyboard marks keep the best result per letter", () => {
  const k = keyMarks(["opera", "perro"], "perro");
  assert.equal(k.p, "hit");
  assert.equal(k.a, "miss");
  assert.equal(keyMarks(["rrxxx"], "perro").r, "near");
});

test("guesses fold accents and reject short, foreign or repeated input", () => {
  assert.deepEqual(checkGuess("Árbol", "arbol", []), { ok: true, guess: "arbol" });
  assert.deepEqual(checkGuess("arb", "arbol", []), { ok: false, reason: "short" });
  assert.deepEqual(checkGuess("ab1ol", "arbol", []), { ok: false, reason: "letters" });
  assert.deepEqual(checkGuess("arbol", "arbol", ["arbol"]), { ok: false, reason: "repeat" });
});

test("each miss opens one more language and the end opens all", () => {
  const p = { answer: "perro", hints: [{ lang: "en", word: "dog" }, { lang: "fr", word: "chien" }, { lang: "de", word: "Hund" }] };
  assert.equal(revealedHints(p, []).length, 0);
  assert.equal(revealedHints(p, ["gatos"]).length, 1);
  assert.equal(revealedHints(p, ["gatos", "lunes"]).length, 2);
  assert.equal(revealedHints(p, ["gatos", "perro"]).length, 3);
  assert.equal(finished(["a", "b", "c", "d", "e", "f"], "perro"), true);
});

test("the share card heads with the flag and tags each miss with its hint flag", () => {
  const p = { lang: "es", day: 13, answer: "perro", hints: [{ lang: "en", word: "dog" }, { lang: "fr", word: "chien" }] };
  const text = shareText(p, ["gatos", "pesar", "perro"], "https://www.polingual.com/play/polyword");
  assert.equal(text.split("\n")[0], "Polyword 🇪🇸 #13 3/6");
  assert.match(text, /⬜⬜⬜🟨⬜ 🇬🇧\n🟩🟩⬜⬜🟨 🇫🇷\n🟩🟩🟩🟩🟩\n/);
  assert.match(text, /polingual\.com\/play\/polyword$/);
  assert.equal(shareText(p, ["aaaaa", "bbbbb", "ccccc", "ddddd", "eeeee", "fffff"], "u").split("\n")[0], "Polyword 🇪🇸 #13 X/6");
});

test("progress survives bad storage and records the first finished game", () => {
  assert.deepEqual(parseProgress("{bad"), emptyProgress());
  assert.deepEqual(parseProgress(JSON.stringify({ v: 2 })), emptyProgress());
  let p = emptyProgress();
  assert.equal(firstGame(p, "es", 13), true);
  p = withGame(p, "es", 13, { guesses: ["perro"], done: false, won: false });
  assert.equal(p.first, undefined);
  p = withGame(p, "es", 13, { guesses: ["perro"], done: true, won: true });
  assert.equal(p.first, "es:13");
  assert.equal(firstGame(p, "es", 13), true);
  assert.equal(firstGame(p, "fr", 13), false);
  assert.deepEqual(parseProgress(JSON.stringify(p)), p);
});

test("streaks count daily wins and skip archive games", () => {
  let p = emptyProgress();
  const win = { guesses: ["x"], done: true, won: true };
  for (const d of [8, 9, 11, 12]) p = withGame(p, "es", d, win);
  p = withGame(p, "es", 10, { guesses: ["a", "b", "c", "d", "e", "f"], done: true, won: false });
  p = withGame(p, "es", 3, { ...win, archive: true });
  assert.deepEqual(statsFor(p, "es", 13), { played: 5, won: 4, streak: 2, best: 2, dist: [4, 0, 0, 0, 0, 0] });
  p = withGame(p, "es", 13, win);
  assert.equal(statsFor(p, "es", 13).streak, 3);
  assert.equal(statsFor(p, "es", 13).best, 3);
  const lost = withGame(p, "es", 14, { guesses: ["a", "b", "c", "d", "e", "f"], done: true, won: false });
  assert.equal(statsFor(lost, "es", 14).streak, 0);
  assert.equal(statsFor(p, "es", 15).streak, 0);
  assert.equal(statsFor(p, "fr", 13).played, 0);
});

test("past puzzles open with Pro, an unlock or an earlier start", () => {
  let p = emptyProgress();
  assert.equal(isUnlocked(p, "es", 13, 13, false), true);
  assert.equal(isUnlocked(p, "es", 5, 13, false), false);
  assert.equal(isUnlocked(p, "es", 5, 13, true), true);
  assert.equal(isUnlocked(p, "es", 14, 13, true), false);
  assert.equal(isUnlocked(p, "es", 0, 13, true), false);
  p = withUnlock(p, "es", 5);
  assert.equal(withUnlock(p, "es", 5), p);
  assert.equal(isUnlocked(p, "es", 5, 13, false), true);
  assert.equal(isUnlocked(p, "fr", 5, 13, false), false);
  p = withGame(p, "fr", 6, { guesses: [], done: false, won: false });
  assert.equal(isUnlocked(p, "fr", 6, 13, false), true);
});

test("calls to action follow the account", () => {
  assert.deepEqual(ctasFor("checking"), []);
  assert.deepEqual(ctasFor("signed-out").map((c) => c.label), ["Start learning", "Sign in"]);
  assert.deepEqual(ctasFor("free").map((c) => c.label), ["Start learning"]);
  assert.deepEqual(ctasFor("paid").map((c) => c.label), ["Continue learning"]);
  assert.equal(accountOf("subscriber"), "paid");
  assert.equal(accountOf("unknown"), "free");
  assert.equal(accountOf("signed-out"), "signed-out");
});

test("no ads during play or in the first game, results ads for free players only", () => {
  assert.equal(pauseFrameAds("playing", false), true);
  assert.equal(pauseFrameAds("done", true), true);
  assert.equal(pauseFrameAds("done", false), false);
  assert.equal(pauseFrameAds("archive", false), false);
  assert.equal(resultsAd("done", false, "free"), true);
  assert.equal(resultsAd("done", false, "signed-out"), true);
  assert.equal(resultsAd("done", false, "paid"), false);
  assert.equal(resultsAd("done", false, "checking"), false);
  assert.equal(resultsAd("done", true, "free"), false);
  assert.equal(resultsAd("playing", false, "free"), false);
});

test("the archive offers a rewarded ad only when one can play", () => {
  assert.deepEqual(archiveOffer("paid", "off", false), { pro: true });
  assert.deepEqual(archiveOffer("free", "off", true), { pro: false, rewarded: false });
  assert.deepEqual(archiveOffer("signed-out", "placeholder", true), { pro: false, rewarded: true });
  assert.deepEqual(archiveOffer("free", "adsense", false), { pro: false, rewarded: false });
});

test("rewarded ads resolve viewed, dismissed or unavailable", async () => {
  assert.equal(await requestReward({}, "x"), "unavailable");
  const viewed: H5Window = { adBreak: (o) => (o.beforeReward(() => o.adViewed()), o.adBreakDone({ breakStatus: "viewed" })) };
  assert.equal(await requestReward(viewed, "x"), "viewed");
  const skipped: H5Window = { adBreak: (o) => o.adBreakDone({ breakStatus: "notReady" }) };
  assert.equal(await requestReward(skipped, "x"), "unavailable");
  const closed: H5Window = { adBreak: (o) => (o.beforeReward(() => o.adDismissed()), o.adBreakDone({ breakStatus: "dismissed" })) };
  assert.equal(await requestReward(closed, "x"), "dismissed");
  assert.equal(await requestReward({ adBreak: () => {} }, "x", 5), "unavailable");
  const w: H5Window = {};
  installH5(w);
  assert.equal(typeof w.adBreak, "function");
  assert.deepEqual(w.adsbygoogle, [{ preloadAdBreaks: "on", sound: "on" }]);
});
