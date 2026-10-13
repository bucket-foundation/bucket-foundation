import { deckRows, type DeckRow } from "./decks";
import { searchWords, WORD_SEARCH_LIMIT, WORD_SEARCH_MAX, type CreditWithDecks, type DeckWordBook, type WordSearch } from "./core/word-decks";
import type { Route } from "./serve";
import type { WordSession } from "./words";

export interface DecksBody {
  decks: DeckRow[];
}

export interface DeckRouteOptions {
  home: string;
  book: () => DeckWordBook;
  onError?: (message: string) => void;
}

export const SEARCH_NEEDS_WORDS = "type a word to search for";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function deckRoutes(o: DeckRouteOptions): Record<string, Route> {
  return {
    "GET /local/deck-files": () => json({ decks: deckRows(o.home, null) } satisfies DecksBody),
    "GET /local/words/search": (_req, url) => {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (!q) return json({ error: SEARCH_NEEDS_WORDS }, 400);
      const raw = url.searchParams.get("n");
      const n = raw !== null && /^\d{1,2}$/.test(raw) ? Math.min(Math.max(1, Number(raw)), WORD_SEARCH_MAX) : WORD_SEARCH_LIMIT;
      return json(searchWords(o.book(), o.book().files, q, { limit: n, lang: url.searchParams.get("lang"), onError: o.onError }) satisfies WordSearch);
    },
  };
}

export function creditedWordRoutes(routes: Record<string, Route>, session: () => WordSession, book: () => DeckWordBook): Record<string, Route> {
  return Object.fromEntries(
    Object.entries(routes).map(([key, run]): [string, Route] => [
      key,
      async (req, url) => {
        const r = await run(req, url);
        if (!r.ok || !key.startsWith("GET ")) return r;
        const body = (await r.json()) as { credit?: CreditWithDecks };
        if (!body.credit) return json(body, r.status);
        const deck = url.searchParams.get("deck");
        const lang = deck ? book().resolveDeck(deck) : null;
        const also = book().creditsFor(lang ? [lang, ...(key.endsWith("/lesson") ? session().chosen() : [])] : session().chosen());
        return json(also.length ? { ...body, credit: { ...body.credit, also } } : body, r.status);
      },
    ]),
  );
}
