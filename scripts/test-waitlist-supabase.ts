import test from "node:test";
import assert from "node:assert/strict";
import { handleCapture, layeredLimiter } from "../src/lib/capture/handler";
import { getMarkStore, sharedRateLimiter } from "../src/lib/download/marks";
import { getInviteStore } from "../src/lib/waitlist/invites";
import { getWaitlistStore, listSignups, saveSignup } from "../src/lib/waitlist/store";
import {
  cachedClient,
  markKey,
  missingRelation,
  resetClientCache,
  TableMissingError,
  tableDocStore,
  tableInviteStore,
  tableMarks,
  tableWaitlistStore,
  type DocsTable,
  type KvTable,
} from "../src/lib/waitlist/supabase-store";
import { getOptOutStore } from "../src/lib/whats-new-email/unsubscribe";
import { getWhatsNewStore, withEntryLock, BUSY } from "../src/lib/whats-new/store";

function memoryTable(): KvTable & { rows: Map<string, { value: unknown; at: number; version: number }>; beforeCas?: () => Promise<void> } {
  const rows = new Map<string, { value: unknown; at: number; version: number }>();
  const id = (p: string, k: string) => `${p}\u0000${k}`;
  const t: KvTable & { rows: typeof rows; beforeCas?: () => Promise<void> } = {
    rows,
    async get(p, k) {
      return rows.get(id(p, k))?.value ?? null;
    },
    async getVersioned(p, k) {
      const r = rows.get(id(p, k));
      return r ? { value: structuredClone(r.value), version: r.version } : null;
    },
    async cas(p, k, value, version) {
      await t.beforeCas?.();
      const r = rows.get(id(p, k));
      if (version === null ? r : !r || r.version !== version) return false;
      rows.set(id(p, k), { value, at: Date.now(), version: (r?.version ?? 0) + 1 });
      return true;
    },
    async put(p, k, value) {
      rows.set(id(p, k), { value, at: Date.now(), version: (rows.get(id(p, k))?.version ?? 0) + 1 });
    },
    async keys(p) {
      return Array.from(rows.keys()).filter((r) => r.startsWith(`${p}\u0000`)).map((r) => r.slice(p.length + 1)).sort();
    },
    async remove(p, k) {
      rows.delete(id(p, k));
    },
    async bump(p, k) {
      const next = ((rows.get(id(p, k))?.value as number) ?? 0) + 1;
      rows.set(id(p, k), { value: next, at: Date.now(), version: 1 });
      return next;
    },
    async sweep(p, olderThan) {
      let n = 0;
      for (const [r, v] of Array.from(rows)) if (r.startsWith(`${p}\u0000`) && v.at < olderThan && rows.delete(r)) n++;
      return n;
    },
  };
  return t;
}

function memoryDocs(): DocsTable {
  const rows = new Map<string, string>();
  const id = (p: string, n: string) => `${p}\u0000${n}`;
  return {
    get: async (p, n) => rows.get(id(p, n)) ?? null,
    put: async (p, n, b) => void rows.set(id(p, n), b),
    async create(p, n, b) {
      if (rows.has(id(p, n))) return false;
      rows.set(id(p, n), b);
      return true;
    },
    remove: async (p, n) => void rows.delete(id(p, n)),
    names: async (p, start) =>
      Array.from(rows.keys())
        .filter((r) => r.startsWith(`${p}\u0000${start}`))
        .map((r) => r.slice(p.length + 1))
        .sort(),
  };
}

const SUPA = { NEXT_PUBLIC_SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "service", VERCEL: "1", VERCEL_ENV: "production" };

test("with Supabase configured the waitlist and marks leave Blob", () => {
  assert.equal(getWaitlistStore(SUPA)?.kind, "supabase");
  assert.equal(getWaitlistStore({ ...SUPA, BLOB_READ_WRITE_TOKEN: "x" })?.kind, "supabase");
  assert.equal(getWaitlistStore(SUPA, "polingual")?.prefix, "waitlist/polingual/");
  assert.equal(getWaitlistStore({ ...SUPA, VERCEL_ENV: "preview" }, "downloads")?.prefix, "waitlist-preview/downloads/");
  assert.ok(getMarkStore(SUPA)?.bump);
  assert.equal(getWaitlistStore({ VERCEL: "1", VERCEL_ENV: "production" }), null);
  assert.equal(getWaitlistStore({ VERCEL: "1", VERCEL_ENV: "production", BLOB_STORE_ID: "s" })?.kind, "blob");
  assert.equal(getInviteStore({ ...SUPA, BLOB_STORE_ID: "s" })?.kind, "supabase");
  assert.equal(getWhatsNewStore({ ...SUPA, BLOB_STORE_ID: "s" })?.kind, "supabase");
  assert.ok(getOptOutStore({ ...SUPA, BLOB_STORE_ID: "s" })?.bump);
});

test("concurrent signups for one email both count through the versioned upsert", async () => {
  const table = memoryTable();
  const list = tableWaitlistStore("waitlist/", table);
  const input = { email: "cy@example.com", name: null, role: null, wanted: null };
  let raced = false;
  table.beforeCas = async () => {
    if (raced) return;
    raced = true;
    await saveSignup(list, input, "2026-10-28T09:00:00.000Z");
  };
  assert.equal(await saveSignup(list, input, "2026-10-28T09:00:01.000Z"), false);
  const [entry] = await listSignups(list);
  assert.equal(entry.signups, 2);
  assert.equal(entry.created_at, "2026-10-28T09:00:00.000Z");
});

test("a missing waitlist table answers 503", async () => {
  const errors: string[] = [];
  const log = console.error;
  console.error = (...a: unknown[]) => void errors.push(a.join(" "));
  try {
    const broken = { kind: "supabase", prefix: "waitlist/", read: async () => null, write: async () => undefined, keys: async () => [], remove: async () => undefined, upsert: async () => {
      throw new TableMissingError("waitlist_signups read", "relation \"bucket.waitlist_signups\" does not exist");
    } } as const;
    const res = await handleCapture({ source: "footer", email: "dee@example.com" }, "ip", { store: () => broken });
    assert.equal(res.status, 503);
    assert.ok(errors.some((e) => e.includes("waitlist_table_missing")));
  } finally {
    console.error = log;
  }
  assert.equal(missingRelation({ code: "PGRST205", message: "Could not find the table" }), true);
  assert.equal(missingRelation({ code: "42P01", message: "x" }), true);
  assert.equal(missingRelation({ code: "23505", message: "duplicate key" }), false);
});

test("a failed client import is retried on the next call", async () => {
  resetClientCache();
  let calls = 0;
  const load = async () => {
    calls++;
    if (calls === 1) throw new Error("offline");
    return { ok: true };
  };
  await assert.rejects(cachedClient(load));
  assert.deepEqual(await cachedClient(load), { ok: true });
  assert.deepEqual(await cachedClient(load), { ok: true });
  assert.equal(calls, 2);
  resetClientCache();
});

test("invites and What's new documents live in the docs table", async () => {
  const docs = memoryDocs();
  const invites = tableInviteStore("waitlist/invites/", docs);
  const key = "a".repeat(64);
  const rec = { key, status: "pending", invite_id: "i", wave: 1, updated_at: "t", invited_at: null, provider: null, message_id: null, error: null } as const;
  assert.equal(await invites.create(key, rec), true);
  assert.equal(await invites.create(key, rec), false);
  assert.equal((await invites.read(key))?.status, "pending");
  assert.deepEqual(await invites.keys(), [key]);
  const store = tableDocStore("whats-new/", docs);
  await store.write("entries/one.json", "{}");
  await store.write("entries/two.json", "{}");
  await store.write("audit/x.json", "{}");
  assert.deepEqual(await store.list("entries"), ["one.json", "two.json"]);
  let t = 0;
  const held = await withEntryLock(store, "one", () => t, async () => withEntryLock(store, "one", () => t, async () => "inner"));
  assert.equal(held, BUSY);
  t = 1;
  assert.equal(await withEntryLock(store, "one", () => t, async () => "ok"), "ok");
});

test("a table store saves, merges and lists signups under its prefix", async () => {
  const table = memoryTable();
  const list = tableWaitlistStore("waitlist/", table);
  const other = tableWaitlistStore("waitlist/polingual/", table);
  assert.equal(await saveSignup(list, { email: "ana@example.com", role: "student" } as never, "2026-10-28T10:00:00.000Z"), true);
  assert.equal(await saveSignup(list, { email: "ana@example.com", role: "student" } as never, "2026-10-28T11:00:00.000Z"), false);
  await saveSignup(other, { email: "bo@example.com" } as never, "2026-10-28T12:00:00.000Z");
  const rows = await listSignups(list);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, "ana@example.com");
  assert.equal((await other.keys()).length, 1);
  await list.remove((await list.keys())[0]);
  assert.deepEqual(await list.keys(), []);
});

test("rate marks count atomically per window and hash the key", async () => {
  const table = memoryTable();
  const marks = tableMarks("waitlist/download-marks/", table);
  let t = 1_000_000;
  const limited = sharedRateLimiter(marks, 1, 30_000, () => t);
  assert.equal(await limited("1.2.3.4"), false);
  assert.equal(await limited("1.2.3.4"), true);
  assert.equal(await limited("5.6.7.8"), false);
  t += 30_000;
  assert.equal(await limited("1.2.3.4"), false);
  assert.ok(Array.from(table.rows.keys()).every((k) => !k.includes("1.2.3.4")));
  assert.equal(markKey("rate:x").length, 64);
  await marks.set("cooldown", 42);
  assert.equal(await marks.get("cooldown"), 42);
  assert.deepEqual(await marks.sweep(Date.now() + 1, Date.now() + 1000), { removed: 4, done: true });
});

test("when the shared limiter fails, the first request passes and repeats within five minutes are denied", async () => {
  let t = 0;
  const broken = layeredLimiter(() => false, async () => {
    throw new Error("relation does not exist");
  }, () => t);
  assert.equal(await broken("ip"), false);
  t = 60_000;
  assert.equal(await broken("ip"), true);
  assert.equal(await broken("other"), false);
  t = 60_000 + 5 * 60_000;
  assert.equal(await broken("ip"), false);
  let localHits = 0;
  assert.equal(await layeredLimiter(() => ++localHits > 1)("ip"), false);
  assert.equal(await layeredLimiter(() => ++localHits > 1)("ip"), true);
  const shared = layeredLimiter(() => false, async () => true);
  assert.equal(await shared("ip"), true);
  assert.equal(await layeredLimiter(() => false)("ip"), false);
});
