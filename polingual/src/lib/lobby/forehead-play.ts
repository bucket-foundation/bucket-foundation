export const FOREHEAD_MAX_LANGS = 6;

export function toggleLang(langs: readonly string[], lang: string): string[] {
  if (langs.includes(lang)) return langs.filter((x) => x !== lang);
  return langs.length >= FOREHEAD_MAX_LANGS ? [...langs] : [...langs, lang];
}

export function secondsUntil(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function cardFit(form: string): number {
  return Math.max(4, Math.max(...form.split(" ").map((p) => Array.from(p).length)) + 1);
}
