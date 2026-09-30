import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { open, seal } from "./crypto";
import { ADAPTIVE, grade as engineGrade, normalizeState, updateProficiency, type Depth, type EncEdge, type EngineState } from "../../../src/lib/academy/engine";
import type { Card, Item, Rating } from "./grade";

export const SCHEMA_VERSION = 4;

export const SYNC_TABLES = ["attempts"] as const;

export const LOCAL_ONLY_TABLES = ["advisor_review", "advisor_rows", "prime_directions", "people_forget"] as const;

export const LEGACY_DECKS: Record<string, string> = { biophysics: "05-biophysics" };

export function deckOf(branch: string): string {
  return LEGACY_DECKS[branch] ?? branch;
}

const deckCase = `case branch ${Object.entries(LEGACY_DECKS)
  .map(([b, d]) => `when '${b}' then '${d}'`)
  .join(" ")} else branch end`;

const toProf = (p: { theta?: number; n?: number }) => ({ theta: p.theta ?? 0, n: p.n ?? 0 });

type Migration = string | ((db: Database) => void);

export function migrateLearn(db: Database) {
  db.run(`create table learn_cards (deck text not null, card_id text not null, state text not null, due integer, updated_at integer not null,
      primary key (deck, card_id));
    create index learn_cards_due on learn_cards(due);
    create table learn_prof (deck text not null, card_id text not null, theta real not null, n integer not null, primary key (deck, card_id));
    create table learn_settings (deck text primary key, data text not null, updated_at integer not null);
    create table learn_stats (deck text primary key, data text not null, updated_at integer not null);
    alter table items add column deck text;`);
  db.run(`update items set deck = ${deckCase}`);
  type Row = { deck: string; atom_id: string; state: string; updated_at: number };
  const rows = db.query<Row, []>("select i.deck, i.atom_id, c.state, c.updated_at from cards c join items i on i.id = c.item_id order by c.item_id").all();
  const best = new Map<string, { row: Row; card: Card }>();
  for (const row of rows) {
    const card = JSON.parse(row.state) as Card;
    const k = JSON.stringify([row.deck, row.atom_id]);
    const prev = best.get(k);
    if (!prev || (card.lastReview ?? 0) > (prev.card.lastReview ?? 0)) best.set(k, { row, card });
  }
  const insCard = db.query("insert into learn_cards (deck, card_id, state, due, updated_at) values (?, ?, ?, ?, ?)");
  for (const { row, card } of best.values()) insCard.run(row.deck, row.atom_id, JSON.stringify(card), card.due ?? null, row.updated_at);
  const attempts = db
    .query<{ deck: string; atom_id: string; level: string; rating: number }, []>(
      "select i.deck, i.atom_id, i.level, a.rating from attempts a join items i on i.id = a.item_id order by a.at, a.id",
    )
    .all();
  const prof = new Map<string, { deck: string; id: string; p: { theta: number; n: number } }>();
  for (const a of attempts) {
    const k = JSON.stringify([a.deck, a.atom_id]);
    const score = ADAPTIVE.PROF_RATING_SCORE[a.rating] ?? (a.rating > 1 ? 1 : 0);
    prof.set(k, { deck: a.deck, id: a.atom_id, p: toProf(updateProficiency(prof.get(k)?.p, a.level, score)) });
  }
  const insProf = db.query("insert into learn_prof (deck, card_id, theta, n) values (?, ?, ?, ?)");
  for (const { deck, id, p } of prof.values()) insProf.run(deck, id, p.theta, p.n);
  db.run("drop index cards_due; drop table cards;");
}

export const MIGRATIONS: Migration[] = [
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
  `create table hai_probe (id text primary key, bank_version text not null, seed text not null, started_at integer not null,
     completed_at integer, due_at integer, retest_completed_at integer);
   create table hai_answer (id text primary key, probe_id text not null references hai_probe(id) on delete cascade, pair_id text not null,
     item_id text not null, condition text not null check (condition in ('solo', 'pair')), phase text not null check (phase in ('t0', 'retest')),
     response_enc text, correct integer not null, accepted_ai integer, elapsed_ms integer not null, at integer not null,
     unique (probe_id, item_id, phase));
   create index hai_answer_item on hai_answer(item_id);`,
  migrateLearn,
  `create table advisor_review (id integer primary key check (id = 1), key text not null, meta text not null, imported_at integer not null);
   create table advisor_rows (rank integer primary key, person_mark text not null, data text not null);
   create index advisor_rows_mark on advisor_rows(person_mark);
   create table prime_directions (corpus text primary key, data text not null, imported_at integer not null);
   create table people_forget (mark text primary key, at integer not null);`,
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
    this.db.run("pragma secure_delete = on");
    this.db.run("pragma busy_timeout = 5000");
    this.migrate();
    this.checkKey();
  }

  private migrate() {
    const current = this.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version;
    for (let v = current; v < MIGRATIONS.length; v++) {
      this.db.transaction(() => {
        const m = MIGRATIONS[v];
        if (typeof m === "string") this.db.run(m);
        else m(this.db);
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
      `insert into items (id, atom_id, branch, deck, title, level, prompt, answer, pack_version) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(id) do update set atom_id = excluded.atom_id, branch = excluded.branch, deck = excluded.deck, title = excluded.title,
       level = excluded.level, prompt = excluded.prompt, answer = excluded.answer, pack_version = excluded.pack_version`,
    );
    this.db.transaction(() => {
      for (const i of items) ins.run(i.id, i.atomId, i.branch, deckOf(i.branch), i.title, i.level, i.prompt, i.answer, version);
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

  private itemKey(itemId: string): { deck: string; atom: string; level: string } | null {
    const r = this.db.query<{ deck: string; atom_id: string; level: string }, [string]>("select deck, atom_id, level from items where id = ?").get(itemId);
    return r ? { deck: r.deck, atom: r.atom_id, level: r.level } : null;
  }

  card(itemId: string): Card | null {
    const k = this.itemKey(itemId);
    if (!k) return null;
    const row = this.db.query<{ state: string }, [string, string]>("select state from learn_cards where deck = ? and card_id = ?").get(k.deck, k.atom);
    return row ? (JSON.parse(row.state) as Card) : null;
  }

  dueItemIds(now: number, limit: number): string[] {
    return this.db
      .query<{ id: string }, [number, number]>(
        `select (select min(i.id) from items i where i.deck = c.deck and i.atom_id = c.card_id) id from learn_cards c
         where c.due is not null and c.due <= ? and exists (select 1 from items i where i.deck = c.deck and i.atom_id = c.card_id)
         order by c.due, c.deck, c.card_id limit ?`,
      )
      .all(now, limit)
      .map((r) => r.id);
  }

  newItemIds(limit: number): string[] {
    return this.db
      .query<{ id: string }, [number]>(
        `select min(i.id) id from items i where not exists (select 1 from learn_cards c where c.deck = i.deck and c.card_id = i.atom_id)
         group by i.deck, i.atom_id order by id limit ?`,
      )
      .all(limit)
      .map((r) => r.id);
  }

  learnDecks(): string[] {
    return this.db
      .query<{ deck: string }, []>("select deck from learn_cards union select deck from learn_prof union select deck from learn_settings union select deck from learn_stats order by deck")
      .all()
      .map((r) => r.deck);
  }

  learnUpdatedAt(deck: string): number {
    const q = (table: string) => this.db.query<{ t: number | null }, [string]>(`select max(updated_at) t from ${table} where deck = ?`).get(deck)?.t ?? 0;
    return Math.max(q("learn_cards"), q("learn_settings"), q("learn_stats"));
  }

  learnState(deck: string): EngineState {
    const cards: Record<string, Card> = {};
    for (const r of this.db.query<{ card_id: string; state: string }, [string]>("select card_id, state from learn_cards where deck = ?").all(deck))
      cards[r.card_id] = JSON.parse(r.state) as Card;
    const prof: EngineState["prof"] = {};
    for (const r of this.db.query<{ card_id: string; theta: number; n: number }, [string]>("select card_id, theta, n from learn_prof where deck = ?").all(deck))
      prof[r.card_id] = { theta: r.theta, n: r.n };
    const settings = this.db.query<{ data: string }, [string]>("select data from learn_settings where deck = ?").get(deck);
    const stats = this.db.query<{ data: string }, [string]>("select data from learn_stats where deck = ?").get(deck);
    return normalizeState({ cards, prof, settings: settings ? JSON.parse(settings.data) : undefined, stats: stats ? JSON.parse(stats.data) : undefined });
  }

  putLearnState(deck: string, raw: unknown, now: number) {
    const s = normalizeState(raw);
    this.db.transaction(() => {
      const existing = new Map(
        this.db.query<{ card_id: string; state: string }, [string]>("select card_id, state from learn_cards where deck = ?").all(deck).map((r) => [r.card_id, r.state]),
      );
      const keep = new Set<string>();
      const up = this.db.query(
        "insert into learn_cards (deck, card_id, state, due, updated_at) values (?, ?, ?, ?, ?) on conflict(deck, card_id) do update set state = excluded.state, due = excluded.due, updated_at = excluded.updated_at",
      );
      for (const [id, c] of Object.entries(s.cards)) {
        if (!c || typeof c !== "object") continue;
        keep.add(id);
        const state = JSON.stringify(c);
        if (existing.get(id) !== state) up.run(deck, id, state, typeof c.due === "number" ? c.due : null, now);
      }
      const del = this.db.query("delete from learn_cards where deck = ? and card_id = ?");
      for (const id of existing.keys()) if (!keep.has(id)) del.run(deck, id);
      this.db.query("delete from learn_prof where deck = ?").run(deck);
      const ip = this.db.query("insert into learn_prof (deck, card_id, theta, n) values (?, ?, ?, ?)");
      for (const [id, p] of Object.entries(s.prof)) if (p && Number.isFinite(p.theta)) ip.run(deck, id, p.theta ?? 0, Number.isFinite(p.n) ? (p.n as number) : 0);
      for (const table of ["learn_settings", "learn_stats"] as const) {
        const data = JSON.stringify(table === "learn_settings" ? s.settings : s.stats);
        const prev = this.db.query<{ data: string }, [string]>(`select data from ${table} where deck = ?`).get(deck)?.data;
        if (prev !== data)
          this.db
            .query(`insert into ${table} (deck, data, updated_at) values (?, ?, ?) on conflict(deck) do update set data = excluded.data, updated_at = excluded.updated_at`)
            .run(deck, data, now);
      }
    })();
  }

  gradeItem(itemId: string, rating: Rating, now: number, encompassing: Record<string, EncEdge[]> = {}): Card {
    const k = this.itemKey(itemId);
    if (!k) throw new Error(`unknown item ${itemId}`);
    return this.db.transaction(() => {
      const next = engineGrade(this.learnState(k.deck), [], encompassing, k.atom, rating, k.level as Depth, now);
      this.putLearnState(k.deck, next, now);
      return next.cards[k.atom];
    }).immediate();
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
      seen: q("select count(*) n from learn_cards"),
      due: q("select count(*) n from learn_cards where due <= ?", now),
      attempts: q("select count(*) n from attempts"),
    };
  }

  close() {
    this.db.close();
  }
}
