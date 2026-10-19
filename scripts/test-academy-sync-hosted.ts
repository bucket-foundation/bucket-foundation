import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { normalizeState, type Atom } from "../src/lib/academy/engine";
import { createMobileSync } from "../src/lib/academy/mobile-sync";
import { RETRY_MS, watchReconnect } from "../src/lib/academy/reconnect";
import { createRemoteSync } from "../src/lib/academy/remote-sync";
import { corpusAtomsVersion } from "../src/lib/academy/replay";
import { createReviewLogHandlers, type AppendRow, type StoredReview } from "../src/lib/academy/review-log-server";
import { createReviewSync, type Fetcher, type ReviewEvent } from "../src/lib/academy/review-sync";
import { canonicalSyncBase, DEFAULT_SYNC_BASE } from "../src/lib/academy/sync-base";
import { MemoryVault, type StoredSession } from "../src/lib/academy/token-store";

const BRANCH = "01-mathematics";
const ATOMS = [{ id: "a1", title: "A1", shell: "nucleus" }] as unknown as Atom[];
const T0 = Date.UTC(2026, 9, 19, 9);

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

class Hosted {
  online = true;
  posts = 0;
  log: (AppendRow & { seq: number })[] = [];
  handlers = createReviewLogHandlers({
    enabled: () => true,
    configured: () => true,
    origins: () => [],
    now: () => T0 + 3_600_000,
    verifyUser: async () => "u1",
    readAgeBand: async () => ({ ok: true, band: "18plus" }),
    appendReviews: async (_uid, rows) =>
      rows.map((r) => {
        const prev = this.log.find((x) => x.review_id === r.review_id);
        if (prev) return { review_id: r.review_id, status: "duplicate" as const, seq: prev.seq };
        const seq = this.log.length + 1;
        this.log.push({ ...r, seq });
        return { review_id: r.review_id, status: "inserted" as const, seq };
      }),
    readLog: async (_uid, since, limit) => this.log.filter((r) => r.seq > since).slice(0, limit).map((r) => this.stored(r)),
    readBranch: async () => ({ baseline: normalizeState(null), rows: this.log.map((r) => this.stored(r)) }),
    writeFold: async () => true,
    syncMastery: async () => ({ advanced: 0 }),
    atoms: (branch) => ({ [corpusAtomsVersion(branch)]: ATOMS }),
  });

  stored(r: AppendRow & { seq: number }): StoredReview {
    return { ...r, reviewed_at: Date.parse(r.reviewed_at), seq: r.seq };
  }

  fetch: Fetcher = async (input, init) => {
    if (!this.online) throw new TypeError("offline");
    const req = new Request(new URL(String(input), "https://www.bucket.foundation"), init as RequestInit);
    if (req.method === "POST") this.posts++;
    return req.method === "POST" ? this.handlers.POST(req) : this.handlers.GET(req);
  };
}

function device(server: Hosted, storage = memoryStorage()) {
  return createReviewSync({ storage: () => storage, fetch: server.fetch, uuid: randomUUID, readLocal: () => null, pushSnapshot: async () => true, lock: (fn) => fn() });
}

const review = (id: string): ReviewEvent => ({ card_id: id, rating: 3, level: "recall", reviewed_at: T0, tz: "UTC", atoms_version: corpusAtomsVersion(BRANCH) });

class FakeEvents {
  listeners = new Map<string, Set<() => void>>();
  visibilityState = "visible";
  addEventListener(type: string, fn: EventListenerOrEventListenerObject | null) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn as () => void);
  }
  removeEventListener(type: string, fn: EventListenerOrEventListenerObject | null) {
    this.listeners.get(type)?.delete(fn as () => void);
  }
  fire(type: string) {
    Array.from(this.listeners.get(type) ?? []).forEach((fn) => fn());
  }
}

class FakeTimers {
  queue: { fn: () => void; ms: number; id: number }[] = [];
  next = 0;
  setTimeout = (fn: () => void, ms: number) => {
    const id = ++this.next;
    this.queue.push({ fn, ms, id });
    return id;
  };
  clearTimeout = (id: unknown) => {
    this.queue = this.queue.filter((t) => t.id !== id);
  };
  fireNext(): number | null {
    const t = this.queue.shift();
    if (!t) return null;
    t.fn();
    return t.ms;
  }
}

const settle = () => new Promise((r) => setTimeout(r, 0));

test("the apex host maps to the www host the site redirects to", () => {
  assert.equal(canonicalSyncBase(DEFAULT_SYNC_BASE), "https://www.bucket.foundation");
  assert.equal(canonicalSyncBase("https://bucket.foundation/"), "https://www.bucket.foundation");
  assert.equal(canonicalSyncBase("https://www.bucket.foundation"), "https://www.bucket.foundation");
  assert.equal(canonicalSyncBase("http://10.0.2.2:3000"), "http://10.0.2.2:3000");
  assert.equal(canonicalSyncBase("http://127.0.0.1:3000/"), "http://127.0.0.1:3000");
});

test("desktop and mobile clients configured with bucket.foundation call the www host directly", async () => {
  const hosts = new Set<string>();
  const spy: Fetcher = async (input) => {
    hosts.add(new URL(String(input)).host);
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  };
  const session: StoredSession = { access_token: "at", refresh_token: "rt", expires_at: 4_000_000_000, user_id: "u1", device_id: "dev_1", supabase_url: "http://sb.test", anon_key: "anon" };
  const vault = new MemoryVault();
  await vault.set(session);
  const desktop = createRemoteSync({ base: DEFAULT_SYNC_BASE, storage: () => memoryStorage(), vault, device: { id: "dev_1", publicKey: "pk", sign: () => "sig" }, readLocal: () => null, fetch: spy });
  await desktop.signedFetch("/api/academy/progress");
  await desktop.login("cli", "test", () => undefined).catch(() => undefined);
  const mobileVault = new MemoryVault();
  await mobileVault.set({ ...session, device_id: "mobile" });
  const mobile = createMobileSync({ base: DEFAULT_SYNC_BASE, storage: () => memoryStorage(), vault: mobileVault, fetch: spy, readLocal: () => null });
  await mobile.sendCode("me@bucket.test");
  await mobile.route("/local/review-log", "GET", null);
  hosts.delete("sb.test");
  assert.deepEqual(Array.from(hosts), ["www.bucket.foundation"]);
});

test("a grade made offline lands once when the connection returns and shows on another device", async () => {
  const server = new Hosted();
  server.online = false;
  const phone = device(server);
  const events = new FakeEvents();
  const timers = new FakeTimers();
  phone.appendReview(BRANCH, review("a1"));
  const stop = watchReconnect(events, events, () => phone.flush(), () => phone.pending().length, timers);
  await settle();
  assert.equal(phone.pending().length, 1);
  assert.equal(timers.fireNext(), RETRY_MS[0]);
  await settle();
  assert.equal(timers.queue[0]?.ms, RETRY_MS[1]);
  server.online = true;
  events.fire("online");
  events.fire("focus");
  events.fire("visibilitychange");
  await settle();
  await settle();
  await phone.flush();
  assert.equal(phone.pending().length, 0);
  assert.equal(server.log.length, 1);
  assert.equal(timers.queue.length, 0);
  phone.appendReview(BRANCH, { ...review("a1"), review_id: server.log[0].review_id });
  await phone.flush();
  assert.equal(server.log.length, 1);
  const laptop = device(server);
  const pulled = await laptop.pullLog();
  assert.deepEqual(pulled?.map((r) => r.card_id), ["a1"]);
  assert.equal(laptop.cursor(), 1);
  stop();
  events.fire("online");
  await settle();
  assert.ok(server.posts >= 1);
});
