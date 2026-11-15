import { MAX_GUESSES, score, solved, type Mark, type Puzzle } from "./puzzle";

const FLAG_EMOJI: Record<string, string> = {
  en: "🇬🇧", es: "🇪🇸", fr: "🇫🇷", it: "🇮🇹", pt: "🇵🇹", de: "🇩🇪", nl: "🇳🇱", sv: "🇸🇪", ru: "🇷🇺", ja: "🇯🇵", ar: "🇪🇬", el: "🇬🇷", fi: "🇫🇮", hi: "🇮🇳", ko: "🇰🇷", pl: "🇵🇱", zh: "🇨🇳", cs: "🇨🇿", tr: "🇹🇷", id: "🇮🇩", vi: "🇻🇳", he: "🇮🇱", fa: "🇮🇷", th: "🇹🇭",
};

const SQUARE: Record<Mark, string> = { hit: "🟩", near: "🟨", miss: "⬜" };

export function flagEmoji(lang: string): string {
  return FLAG_EMOJI[lang] ?? "🏳️";
}

export function shareText(puzzle: Pick<Puzzle, "lang" | "day" | "answer" | "hints">, guesses: readonly string[], url: string): string {
  const won = solved(guesses, puzzle.answer);
  const head = `Polyword ${flagEmoji(puzzle.lang)} #${puzzle.day} ${won ? guesses.length : "X"}/${MAX_GUESSES}`;
  let miss = 0;
  const rows = guesses.map((g) => {
    const squares = score(g, puzzle.answer)
      .map((m) => SQUARE[m])
      .join("");
    if (g === puzzle.answer) return squares;
    const hint = puzzle.hints[miss++];
    return hint ? `${squares} ${flagEmoji(hint.lang)}` : squares;
  });
  return [head, "", ...rows, "", url].join("\n");
}
