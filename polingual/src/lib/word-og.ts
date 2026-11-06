import { LANGS, OG_LANGS, capitalize, wordPath, type Word, type WordForm } from "./words";
import type { OgImage } from "./meta";

export function wordOgForms(w: Word): WordForm[] {
  return OG_LANGS.map((l) => w.forms.find((f) => f.lang === l)).filter((f): f is WordForm => f !== undefined);
}

export function wordOgAlt(w: Word): string {
  const shown = wordOgForms(w).map((f) => `${LANGS[f.lang]?.name ?? f.lang} ${f.word}`);
  const name = capitalize(w.en);
  return shown.length > 0 ? `The word ${name} in ${w.forms.length} languages: ${shown.join(", ")}` : `The word ${name} in ${w.forms.length} languages`;
}

export function wordOgImage(w: Word): OgImage {
  return { url: `${wordPath(w)}/og.png`, width: 1200, height: 630, type: "image/png", alt: wordOgAlt(w) };
}
