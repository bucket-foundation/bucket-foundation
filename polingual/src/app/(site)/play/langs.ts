import { LANGS } from "@academy/lang-systems";

export interface LangSet {
  id: string;
  label: string;
  root: string;
  targets: string[];
}

export const LANG_SETS: LangSet[] = [
  { id: "romance", label: "Spanish, French, Italian, Portuguese", root: "en", targets: ["es", "fr", "it", "pt"] },
  { id: "germanic", label: "German, Dutch, Swedish", root: "en", targets: ["de", "nl", "sv"] },
  { id: "asia", label: "Japanese, Chinese, Korean", root: "en", targets: ["ja", "zh", "ko"] },
  { id: "east", label: "Russian, Greek, Arabic, Hindi", root: "en", targets: ["ru", "el", "ar", "hi"] },
  { id: "world", label: "Spanish, German, Japanese, Arabic", root: "en", targets: ["es", "de", "ja", "ar"] },
];

export const GAMES = [
  { id: "daily", name: "Daily words", blurb: "Match the meaning to the word." },
  { id: "same-word", name: "Same word", blurb: "One meaning across languages." },
  { id: "flags", name: "Flags", blurb: "Name the language of each word." },
  { id: "tiles", name: "Tiles", blurb: "Words fall. Tap every one that means the word on top." },
  { id: "live", name: "Live", blurb: "Fast rounds with a leaderboard after each." },
] as const;

export type GameId = (typeof GAMES)[number]["id"];

export function gameName(id: string): string {
  return GAMES.find((g) => g.id === id)?.name ?? id;
}

export function langName(code: string): string {
  if (LANGS[code]) return LANGS[code].name;
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function roundSecondsFor(game: string): number {
  return game === "tiles" ? 6 : game === "live" ? 7 : 8;
}
