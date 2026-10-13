import { MAX_BODY, MAX_NOTES, MAX_TITLE, type Note } from "../notes";

export const NOTE_ID = /^[0-9a-f-]{36}$/;

export interface NoteInput {
  id?: string;
  title: string;
  body: string;
  pinned: boolean;
}

export type Checked<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export interface NoteShelf {
  has(id: string): boolean;
  count(): number;
}

export function checkNote(b: Record<string, unknown> | null, shelf: NoteShelf): Checked<NoteInput> {
  if (!b) return { ok: false, status: 400, error: "bad body" };
  const id = b.id === undefined || b.id === null ? undefined : b.id;
  if (id !== undefined && (typeof id !== "string" || !NOTE_ID.test(id))) return { ok: false, status: 400, error: "bad id" };
  if (id !== undefined && !shelf.has(id)) return { ok: false, status: 404, error: "no such note" };
  if (typeof b.title !== "string" || typeof b.body !== "string") return { ok: false, status: 400, error: "title and body required" };
  if (b.title.length > MAX_TITLE) return { ok: false, status: 413, error: `titles stop at ${MAX_TITLE} characters` };
  if (b.body.length > MAX_BODY) return { ok: false, status: 413, error: "the note is longer than 512 KB" };
  if (id === undefined && shelf.count() >= MAX_NOTES) return { ok: false, status: 409, error: `this computer holds at most ${MAX_NOTES} notes` };
  return { ok: true, value: { id, title: b.title, body: b.body, pinned: b.pinned === true } };
}

export interface NoteRow {
  n: number;
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
}

export function noteRows(notes: Note[]): NoteRow[] {
  return notes.map((x, i) => ({ n: i + 1, id: x.id, title: x.title, pinned: x.pinned, updatedAt: x.updatedAt }));
}
