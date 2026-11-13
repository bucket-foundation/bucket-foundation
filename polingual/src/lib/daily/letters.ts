import { alphabetUnit, HERITAGE_LANGS } from "@academy/lang-script";
import { fnv, mixed, SeededRandom } from "./rng";

export const LETTER_ROUND = 8;
export const LETTER_SECONDS = 90;

export interface LetterPrompt {
  lang: string;
  ch: string;
  sound: string;
  choices: string[];
}

export function letterLang(day: string, targets: readonly string[]): string {
  const own = [...targets].sort().filter((l) => alphabetUnit(l));
  const pool = own.length ? own : HERITAGE_LANGS.filter((l) => alphabetUnit(l)).sort();
  return pool[Number(fnv(`letters-lang|${day}`) % BigInt(pool.length))];
}

export function dailyLetters(day: string, targets: readonly string[]): LetterPrompt[] {
  const lang = letterLang(day, targets);
  const letters = alphabetUnit(lang)!.letters.filter((l) => !l.ch.includes("◌"));
  const rng = new SeededRandom(fnv(`letters|${day}|${lang}`));
  const picked = mixed(letters, rng).slice(0, LETTER_ROUND);
  return picked.map((l) => {
    const foils = mixed(letters.filter((x) => x.ch !== l.ch && x.sound !== l.sound), rng).slice(0, 3).map((x) => x.ch);
    return { lang, ch: l.ch, sound: l.sound, choices: mixed([l.ch, ...foils], rng) };
  });
}
