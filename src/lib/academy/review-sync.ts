import type { Depth, EngineState } from "./engine";
import type { Rating } from "./fsrs";

export const OUTBOX_KEY = "bucket-academy/outbox/v1";
export const CURSOR_KEY = "bucket-academy/log-cursor/v1";
export const DEVICE_KEY = "bucket-academy/device/v1";
export const SEEDED_PREFIX = "bucket-academy/seeded/v1/";
export const OWNER_KEY = "bucket-academy/sync-owner/v1";
export const LOCK_NAME = "bucket-academy-review-outbox";
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
  owner?: string;
}

export interface SeedEntry {
  branch: string;
  owner?: string;
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
  lock?: <T>(fn: () => Promise<T>) => Promise<T>;
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

type Probe = { kind: "log"; user: string } | { kind: "snapshot" } | { kind: "offline" };

const PERMANENT_REFUSALS = new Set(["minor_read_only", "under_13"]);

function webLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { locks?: LockManager }).locks;
  return locks ? (locks.request(LOCK_NAME, fn) as Promise<T>) : fn();
}

export function createReviewSync(deps: ReviewSyncDeps): ReviewSync {
  const base = deps.base ?? "/api/academy/review-log";
  const lock = deps.lock ?? webLock;
  let mode: SyncMode = "unknown";
  let inflight: Promise<void> | null = null;

  const owner = () => read<string>(deps.storage(), OWNER_KEY, "");
  const cursorKey = (user: string) => `${CURSOR_KEY}/${user}`;
  const seededKey = (user: string, branch: string) => `${SEEDED_PREFIX}${user}/${branch}`;
  const loadOutbox = (): Outbox => {
    const o = read<Partial<Outbox>>(deps.storage(), OUTBOX_KEY, {});
    return { seeds: Array.isArray(o.seeds) ? o.seeds : [], reviews: Array.isArray(o.reviews) ? o.reviews : [] };
  };
  const mutate = (fn: (o: Outbox) => Outbox) => write(deps.storage(), OUTBOX_KEY, fn(loadOutbox()));
  const mine = (user: string) => (x: { owner?: string }) => !x.owner || x.owner === user;
  const notMine = (user: string) => (x: { owner?: string }) => !mine(user)(x);

  function deviceId(): string {
    const s = deps.storage();
    const have = read<string>(s, DEVICE_KEY, "");
    if (have) return have;
    const id = `web-${deps.uuid().replace(/-/g, "").slice(0, 24)}`;
    write(s, DEVICE_KEY, id);
    return id;
  }

  function appendReview(branch: string, review: ReviewEvent): QueuedReview {
    const who = owner();
    const q: QueuedReview = { ...review, review_id: deps.uuid(), branch, device_id: deviceId(), ...(who ? { owner: who } : {}) };
    mutate((o) => {
      const alreadySeeded = who !== "" && read<boolean>(deps.storage(), seededKey(who, branch), false);
      const queued = o.seeds.some((x) => x.branch === branch && (x.owner ?? "") === who);
      if (!alreadySeeded && !queued) {
        const local = deps.readLocal(branch);
        if (local) o.seeds.push({ branch, data: local, ...(who ? { owner: who } : {}) });
      }
      o.reviews.push(q);
      if (o.reviews.length > OUTBOX_CAP) o.reviews = o.reviews.slice(o.reviews.length - OUTBOX_CAP);
      return o;
    });
    return q;
  }

  async function probe(): Promise<Probe> {
    try {
      const res = await deps.fetch(`${base}?since=0&limit=1`, { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { error?: string; user?: string };
      if (res.ok && typeof j.user === "string" && j.user) return { kind: "log", user: j.user };
      if (res.status === 503 && j.error === "review_log_disabled") return { kind: "snapshot" };
      return { kind: "offline" };
    } catch {
      return { kind: "offline" };
    }
  }

  async function seed(user: string, branch: string): Promise<boolean> {
    const entry = loadOutbox().seeds.find((x) => x.branch === branch && mine(user)(x));
    if (entry && !(await deps.pushSnapshot(branch, entry.data))) return false;
    write(deps.storage(), seededKey(user, branch), true);
    mutate((o) => ({ ...o, seeds: o.seeds.filter((x) => !(x.branch === branch && mine(user)(x))) }));
    return true;
  }

  const dropMine = (user: string) => mutate((o) => ({ seeds: o.seeds.filter(notMine(user)), reviews: o.reviews.filter(notMine(user)) }));

  async function flushOnce(): Promise<void> {
    if (loadOutbox().reviews.length === 0) return;
    const p = await probe();
    if (p.kind === "snapshot") {
      mode = "snapshot";
      const who = owner();
      if (who) dropMine(who);
      else mutate(() => ({ seeds: [], reviews: [] }));
      return;
    }
    if (p.kind !== "log") return;
    const user = p.user;
    write(deps.storage(), OWNER_KEY, user);
    for (;;) {
      const queue = loadOutbox().reviews.filter(mine(user));
      if (queue.length === 0) return;
      const ready = new Set<string>();
      for (const b of Array.from(new Set(queue.map((r) => r.branch)))) {
        if (read<boolean>(deps.storage(), seededKey(user, b), false) || (await seed(user, b))) ready.add(b);
      }
      const batch = queue.filter((r) => ready.has(r.branch)).slice(0, BATCH);
      if (batch.length === 0) return;
      const body = JSON.stringify({ reviews: batch.map((r) => ({ ...r, owner: undefined })) });
      let res: Response;
      try {
        res = await deps.fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body });
      } catch {
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string; results?: { review_id: string }[] };
      if (res.status === 503) {
        if (j.error === "review_log_disabled") mode = "snapshot";
        return;
      }
      if (res.status === 403) {
        mode = "unknown";
        if (j.error && PERMANENT_REFUSALS.has(j.error)) dropMine(user);
        return;
      }
      if (res.status !== 200 && res.status !== 409) return;
      mode = "log";
      const done = new Set((j.results ?? []).map((r) => r.review_id));
      if (done.size === 0) return;
      mutate((x) => ({ ...x, reviews: x.reviews.filter((r) => !(done.has(r.review_id) && mine(user)(r))) }));
    }
  }

  function flush(): Promise<void> {
    if (!inflight) inflight = lock(flushOnce).finally(() => (inflight = null));
    return inflight;
  }

  async function pullLog(): Promise<PulledReview[] | null> {
    const s = deps.storage();
    const out: PulledReview[] = [];
    for (;;) {
      const who = owner();
      const since = who ? read<number>(s, cursorKey(who), 0) : 0;
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
      const j = (await res.json()) as { user: string; reviews: PulledReview[]; cursor: number; more: boolean };
      if (j.user !== who) {
        write(s, OWNER_KEY, j.user);
        out.length = 0;
        continue;
      }
      out.push(...j.reviews);
      if (j.cursor > since) write(s, cursorKey(j.user), j.cursor);
      if (!j.more || j.cursor <= since) return out;
    }
  }

  return {
    appendReview,
    flush,
    pullLog,
    pending: () => loadOutbox().reviews,
    cursor: () => {
      const who = owner();
      return who ? read<number>(deps.storage(), cursorKey(who), 0) : 0;
    },
    mode: () => mode,
    deviceId,
  };
}
