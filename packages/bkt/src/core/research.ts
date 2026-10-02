import type { HistoryStore } from "../history";
import type { Note, NotesStore } from "../notes";
import type { PackDeck } from "../pack/export";
import type { Store } from "../store";
import { checkNote, type Checked, type NoteInput } from "./notes";
import type { StudyHistory } from "./history";
import { importProgress, type ImportOutcome } from "./importer";
import type { ServerRecord } from "./backend";
import { callServer } from "./remote";

export interface ResearchBackend {
  readonly kind: "direct" | "server";
  notes(): Promise<Note[]>;
  addNote(input: Record<string, unknown>): Promise<Checked<Note>>;
  history(days: number): Promise<StudyHistory>;
  importProgress(payload: unknown, force: boolean): Promise<ImportOutcome>;
}

export interface ResearchParts {
  store: Store;
  notes: NotesStore;
  history: HistoryStore;
  decks: Pick<PackDeck, "id">[];
  now?: () => number;
}

export function directResearch(p: ResearchParts): ResearchBackend {
  const now = p.now ?? Date.now;
  return {
    kind: "direct",
    notes: async () => p.notes.list(),
    addNote: async (input) => {
      const c = checkNote(input, { has: (id) => p.notes.get(id) !== null, count: () => p.notes.count() });
      return c.ok ? { ok: true, value: p.notes.save(c.value as NoteInput, now()) } : c;
    },
    history: async (days) => p.history.study(now(), days),
    importProgress: async (payload, force) => importProgress(p.store, p.decks, payload, force, now()),
  };
}

export class ServerError extends Error {}

export function serverResearch(rec: ServerRecord): ResearchBackend {
  const read = async <T>(path: string): Promise<T> => {
    const r = await callServer<T>(rec, path);
    if (r.status !== 200) throw new ServerError(r.body.error ?? `the running Bucket answered ${r.status}`);
    return r.body;
  };
  return {
    kind: "server",
    notes: async () => (await read<{ notes: Note[] }>("/local/notes")).notes,
    addNote: async (input) => {
      const r = await callServer<Note>(rec, "/local/notes", input);
      return r.status === 200 ? { ok: true, value: r.body } : { ok: false, status: r.status, error: r.body.error ?? `the running Bucket answered ${r.status}` };
    },
    history: async (days) => (await read<{ study: StudyHistory }>(`/local/history?days=${days}`)).study,
    importProgress: async (payload, force) => {
      const r = await callServer<{ imported: string[] }>(rec, `/local/import${force ? "?force=1" : ""}`, payload ?? null);
      return r.status === 200 ? { ok: true, imported: r.body.imported } : { ok: false, status: r.status, error: r.body.error ?? `the running Bucket answered ${r.status}` };
    },
  };
}
