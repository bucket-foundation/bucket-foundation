import type { Depth, EngineState } from "./engine";
import type { Rating } from "./fsrs";

export const OUTBOX_KEY = "bucket-academy/outbox/v1";
export const CURSOR_KEY = "bucket-academy/log-cursor/v1";
export const DEVICE_KEY = "bucket-academy/device/v1";
export const SEEDED_PREFIX = "bucket-academy/seeded/v1/";
export const OUTBOX_CAP = 2000;
export const BATCH = 200;
export const PULL_PAGE = 500;

export interface ReviewEvent {
  card_id: string;
  rating: Rating;
  level: Depth;
  reviewed_at: number;
  tz: string;
  atoms_version: string;
}

export interface QueuedReview extends ReviewEvent {
  review_id: string;
  branch: string;
  device_id: string;
}

export interface SeedEntry {
  branch: string;
  data: EngineState;
}

interface Outbox {
  seeds: SeedEntry[];
  reviews: QueuedReview[];
}

export interface PulledReview extends QueuedReview {
  seq: number;
}

export type SyncMode = "unknown" | "log" | "snapshot";

export interface ReviewSyncDeps {
  storage: () => Storage | null;
  fetch: typeof fetch;
  uuid: () => string;
  readLocal: (branch: string) => EngineState | null;
  pushSnapshot: (branch: string, state: EngineState) => Promise<boolean>;
  base?: string;
}

export interface ReviewSync {
  appendReview(branch: string, review: ReviewEvent): QueuedReview;
  flush(): Promise<void>;
  pullLog(): Promise<PulledReview[] | null>;
  pending(): QueuedReview[];
  cursor(): number;
  mode(): SyncMode;
  deviceId(): string;
}

function read<T>(s: Storage | null, key: string, fallback: T): T {
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(s: Storage | null, key: string, value: unknown): void {
  try {
    s?.setItem(key, JSON.stringify(value));
  } catch {
  }
}

export function createReviewSync(deps: ReviewSyncDeps): ReviewSync {
  const base = deps.base ?? "/api/academy/review-log";
  let mode: SyncMode = "unknown";
  let inflight: Promise<void> | null = null;

  const loadOutbox = (): Outbox => {
    const o = read<Partial<Outbox>>(deps.storage(), OUTBOX_KEY, {});
    return { seeds: Array.isArray(o.seeds) ? o.seeds : [], reviews: Array.isArray(o.reviews) ? o.reviews : [] };
  };
  const saveOutbox = (o: Outbox) => write(deps.storage(), OUTBOX_KEY, o);
  const seeded = (branch: string) => read<boolean>(deps.storage(), SEEDED_PREFIX + branch, false);

  function deviceId(): string {
    const s = deps.storage();
    const have = read<string>(s, DEVICE_KEY, "");
    if (have) return have;
    const id = `web-${deps.uuid().replace(/-/g, "").slice(0, 24)}`;
    write(s, DEVICE_KEY, id);
    return id;
  }

  function appendReview(branch: string, review: ReviewEvent): QueuedReview {
    const o = loadOutbox();
    if (!seeded(branch) && !o.seeds.some((x) => x.branch === branch)) {
      const local = deps.readLocal(branch);
      if (local) o.seeds.push({ branch, data: local });
    }
    const q: QueuedReview = { ...review, review_id: deps.uuid(), branch, device_id: deviceId() };
    o.reviews.push(q);
    if (o.reviews.length > OUTBOX_CAP) o.reviews = o.reviews.slice(o.reviews.length - OUTBOX_CAP);
    saveOutbox(o);
    return q;
  }

  async function seed(o: Outbox, branch: string): Promise<boolean> {
    const entry = o.seeds.find((x) => x.branch === branch);
    if (entry && !(await deps.pushSnapshot(branch, entry.data))) return false;
    write(deps.storage(), SEEDED_PREFIX + branch, true);
    const now = loadOutbox();
    now.seeds = now.seeds.filter((x) => x.branch !== branch);
    saveOutbox(now);
    return true;
  }

  async function probeMode(): Promise<"log" | "snapshot" | "offline"> {
    try {
      const res = await deps.fetch(`${base}?since=0&limit=1`, { cache: "no-store" });
      if (res.ok) return "log";
      if (res.status === 503) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return j.error === "review_log_disabled" ? "snapshot" : "offline";
      }
      return "offline";
    } catch {
      return "offline";
    }
  }

  async function flushOnce(): Promise<void> {
    const o = loadOutbox();
    if (o.reviews.length === 0) return;
    if (mode !== "log") {
      const probe = await probeMode();
      if (probe === "snapshot") {
        mode = "snapshot";
        saveOutbox({ seeds: [], reviews: [] });
        return;
      }
      if (probe !== "log") return;
      mode = "log";
    }
    const branches = Array.from(new Set(o.reviews.map((r) => r.branch)));
    const ready = new Set<string>();
    for (const b of branches) if (seeded(b) || (await seed(o, b))) ready.add(b);
    const batch = o.reviews.filter((r) => ready.has(r.branch)).slice(0, BATCH);
    if (batch.length === 0) return;
    let res: Response;
    try {
      res = await deps.fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviews: batch }) });
    } catch {
      return;
    }
    if (res.status === 503) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (j.error === "review_log_disabled") mode = "snapshot";
      return;
    }
    if (res.status === 403) {
      saveOutbox({ seeds: [], reviews: [] });
      return;
    }
    if (res.status !== 200 && res.status !== 409) return;
    mode = "log";
    const j = (await res.json().catch(() => ({}))) as { results?: { review_id: string }[] };
    const done = new Set((j.results ?? []).map((r) => r.review_id));
    const after = loadOutbox();
    after.reviews = after.reviews.filter((r) => !done.has(r.review_id));
    saveOutbox(after);
    if (done.size > 0 && after.reviews.length > 0) await flushOnce();
  }

  function flush(): Promise<void> {
    if (!inflight) inflight = flushOnce().finally(() => (inflight = null));
    return inflight;
  }

  async function pullLog(): Promise<PulledReview[] | null> {
    const s = deps.storage();
    const out: PulledReview[] = [];
    for (;;) {
      const since = read<number>(s, CURSOR_KEY, 0);
      let res: Response;
      try {
        res = await deps.fetch(`${base}?since=${since}&limit=${PULL_PAGE}`, { cache: "no-store" });
      } catch {
        return null;
      }
      if (res.status === 503) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (j.error === "review_log_disabled") mode = "snapshot";
        return null;
      }
      if (!res.ok) return null;
      mode = "log";
      const j = (await res.json()) as { reviews: PulledReview[]; cursor: number; more: boolean };
      out.push(...j.reviews);
      if (j.cursor > since) write(s, CURSOR_KEY, j.cursor);
      if (!j.more || j.cursor <= since) return out;
    }
  }

  return {
    appendReview,
    flush,
    pullLog,
    pending: () => loadOutbox().reviews,
    cursor: () => read<number>(deps.storage(), CURSOR_KEY, 0),
    mode: () => mode,
    deviceId,
  };
}
