import { LANGS } from "@academy/lang-systems";
import { TILE_ROUND_SECONDS } from "@academy/lobby-tiles";

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
  return game === "tiles" ? TILE_ROUND_SECONDS : game === "live" ? 7 : 8;
}

export const LANG_CHOICES = ["es", "fr", "it", "pt", "de", "nl", "sv", "ja", "zh", "ko", "ru", "el", "ar", "hi", "tr"] as const;

export type SetupMode = "single" | "sequence" | "mix";

export const SETUP_MODES: { id: SetupMode; name: string; blurb: string }[] = [
  { id: "single", name: "One game", blurb: "Play one game again and again." },
  { id: "sequence", name: "Game set", blurb: "Pick games. They play in order." },
  { id: "mix", name: "Random mix", blurb: "A random game each time." },
];

export function setupValid(mode: SetupMode, games: readonly string[], langs: readonly string[]): string | null {
  if (langs.length < 1) return "Pick at least one language.";
  if (mode === "sequence" && games.length < 2) return "Pick at least two games for a set.";
  if ((mode === "single" ? games.slice(0, 1) : mode === "sequence" ? games : []).includes("same-word") && langs.length < 2) return "Same word needs two languages or more.";
  return null;
}
