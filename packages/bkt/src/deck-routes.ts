import { deckRows, type DeckRow } from "./decks";
import type { WordBook, WordCredit } from "./core/words";
import { searchWords, WORD_SEARCH_LIMIT, WORD_SEARCH_MAX, type WordDeckFile, type WordSearch } from "./core/word-decks";
import type { Route } from "./serve";

export interface DecksBody {
  decks: DeckRow[];
  credit: WordCredit;
}

export interface DeckRouteOptions {
  home: string;
  book: () => WordBook;
  decks: () => readonly WordDeckFile[];
}

export const SEARCH_NEEDS_WORDS = "type a word to search for";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function deckRoutes(o: DeckRouteOptions): Record<string, Route> {
  return {
    "GET /local/deck-files": () => json({ decks: deckRows(o.home, null), credit: o.book().credit } satisfies DecksBody),
    "GET /local/words/search": (_req, url) => {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (!q) return json({ error: SEARCH_NEEDS_WORDS }, 400);
      const raw = url.searchParams.get("n");
      const n = raw !== null && /^\d{1,2}$/.test(raw) ? Math.min(Math.max(1, Number(raw)), WORD_SEARCH_MAX) : WORD_SEARCH_LIMIT;
      return json(searchWords(o.book(), o.decks(), q, { limit: n, lang: url.searchParams.get("lang") }) satisfies WordSearch);
    },
  };
}
