import { randomUUID } from "node:crypto";
import { checkNote } from "./core/notes";
import { open, seal } from "./crypto";
import type { Route } from "./serve";
import type { Store } from "./store";

export const MAX_TITLE = 200;
export const MAX_BODY = 512 * 1024;
export const MAX_NOTES = 5000;
export const NOTES_BODY_BYTES = 1024 * 1024;

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Doc {
  title: string;
  body: string;
}

const ID = /^[0-9a-f-]{36}$/;

export class NotesStore {
  constructor(
    private store: Store,
    private key: Buffer,
  ) {}

  private read(r: { id: string; doc: string; pinned: number; created_at: number; updated_at: number }): Note {
    const d = JSON.parse(open(this.key, r.doc, `note:${r.id}`)) as Doc;
    return { id: r.id, title: d.title, body: d.body, pinned: r.pinned === 1, createdAt: r.created_at, updatedAt: r.updated_at };
  }

  list(): Note[] {
    return this.store.db
      .query<{ id: string; doc: string; pinned: number; created_at: number; updated_at: number }, []>("select * from notes order by pinned desc, updated_at desc")
      .all()
      .map((r) => this.read(r));
  }

  get(id: string): Note | null {
    const r = this.store.db.query<{ id: string; doc: string; pinned: number; created_at: number; updated_at: number }, [string]>("select * from notes where id = ?").get(id);
    return r ? this.read(r) : null;
  }

  count(): number {
    return this.store.db.query<{ n: number }, []>("select count(*) n from notes").get()!.n;
  }

  save(input: { id?: string; title: string; body: string; pinned: boolean }, now: number): Note {
    const id = input.id ?? randomUUID();
    const doc = seal(this.key, JSON.stringify({ title: input.title, body: input.body }), `note:${id}`);
    this.store.db
      .query(
        "insert into notes (id, doc, pinned, created_at, updated_at) values (?, ?, ?, ?, ?) on conflict(id) do update set doc = excluded.doc, pinned = excluded.pinned, updated_at = excluded.updated_at",
      )
      .run(id, doc, input.pinned ? 1 : 0, now, now);
    return this.get(id)!;
  }

  remove(id: string): boolean {
    return this.store.db.query("delete from notes where id = ?").run(id).changes > 0;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function body(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function notesRoutes(notes: NotesStore, now: () => number = Date.now): Record<string, Route> {
  return {
    "GET /local/notes": () => json({ notes: notes.list() }),
    "POST /local/notes": async (req) => {
      const b = await body(req);
      const c = checkNote(b, { has: (id) => notes.get(id) !== null, count: () => notes.count() });
      if (!c.ok) return json({ error: c.error }, c.status);
      return json(notes.save(c.value, now()));
    },
    "POST /local/notes/delete": async (req) => {
      const b = await body(req);
      if (!b || typeof b.id !== "string" || !ID.test(b.id)) return json({ error: "bad id" }, 400);
      return notes.remove(b.id) ? json({ deleted: b.id }) : json({ error: "no such note" }, 404);
    },
  };
}
