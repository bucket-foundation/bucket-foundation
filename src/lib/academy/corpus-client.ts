"use client";

import { withLeverage, type Atom } from "./engine";

export interface Deck {
  id: string;
  file: string;
  pill?: string;
  sub?: string;
  kind?: string;
  languages?: string[];
}

export interface LoadedCorpus {
  deck: Deck;
  meta: { branch?: string; title?: string; note?: string; version?: string };
  atoms: Atom[];
}

const BASE = "/academy-app/corpus";
let decksPromise: Promise<Deck[]> | null = null;
const corpusCache = new Map<string, Promise<LoadedCorpus | null>>();

export function loadDecks(): Promise<Deck[]> {
  if (!decksPromise) {
    decksPromise = fetch(`${BASE}/index.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : { decks: [] }))
      .then((j: { decks?: Deck[] }) => (j.decks ?? []).filter((d) => d.kind !== "language"))
      .catch(() => []);
  }
  return decksPromise;
}

export function deckLabel(d: Deck): string {
  return (d.pill ?? d.id).replace(/^\S+\s+[·]\s+/, "");
}

export function findDeck(decks: Deck[], slug: string): Deck | undefined {
  return decks.find((d) => d.id === slug) ?? decks.find((d) => d.file.replace(/^corpus\//, "").replace(/\.json$/, "") === slug);
}

export function loadCorpus(slug: string): Promise<LoadedCorpus | null> {
  if (!corpusCache.has(slug)) {
    corpusCache.set(
      slug,
      loadDecks().then(async (decks) => {
        const deck = findDeck(decks, slug);
        if (!deck) return null;
        const file = deck.file.replace(/^corpus\//, "");
        try {
          const res = await fetch(`${BASE}/${file}`, { cache: "force-cache" });
          if (!res.ok) return null;
          const j = (await res.json()) as { meta?: LoadedCorpus["meta"]; atoms?: Atom[] };
          return { deck, meta: j.meta ?? {}, atoms: withLeverage(j.atoms ?? []) };
        } catch {
          return null;
        }
      })
    );
  }
  return corpusCache.get(slug)!;
}
