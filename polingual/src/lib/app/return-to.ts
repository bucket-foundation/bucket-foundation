const DAILY_PAGES = ["daily-set", "mini", "word-groups", "speed-match", "which-voice", "letter-sprint"];

export const signInToSave = (game: string) => `/app?from=daily&game=${encodeURIComponent(game)}`;

export function returnTo(search: string): string | null {
  const q = new URLSearchParams(search);
  if (q.get("from") !== "daily") return null;
  const game = q.get("game") ?? "";
  return DAILY_PAGES.includes(game) ? `/play/${game}` : "/play";
}
