import type { LangItem } from "./lang-systems";
import { foreheadDeck } from "./forehead";

export interface SnakeWord {
  form: string;
  lang: string;
  meaning: string;
}

export interface SnakeDeck {
  lang: string;
  good: SnakeWord[];
  decoys: SnakeWord[];
}

export function snakeDeck(items: readonly LangItem[], lang: string, others: readonly string[], seed: string): SnakeDeck {
  const good = foreheadDeck(items, [lang], seed, "en", 80).map((c) => ({ form: c.form, lang: c.lang, meaning: c.meaning }));
  const forms = new Set(good.map((g) => g.form.toLowerCase()));
  const decoys = foreheadDeck(items, others.filter((o) => o !== lang), `${seed}1`, "en", 80)
    .filter((c) => !forms.has(c.form.toLowerCase()))
    .map((c) => ({ form: c.form, lang: c.lang, meaning: c.meaning }));
  return { lang, good, decoys };
}
