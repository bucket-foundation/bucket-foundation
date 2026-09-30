import { normalizeState, type Atom, type EngineState } from "@academy/engine";
import type { Api, DeckRow } from "../api";

export type PlacedAtom = Atom & { deck: string; deckTitle: string };

export interface LearnData {
  decks: DeckRow[];
  atoms: Map<string, PlacedAtom>;
  byDeck: Map<string, string[]>;
  states: Map<string, EngineState>;
}

export async function loadLearnData(api: Api): Promise<LearnData> {
  const [decks, server] = await Promise.all([api.decks(), api.progress.pull()]);
  const lists = await Promise.all(decks.map((d) => api.atoms(d.id)));
  const atoms = new Map<string, PlacedAtom>();
  const byDeck = new Map<string, string[]>();
  const states = new Map<string, EngineState>();
  decks.forEach((d, i) => {
    byDeck.set(d.id, lists[i].map((a) => a.id));
    for (const a of lists[i]) if (!atoms.has(a.id)) atoms.set(a.id, { ...a, deck: d.id, deckTitle: d.title });
    states.set(d.id, normalizeState(server?.[d.id]?.data ?? null));
  });
  return { decks, atoms, byDeck, states };
}
