import { mergeState } from "../../../../src/lib/academy/engine";
import { webBranches } from "../local";
import type { PackDeck } from "../pack/export";
import type { Store } from "../store";

export const ALREADY_IMPORTED = "already imported";

export type ImportOutcome = { ok: true; imported: string[] } | { ok: false; status: number; error: string };

export function importProgress(store: Store, decks: Pick<PackDeck, "id">[], payload: unknown, force: boolean, now: number): ImportOutcome {
  if (store.meta("web_import_at") && !force) return { ok: false, status: 409, error: ALREADY_IMPORTED };
  const b = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const incoming = b ? webBranches(b) : null;
  if (!incoming) return { ok: false, status: 400, error: "expected { branches: { <deck>: EngineState } }" };
  const known = new Set(decks.map((d) => d.id));
  const unknown = Object.keys(incoming).filter((d) => !known.has(d));
  if (unknown.length) return { ok: false, status: 400, error: `unknown decks: ${unknown.sort().join(", ")}` };
  const imported: string[] = [];
  store.db.transaction(() => {
    for (const [deck, state] of Object.entries(incoming)) {
      store.putLearnState(deck, mergeState(store.learnState(deck), state), now);
      imported.push(deck);
    }
    store.setMeta("web_import_at", String(now));
  })();
  return { ok: true, imported: imported.sort() };
}
