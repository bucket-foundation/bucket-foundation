import { parseProductionsSnapshot, SnapshotError, type ProductionsSnapshot } from "../../../src/lib/research-os/productions-snapshot";
import { open, seal } from "./crypto";
import { HISTORY_DEFAULT_DAYS, HISTORY_MAX_DAYS, studyHistory, type StudyHistory } from "./core/history";
import type { Route } from "./serve";
import type { Store } from "./store";

export const HISTORY_BODY_BYTES = 16 * 1024 * 1024;
export const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;

export class SnapshotTooLarge extends Error {}
export const DAY_MS = 86_400_000;

export interface ActivityDay {
  day: string;
  learn: number;
  work: number;
  notes: number;
}

export class HistoryStore {
  constructor(
    private store: Store,
    private key: Buffer,
  ) {}

  snapshot(): (ProductionsSnapshot & { importedAt: number }) | null {
    const r = this.store.db.query<{ doc: string; imported_at: number }, []>("select doc, imported_at from history_snapshot where id = 1").get();
    return r ? { ...(JSON.parse(open(this.key, r.doc, "history_snapshot")) as ProductionsSnapshot), importedAt: r.imported_at } : null;
  }

  save(s: ProductionsSnapshot, now: number) {
    const doc = JSON.stringify(s);
    if (Buffer.byteLength(doc) > MAX_SNAPSHOT_BYTES) throw new SnapshotTooLarge(`the snapshot is larger than ${MAX_SNAPSHOT_BYTES / 1048576} MB after cleaning`);
    this.store.db
      .query("insert into history_snapshot (id, doc, imported_at) values (1, ?, ?) on conflict(id) do update set doc = excluded.doc, imported_at = excluded.imported_at")
      .run(seal(this.key, doc, "history_snapshot"), now);
  }

  study(now: number, days?: number): StudyHistory {
    return studyHistory(this.store.db, now, days);
  }

  forget() {
    this.store.db.run("delete from history_snapshot");
  }

  activity(now: number, days = 60): ActivityDay[] {
    const since = now - days * DAY_MS;
    const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);
    const out = new Map<string, ActivityDay>();
    for (let t = now - (days - 1) * DAY_MS; t <= now; t += DAY_MS) out.set(dayOf(t), { day: dayOf(t), learn: 0, work: 0, notes: 0 });
    const bump = (rows: { at: number }[], k: "learn" | "work" | "notes") => {
      for (const r of rows) {
        const d = out.get(dayOf(r.at));
        if (d) d[k]++;
      }
    };
    bump(this.store.db.query<{ at: number }, [number]>("select at from attempts where at >= ?").all(since), "learn");
    bump(this.store.db.query<{ at: number }, [number]>("select at from work_quiz_attempts where at >= ?").all(since), "work");
    bump(this.store.db.query<{ at: number }, [number]>("select updated_at at from notes where updated_at >= ?").all(since), "notes");
    return [...out.values()];
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function historyRoutes(h: HistoryStore, now: () => number = Date.now): Record<string, Route> {
  return {
    "GET /local/history": (_req, url) => {
      const raw = url.searchParams.get("days");
      const days = raw !== null && /^\d{1,4}$/.test(raw) && Number(raw) >= 1 && Number(raw) <= HISTORY_MAX_DAYS ? Number(raw) : HISTORY_DEFAULT_DAYS;
      return json({ snapshot: h.snapshot(), activity: h.activity(now()), study: h.study(now(), days) });
    },
    "POST /local/history/import": async (req) => {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return json({ error: "the file is not valid JSON" }, 400);
      }
      try {
        const s = parseProductionsSnapshot(raw);
        h.save(s, now());
        return json({ productions: s.productions.length });
      } catch (e) {
        if (e instanceof SnapshotError) return json({ error: e.message }, 400);
        if (e instanceof SnapshotTooLarge) return json({ error: e.message }, 413);
        throw e;
      }
    },
    "POST /local/history/forget": () => {
      h.forget();
      return json({ cleared: true });
    },
  };
}
