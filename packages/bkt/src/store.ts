import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { open, seal } from "./crypto";
import type { Card, Item, Rating } from "./grade";

export const SCHEMA_VERSION = 1;

const MIGRATIONS = [
  `create table meta (k text primary key, v text not null);
   create table device (id text primary key, public_key text not null, created_at integer not null);
   create table items (id text primary key, atom_id text not null, branch text not null, title text not null,
     level text not null, prompt text not null, answer text not null, pack_version text not null);
   create table cards (item_id text primary key references items(id), state text not null, updated_at integer not null, due integer);
   create index cards_due on cards(due);
   create table attempts (id text primary key, item_id text not null references items(id), mode text not null,
     response_enc text, correct integer not null, rating integer not null, elapsed_ms integer not null, at integer not null);
   create index attempts_item on attempts(item_id, at);
   create table outbox (id text primary key, kind text not null, ref_id text not null, payload_enc text not null,
     created_at integer not null, sent_at integer);`,
];

export interface AttemptInput {
  itemId: string;
  mode: "quiz" | "review";
  response: string | null;
  correct: boolean;
  rating: Rating;
  elapsedMs: number;
  at: number;
}

export interface Attempt extends AttemptInput {
  id: string;
}

export class Store {
  readonly db: Database;

  constructor(path: string, private key: Buffer) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new Database(path, { create: true, strict: true });
    this.db.run("pragma journal_mode = wal");
    this.db.run("pragma foreign_keys = on");
    this.db.run("pragma busy_timeout = 5000");
    this.migrate();
    this.checkKey();
  }

  private migrate() {
    const current = this.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version;
    for (let v = current; v < MIGRATIONS.length; v++) {
      this.db.transaction(() => {
        this.db.run(MIGRATIONS[v]);
        this.db.run(`pragma user_version = ${v + 1}`);
      })();
    }
  }

  private checkKey() {
    const row = this.db.query<{ v: string }, [string]>("select v from meta where k = ?").get("key_check");
    if (!row) {
      this.db.query("insert into meta (k, v) values (?, ?)").run("key_check", seal(this.key, "bkt", "key_check"));
      return;
    }
    try {
      open(this.key, row.v, "key_check");
    } catch {
      throw new Error("data key does not match this database");
    }
  }

  journalMode(): string {
    return this.db.query<{ journal_mode: string }, []>("pragma journal_mode").get()!.journal_mode;
  }

  meta(k: string): string | null {
    return this.db.query<{ v: string }, [string]>("select v from meta where k = ?").get(k)?.v ?? null;
  }

  setMeta(k: string, v: string) {
    this.db.query("insert into meta (k, v) values (?, ?) on conflict(k) do update set v = excluded.v").run(k, v);
  }

  recordDevice(id: string, publicKey: string, now: number) {
    this.db.query("insert into device (id, public_key, created_at) values (?, ?, ?) on conflict(id) do nothing").run(id, publicKey, now);
  }

  device(): { id: string; public_key: string; created_at: number } | null {
    return this.db.query<{ id: string; public_key: string; created_at: number }, []>("select * from device limit 1").get() ?? null;
  }

  importPack(version: string, items: Item[]): number {
    if (this.meta("pack_version") === version) return 0;
    const ins = this.db.query(
      `insert into items (id, atom_id, branch, title, level, prompt, answer, pack_version) values (?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(id) do update set atom_id = excluded.atom_id, branch = excluded.branch, title = excluded.title,
       level = excluded.level, prompt = excluded.prompt, answer = excluded.answer, pack_version = excluded.pack_version`,
    );
    this.db.transaction(() => {
      for (const i of items) ins.run(i.id, i.atomId, i.branch, i.title, i.level, i.prompt, i.answer, version);
      this.setMeta("pack_version", version);
    })();
    return items.length;
  }

  items(): Item[] {
    return this.db
      .query<{ id: string; atom_id: string; branch: string; title: string; level: string; prompt: string; answer: string }, []>(
        "select id, atom_id, branch, title, level, prompt, answer from items order by id",
      )
      .all()
      .map((r) => ({ id: r.id, atomId: r.atom_id, branch: r.branch, title: r.title, level: r.level, prompt: r.prompt, answer: r.answer }));
  }

  card(itemId: string): Card | null {
    const row = this.db.query<{ state: string }, [string]>("select state from cards where item_id = ?").get(itemId);
    return row ? (JSON.parse(row.state) as Card) : null;
  }

  putCard(itemId: string, card: Card, now: number) {
    this.db
      .query(
        "insert into cards (item_id, state, updated_at, due) values (?, ?, ?, ?) on conflict(item_id) do update set state = excluded.state, updated_at = excluded.updated_at, due = excluded.due",
      )
      .run(itemId, JSON.stringify(card), now, card.due ?? null);
  }

  dueItemIds(now: number, limit: number): string[] {
    return this.db
      .query<{ item_id: string }, [number, number]>("select item_id from cards where due is not null and due <= ? order by due limit ?")
      .all(now, limit)
      .map((r) => r.item_id);
  }

  newItemIds(limit: number): string[] {
    return this.db
      .query<{ id: string }, [number]>("select id from items where id not in (select item_id from cards) order by id limit ?")
      .all(limit)
      .map((r) => r.id);
  }

  recordAttempt(a: AttemptInput): string {
    const id = randomUUID();
    const responseEnc = a.response === null ? null : seal(this.key, a.response, `attempt:${id}`);
    const payload = seal(this.key, JSON.stringify({ id, ...a }), `outbox:${id}`);
    this.db.transaction(() => {
      this.db
        .query("insert into attempts (id, item_id, mode, response_enc, correct, rating, elapsed_ms, at) values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, a.itemId, a.mode, responseEnc, a.correct ? 1 : 0, a.rating, Math.round(a.elapsedMs), a.at);
      this.db.query("insert into outbox (id, kind, ref_id, payload_enc, created_at) values (?, ?, ?, ?, ?)").run(randomUUID(), "attempt", id, payload, a.at);
    })();
    return id;
  }

  attempts(itemId?: string): Attempt[] {
    type Row = { id: string; item_id: string; mode: "quiz" | "review"; response_enc: string | null; correct: number; rating: Rating; elapsed_ms: number; at: number };
    const rows = itemId
      ? this.db.query<Row, [string]>("select * from attempts where item_id = ? order by at").all(itemId)
      : this.db.query<Row, []>("select * from attempts order by at").all();
    return rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      mode: r.mode,
      response: r.response_enc === null ? null : open(this.key, r.response_enc, `attempt:${r.id}`),
      correct: r.correct === 1,
      rating: r.rating,
      elapsedMs: r.elapsed_ms,
      at: r.at,
    }));
  }

  outboxCount(): number {
    return this.db.query<{ n: number }, []>("select count(*) n from outbox where sent_at is null").get()!.n;
  }

  stats(now: number): { items: number; seen: number; due: number; attempts: number } {
    const q = (sql: string, ...args: number[]) => this.db.query<{ n: number }, number[]>(sql).get(...args)!.n;
    return {
      items: q("select count(*) n from items"),
      seen: q("select count(*) n from cards"),
      due: q("select count(*) n from cards where due <= ?", now),
      attempts: q("select count(*) n from attempts"),
    };
  }

  close() {
    this.db.close();
  }
}
