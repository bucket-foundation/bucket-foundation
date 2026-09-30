import { createHmac } from "node:crypto";
import type { AdvisorReview, AdvisorRow, PrimeDirections } from "../../../src/lib/research-os/advisor-review";
import type { Store } from "./store";

export interface ImportResult {
  imported: number;
  forgotten: number;
}

export interface ReviewMeta {
  key: string;
  prime_axes: string[];
  our_axes: string[];
  star_query_prime: number[];
  star_query_ours: number[];
  summary: string;
  imported_at: number;
}

export function forgetKey(dataKey: Buffer): Buffer {
  return createHmac("sha256", dataKey).update("bkt people-forget v1").digest();
}

export function personMark(key: Buffer, row: Pick<AdvisorRow, "name" | "fields">): string {
  const inst = typeof row.fields.institution === "string" ? row.fields.institution : "";
  const who = [row.name, inst].map((s) => s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ")).join("\u0000");
  return createHmac("sha256", key).update(who).digest("hex");
}

export class PeopleStore {
  private key: Buffer;

  constructor(
    private store: Store,
    dataKey: Buffer,
  ) {
    this.key = forgetKey(dataKey);
  }

  importReview(review: AdvisorReview, now: number, force = false): ImportResult {
    const db = this.store.db;
    const forgotten = new Set(db.query<{ mark: string }, []>("select mark from people_forget").all().map((r) => r.mark));
    const marked = review.rows.map((row) => ({ row, mark: personMark(this.key, row) }));
    const blocked = marked.filter((m) => forgotten.has(m.mark));
    const keep = force ? marked : marked.filter((m) => !forgotten.has(m.mark));
    const { rows: _rows, schema: _schema, ...meta } = review;
    db.transaction(() => {
      db.run("delete from advisor_rows");
      db.query("insert into advisor_review (id, key, meta, imported_at) values (1, ?, ?, ?) on conflict(id) do update set key = excluded.key, meta = excluded.meta, imported_at = excluded.imported_at").run(
        review.key,
        JSON.stringify(meta),
        now,
      );
      const ins = db.query("insert into advisor_rows (rank, person_mark, data) values (?, ?, ?)");
      for (const { row, mark } of keep) ins.run(row.rank, mark, JSON.stringify(row));
      if (force) {
        const del = db.query("delete from people_forget where mark = ?");
        for (const { mark } of blocked) del.run(mark);
      }
    })();
    return { imported: keep.length, forgotten: force ? 0 : blocked.length };
  }

  review(): (ReviewMeta & { rows: AdvisorRow[] }) | null {
    const head = this.store.db.query<{ meta: string; imported_at: number }, []>("select meta, imported_at from advisor_review where id = 1").get();
    if (!head) return null;
    const rows = this.store.db
      .query<{ data: string }, []>("select data from advisor_rows order by rank")
      .all()
      .map((r) => JSON.parse(r.data) as AdvisorRow);
    return { ...(JSON.parse(head.meta) as Omit<ReviewMeta, "imported_at">), imported_at: head.imported_at, rows };
  }

  forget(now: number): number {
    const db = this.store.db;
    const marks = db.query<{ person_mark: string }, []>("select person_mark from advisor_rows").all();
    db.transaction(() => {
      const ins = db.query("insert into people_forget (mark, at) values (?, ?) on conflict(mark) do nothing");
      for (const m of marks) ins.run(m.person_mark, now);
      db.run("delete from advisor_rows");
      db.run("delete from advisor_review");
    })();
    return marks.length;
  }

  forgottenCount(): number {
    return this.store.db.query<{ n: number }, []>("select count(*) n from people_forget").get()!.n;
  }

  importDirections(d: PrimeDirections, now: number) {
    this.store.db
      .query("insert into prime_directions (corpus, data, imported_at) values (?, ?, ?) on conflict(corpus) do update set data = excluded.data, imported_at = excluded.imported_at")
      .run(d.corpus, JSON.stringify(d), now);
  }

  directions(): (PrimeDirections & { imported_at: number })[] {
    return this.store.db
      .query<{ data: string; imported_at: number }, []>("select data, imported_at from prime_directions order by imported_at desc, corpus")
      .all()
      .map((r) => ({ ...(JSON.parse(r.data) as PrimeDirections), imported_at: r.imported_at }));
  }
}
