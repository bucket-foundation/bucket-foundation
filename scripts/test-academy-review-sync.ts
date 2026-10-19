import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { buildEncompassingMap, grade, mergeState, normalizeState, type Atom, type EngineState } from "../src/lib/academy/engine";
import { corpusAtomsVersion } from "../src/lib/academy/replay";
import { createReviewLogHandlers, type AppendRow, type StoredReview } from "../src/lib/academy/review-log-server";
import { OUTBOX_CAP, OUTBOX_KEY, createReviewSync, heldAction, type Fetcher, type ReviewEvent, type ReviewSync } from "../src/lib/academy/review-sync";

const BRANCH = "01-mathematics";
const ATOMS = [
  { id: "a1", title: "A1", shell: "nucleus" },
  { id: "a2", title: "A2", shell: "nucleus" },
  { id: "a3", title: "A3", shell: "nucleus" },
] as unknown as Atom[];
const ENC = buildEncompassingMap(ATOMS);
const T0 = Date.UTC(2026, 9, 18, 9);

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size;
    },
  };
}

class Server {
  enabled = true;
  online = true;
  user = "u1";
  band: "18plus" | "13to17" | null = "18plus";
  progress = new Map<string, { data: EngineState; log_seq: number | null }>();
  baseline = new Map<string, EngineState>();
  log: (AppendRow & { seq: number; user: string })[] = [];
  mastery = 0;
  snapshots = 0;
  handlers = createReviewLogHandlers({
    enabled: () => this.enabled,
    configured: () => true,
    origins: () => [],
    now: () => T0 + 3_600_000,
    verifyUser: async () => this.user,
    readAgeBand: async () => ({ ok: true, band: this.band }),
    appendReviews: async (_uid, rows) =>
      rows.map((r) => {
        const prev = this.log.find((x) => x.branch === r.branch && x.review_id === r.review_id);
        if (prev && prev.user !== this.user) throw new Error("cross-user review_id");
        if (prev) return { review_id: r.review_id, status: prev.payload_hash === r.payload_hash ? ("duplicate" as const) : ("conflict" as const), seq: prev.seq };
        if (!this.baseline.has(r.branch)) this.baseline.set(r.branch, this.progress.get(r.branch)?.data ?? normalizeState(null));
        const seq = this.log.length + 1;
        this.log.push({ ...r, seq, user: this.user });
        return { review_id: r.review_id, status: "inserted" as const, seq };
      }),
    readLog: async (uid, since, limit) => this.log.filter((r) => r.user === uid && r.seq > since).slice(0, limit).map((r) => this.stored(r)),
    readBranch: async (_uid, branch) => ({ baseline: this.baseline.get(branch) ?? null, rows: this.log.filter((r) => r.branch === branch).map((r) => this.stored(r)) }),
    writeFold: async (_uid, branch, data, seq) => {
      const cur = this.progress.get(branch);
      if (cur && cur.log_seq !== null && cur.log_seq > seq) return false;
      this.progress.set(branch, { data, log_seq: seq });
      return true;
    },
    syncMastery: async () => {
      this.mastery++;
      return { advanced: 0 };
    },
    atoms: (branch) => ({ [corpusAtomsVersion(branch)]: ATOMS }),
  });

  stored(r: AppendRow & { seq: number; user: string }): StoredReview {
    return { ...r, reviewed_at: Date.parse(r.reviewed_at), seq: r.seq };
  }

  fetch: Fetcher = async (input, init) => {
    if (!this.online) throw new TypeError("offline");
    const req = new Request(new URL(String(input), "https://bucket.foundation"), init as RequestInit);
    return req.method === "POST" ? this.handlers.POST(req) : this.handlers.GET(req);
  };

  pushSnapshot = async (branch: string, state: EngineState): Promise<boolean> => {
    if (!this.online) return false;
    this.snapshots++;
    const cur = this.progress.get(branch);
    this.progress.set(branch, { data: state, log_seq: cur?.log_seq ?? null });
    return true;
  };
}

let chain: Promise<unknown> = Promise.resolve();
function tabLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

let clock = T0;
const problems: [string, number][] = [];

class Tab {
  sync: ReviewSync;
  state: EngineState;
  constructor(
    readonly server: Server,
    readonly storage: Storage,
  ) {
    this.state = this.readLocal() ?? normalizeState(null);
    this.sync = createReviewSync({
      storage: () => storage,
      fetch: (input, init) => server.fetch(input, init),
      uuid: randomUUID,
      readLocal: () => this.readLocal(),
      pushSnapshot: server.pushSnapshot,
      lock: tabLock,
      now: () => ++clock,
      onProblem: (p, n) => void problems.push([p, n]),
    });
  }
  readLocal(): EngineState | null {
    const raw = this.storage.getItem(`bucket-academy/v1/${BRANCH}`);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  }
  study(id: string, at: number): void {
    const ev: ReviewEvent = { card_id: id, rating: 3, level: "recall", reviewed_at: at, tz: "UTC", atoms_version: corpusAtomsVersion(BRANCH) };
    this.sync.appendReview(BRANCH, ev);
    this.state = grade(this.state, ATOMS, ENC, id, 3, "recall", at, "UTC");
    this.storage.setItem(`bucket-academy/v1/${BRANCH}`, JSON.stringify(this.state));
  }
}

const cards = (s: EngineState | undefined) => Object.keys(s?.cards ?? {}).sort();

test("the outbox survives a reload and drains once the server answers", async () => {
  const server = new Server();
  const storage = memoryStorage();
  server.online = false;
  const tab = new Tab(server, storage);
  tab.study("a1", T0);
  await tab.sync.flush();
  assert.equal(tab.sync.pending().length, 1);
  const reloaded = new Tab(server, storage);
  assert.equal(reloaded.sync.pending().length, 1);
  assert.equal(reloaded.sync.pending()[0].review_id, tab.sync.pending()[0].review_id);
  server.online = true;
  await reloaded.sync.flush();
  assert.equal(reloaded.sync.pending().length, 0);
  assert.equal(server.log.length, 1);
  await reloaded.sync.flush();
  assert.equal(server.log.length, 1);
});

test("an existing user keeps pre-log progress after the first log write", async () => {
  const server = new Server();
  const storage = memoryStorage();
  const prior = grade(grade(normalizeState(null), ATOMS, ENC, "a1", 3, "recall", T0 - 86_400_000, "UTC"), ATOMS, ENC, "a2", 4, "recall", T0 - 86_000_000, "UTC");
  server.progress.set(BRANCH, { data: prior, log_seq: null });
  storage.setItem(`bucket-academy/v1/${BRANCH}`, JSON.stringify(prior));
  const tab = new Tab(server, storage);
  tab.study("a3", T0);
  await tab.sync.flush();
  const fold = server.progress.get(BRANCH);
  assert.equal(fold?.log_seq, 1);
  assert.deepEqual(cards(fold?.data), ["a1", "a2", "a3"]);
  assert.deepEqual(fold?.data.cards.a1, prior.cards.a1);
  assert.deepEqual(fold?.data.cards.a2, prior.cards.a2);
  assert.deepEqual(fold?.data.cards.a3, tab.state.cards.a3);
  assert.equal(fold?.data.stats.xp, tab.state.stats.xp);
  assert.deepEqual(cards(server.baseline.get(BRANCH)), ["a1", "a2"]);
});

test("a log write runs syncAcademyMastery", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.study("a1", T0);
  await tab.sync.flush();
  assert.equal(server.mastery, 1);
});

test("two tabs sharing one browser converge on the same state without duplicate rows", async () => {
  const server = new Server();
  const storage = memoryStorage();
  const a = new Tab(server, storage);
  const b = new Tab(server, storage);
  a.study("a1", T0);
  b.study("a2", T0 + 1000);
  await Promise.all([a.sync.flush(), b.sync.flush()]);
  await Promise.all([a.sync.flush(), b.sync.flush()]);
  assert.equal(server.log.length, 2);
  assert.equal(new Set(server.log.map((r) => r.review_id)).size, 2);
  assert.equal(a.sync.pending().length, 0);
  const fold = server.progress.get(BRANCH)!.data;
  const seenA = mergeState(a.state, fold);
  const seenB = mergeState(b.state, fold);
  assert.deepEqual(seenA, seenB);
  assert.deepEqual(cards(seenA), ["a1", "a2"]);
  const pulled = await a.sync.pullLog();
  assert.deepEqual(pulled?.map((r) => r.seq), [1, 2]);
  assert.equal(b.sync.cursor(), 2);
  assert.deepEqual(await b.sync.pullLog(), []);
});

test("with the kill switch off the snapshot path keeps working and the log stays empty", async () => {
  const server = new Server();
  server.enabled = false;
  const storage = memoryStorage();
  const tab = new Tab(server, storage);
  tab.study("a1", T0);
  await tab.sync.flush();
  assert.equal(tab.sync.mode(), "snapshot");
  assert.equal(tab.sync.pending().length, 0);
  assert.equal(server.log.length, 0);
  assert.equal(await tab.sync.pullLog(), null);
  await server.pushSnapshot(BRANCH, tab.state);
  server.enabled = true;
  tab.study("a2", T0 + 1000);
  await tab.sync.flush();
  assert.equal(tab.sync.mode(), "log");
  const fold = server.progress.get(BRANCH)!.data;
  assert.deepEqual(cards(fold), ["a1", "a2"]);
  assert.deepEqual(fold.cards.a1, tab.state.cards.a1);
  assert.equal(fold.stats.xp, tab.state.stats.xp);
});

test("reviews queued by one account never post under the next account in the same browser", async () => {
  const server = new Server();
  const storage = memoryStorage();
  const tab = new Tab(server, storage);
  tab.study("a1", T0);
  await tab.sync.flush();
  server.online = false;
  tab.study("a2", T0 + 1000);
  server.online = true;
  server.user = "u2";
  await tab.sync.flush();
  assert.equal(server.log.filter((r) => r.user === "u2").length, 0);
  assert.equal(tab.sync.pending().length + tab.sync.held().length, 1);
  assert.equal(await tab.sync.pullLog().then((r) => r?.length), 0);
  assert.equal(tab.sync.cursor(), 0);
  server.user = "u1";
  await tab.sync.flush();
  assert.equal(server.log.filter((r) => r.user === "u1").length, 1);
  assert.equal(server.log.filter((r) => r.user === "u2").length, 0);
});

test("a no_profile refusal keeps the outbox and a minor refusal drops it", async () => {
  const server = new Server();
  server.band = null;
  const tab = new Tab(server, memoryStorage());
  tab.study("a1", T0);
  await tab.sync.flush();
  assert.equal(tab.sync.pending().length, 1);
  assert.notEqual(tab.sync.mode(), "log");
  server.band = "18plus";
  await tab.sync.flush();
  assert.equal(server.log.length, 1);
  server.band = "13to17";
  tab.study("a2", T0 + 1000);
  await tab.sync.flush();
  assert.equal(tab.sync.pending().length, 0);
  assert.equal(server.log.length, 1);
});

test("a review appended in one tab while another tab flushes is kept", async () => {
  const server = new Server();
  const storage = memoryStorage();
  const a = new Tab(server, storage);
  const b = new Tab(server, storage);
  a.study("a1", T0);
  const fetch = server.fetch;
  let injected = false;
  server.fetch = async (input, init) => {
    if (!injected && init?.method === "POST") {
      injected = true;
      b.study("a2", T0 + 1000);
    }
    return fetch(input, init);
  };
  await a.sync.flush();
  await b.sync.flush();
  assert.deepEqual(server.log.map((r) => r.card_id).sort(), ["a1", "a2"]);
  assert.equal(a.sync.pending().length, 0);
});

test("after a signed-in account switch, new reviews post only under the new account", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.sync.setUser("u1");
  tab.study("a1", T0);
  await tab.sync.flush();
  tab.sync.setUser("u2");
  server.user = "u2";
  tab.study("a2", T0 + 1000);
  await tab.sync.flush();
  assert.deepEqual(server.log.map((r) => [r.user, r.card_id]), [["u1", "a1"], ["u2", "a2"]]);
});

test("a review queued after the last confirmation is held when the server reports another account", async () => {
  const server = new Server();
  const storage = memoryStorage();
  const tab = new Tab(server, storage);
  tab.sync.setUser("u1");
  server.online = false;
  tab.study("a1", T0);
  server.online = true;
  server.user = "u2";
  problems.length = 0;
  await tab.sync.flush();
  assert.equal(server.log.length, 0);
  assert.equal(tab.sync.held().length, 1);
  assert.deepEqual(problems, [["owner_ambiguous", 1]]);
  server.user = "u1";
  await tab.sync.flush();
  tab.sync.setUser("u1");
  await tab.sync.flush();
  assert.equal(server.log.length, 0);
  assert.equal(tab.sync.held().length, 1);
});

test("a review confirmed under its account posts under it after a switch away and back", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.sync.setUser("u1");
  tab.study("a1", T0);
  await tab.sync.flush();
  server.online = false;
  tab.study("a2", T0 + 1000);
  tab.sync.setUser("u1");
  tab.sync.setUser("u2");
  server.online = true;
  server.user = "u2";
  await tab.sync.flush();
  assert.equal(server.log.filter((r) => r.user === "u2").length, 0);
  tab.sync.setUser("u1");
  server.user = "u1";
  await tab.sync.flush();
  assert.deepEqual(server.log.map((r) => [r.user, r.card_id]), [["u1", "a1"], ["u1", "a2"]]);
});

test("a full outbox keeps every review and reports it, and a failed write is reported", async () => {
  const server = new Server();
  server.online = false;
  const storage = memoryStorage();
  const tab = new Tab(server, storage);
  problems.length = 0;
  for (let i = 0; i <= OUTBOX_CAP; i++) tab.sync.appendReview(BRANCH, { card_id: "a1", rating: 3, level: "recall", reviewed_at: T0 + i, tz: "UTC", atoms_version: corpusAtomsVersion(BRANCH) });
  assert.equal(tab.sync.pending().length, OUTBOX_CAP + 1);
  assert.deepEqual(problems.at(-1), ["outbox_full", OUTBOX_CAP + 1]);
  const set = storage.setItem.bind(storage);
  storage.setItem = (k, v) => {
    if (k === OUTBOX_KEY) throw new Error("QuotaExceededError");
    set(k, v);
  };
  tab.study("a2", T0);
  assert.equal(problems.at(-1)?.[0], "outbox_write_failed");
});

test("a review queued before the auth event for a new account is held and never credited to the old one", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.sync.setUser("u1");
  tab.study("a1", T0);
  await tab.sync.flush();
  tab.study("a2", T0 + 1000);
  problems.length = 0;
  tab.sync.setUser("u2");
  assert.deepEqual(problems, [["owner_ambiguous", 1]]);
  assert.equal(tab.sync.held().length, 1);
  server.user = "u1";
  tab.sync.setUser("u1");
  await tab.sync.flush();
  assert.deepEqual(server.log.map((r) => r.card_id), ["a1"]);
});


test("a caller review_id is kept from the outbox to the server log", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.study("a2", T0 - 1000);
  const q = tab.sync.appendReview(BRANCH, { card_id: "a1", rating: 3, level: "recall", reviewed_at: T0, tz: "UTC", atoms_version: corpusAtomsVersion(BRANCH), review_id: "6f1c2b9e-3d4a-4e5f-8a6b-7c8d9e0f1a2b" });
  assert.equal(q.review_id, "6f1c2b9e-3d4a-4e5f-8a6b-7c8d9e0f1a2b");
  await tab.sync.flush();
  assert.equal(server.log.filter((r) => r.review_id === "6f1c2b9e-3d4a-4e5f-8a6b-7c8d9e0f1a2b").length, 1);
});

test("a held review can be restored to the signed-in account on request, and then syncs", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.sync.setUser("u1");
  tab.study("a1", T0);
  await tab.sync.flush();
  tab.study("a2", T0 + 1000);
  tab.sync.setUser("u2");
  server.user = "u2";
  assert.equal(tab.sync.held().length, 1);
  await tab.sync.flush();
  assert.equal(server.log.filter((r) => r.user === "u2").length, 0);
  assert.deepEqual(heldAction(tab.sync, { action: "restore" }).body, { restored: 0, held: 1 });
  const r = heldAction(tab.sync, { action: "restore", claim: true });
  assert.deepEqual(r.body, { restored: 1, held: 0 });
  await tab.sync.flush();
  assert.deepEqual(server.log.filter((x) => x.user === "u2").map((x) => x.card_id), ["a2"]);
});

test("a held review goes back to its own account without a claim when that account signs in again", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.sync.setUser("u1");
  tab.study("a1", T0);
  tab.sync.setUser("u2");
  assert.equal(tab.sync.held().length, 1);
  tab.sync.setUser("u1");
  assert.equal(tab.sync.restoreHeld(), 1);
  server.user = "u1";
  await tab.sync.flush();
  assert.deepEqual(server.log.map((x) => [x.user, x.card_id]), [["u1", "a1"]]);
});

test("held reviews can be discarded one by one, and bad requests are refused", async () => {
  const server = new Server();
  const tab = new Tab(server, memoryStorage());
  tab.sync.setUser("u1");
  tab.study("a1", T0);
  tab.study("a2", T0 + 1000);
  tab.sync.setUser("u2");
  const [first] = tab.sync.held();
  assert.deepEqual(heldAction(tab.sync, { action: "discard", ids: [first.review_id] }).body, { discarded: 1, held: 1 });
  assert.equal(heldAction(tab.sync, { action: "keep" }).status, 400);
  assert.equal(heldAction(tab.sync, { action: "restore", ids: [1] }).status, 400);
  tab.sync.setUser(null);
  assert.equal(tab.sync.restoreHeld(), 0);
  assert.equal(tab.sync.held().length, 1);
});
