import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alphabetUnit, HERITAGE_LANGS } from "@academy/lang-script";
import { buildLangCorpus } from "@academy/lang-systems";
import { dailyGroups } from "@/lib/daily/groups";
import { dailyLetters, letterLang } from "@/lib/daily/letters";
import { dailyMini } from "@/lib/daily/mini";
import { fnv, mixed, SeededRandom } from "@/lib/daily/rng";
import { Speed } from "@/lib/daily/speed";
import { balanced, dailySet, flags, formOf, GameDeck, starter, wordId, type GameWord } from "@/lib/daily/words";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (n: string) => JSON.parse(readFileSync(`${root}apple/Shared/Corpus/${n}`, "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));

const alphabets = Object.fromEntries(HERITAGE_LANGS.map((l) => [l, alphabetUnit(l)?.letters.map((x) => ({ ch: x.ch, sound: x.sound })) ?? null]).filter(([, v]) => v));
writeFileSync(`${root}android/polingual/src/main/assets/play/alphabets.json`, JSON.stringify({ heritage: HERITAGE_LANGS, letters: alphabets }) + "\n");

const sets = [["es", "fr"], ["de", "it", "pt"], ["ru", "ja", "es"]];
const days = ["2026-11-12", "2026-11-13", "2027-1-5"];
const out: Record<string, unknown> = {};
for (const targets of sets) for (const day of days) {
  const key = `${targets.join(",")}|${day}`;
  const deck = new GameDeck(corpus, "en", targets);
  const set = dailySet(deck, day);
  const m = dailyMini(starter("en", targets, corpus), day, "en", targets);
  const g = dailyGroups(starter("en", targets, corpus, 60), day, "en", targets, (w) => corpus.byId.get(w.itemId)?.category ?? null, (w, l) => {
    const item = corpus.byId.get(w.itemId);
    return !!item && formOf(item, l)?.toLowerCase() === w.form.toLowerCase();
  });
  const sorted = [...targets].sort().join(",");
  const srng = new SeededRandom(fnv(`speed|${day}|en|${sorted}`));
  const speedDeck: GameWord[] = balanced(targets.flatMap((l) => mixed(deck.pool(l).slice(0, 200), srng).slice(0, 12).map((e) => deck.word(e.itemId, l)!)));
  const speed = new Speed(speedDeck, fnv(`speed-board|${day}`));
  const steps: string[] = [`${speed.board.meanings.map((w) => (w ? wordId(w) : "-")).join(",")}/${speed.board.forms.map((w) => (w ? wordId(w) : "-")).join(",")}`];
  for (let n = 0; n < 4; n++) {
    const first = speed.board.meanings.find(Boolean)!;
    const other = speed.board.forms.find((f) => f && wordId(f) !== wordId(first))!;
    if (n === 1) { speed.tapMeaning(wordId(first)); speed.tapForm(wordId(other)); }
    speed.tapMeaning(wordId(first)); speed.tapForm(wordId(first));
    steps.push(`${speed.board.meanings.map((w) => (w ? wordId(w) : "-")).join(",")}/${speed.board.forms.map((w) => (w ? wordId(w) : "-")).join(",")}|${speed.board.points}|${speed.board.missed.length}`);
  }
  const vrng = new SeededRandom(fnv(`voice|${day}|en|${sorted}`));
  const vwords: GameWord[] = targets.flatMap((l) => mixed(deck.pool(l).slice(0, 200), vrng).slice(0, 6).map((e) => deck.word(e.itemId, l)!));
  const voice = flags(vwords, targets, "voice", vrng, (w, l) => {
    const item = corpus.byId.get(w.itemId);
    return l !== w.lang && !!item && formOf(item, l)?.toLowerCase() === w.form.toLowerCase();
  });
  out[key] = {
    daily: set.map((p) => `${p.word.lang}:${p.word.itemId}:${p.choices.join("/")}`).join(";"),
    mini: `${m?.lang} ${m?.entries.map((e) => `${e.number}${e.across ? "a" : "d"}@${e.row},${e.col}:${e.letters.join("")}`).join(";")} keys=${m?.keys.join("")}`,
    groups: `${g?.groups.map((x) => `${x.link.kind === "theme" ? x.link.theme : x.link.lang}/${x.link.kind === "languageTheme" ? x.link.theme : x.link.kind}=${x.words.map((w) => w.itemId).join(",")}`).join(";")} tiles=${g?.tiles.map((w) => w.itemId).join(",")}`,
    speedDeck: speedDeck.map(wordId).join(","),
    speedSteps: steps,
    voice: voice.map((p) => `${wordId(p.word)}:${p.choices.join("/")}`).join(";"),
    lettersLang: letterLang(day, targets),
    letters: dailyLetters(day, targets).map((p) => `${p.ch}=${p.sound}:${p.choices.join("")}`).join(";"),
  };
}
const r = new SeededRandom(4n);
out.rng = { next: [r.next(), r.next(), r.next()].map(String), fnv: String(fnv("2026-11-12|en|es,fr")) };
writeFileSync(`${root}android/polingual/src/test/resources/daily-goldens.json`, JSON.stringify(out, null, 1) + "\n");
