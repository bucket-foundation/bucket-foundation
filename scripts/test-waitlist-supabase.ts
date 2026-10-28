import test from "node:test";
import assert from "node:assert/strict";
import { layeredLimiter } from "../src/lib/capture/handler";
import { getMarkStore, sharedRateLimiter } from "../src/lib/download/marks";
import { getWaitlistStore, listSignups, saveSignup } from "../src/lib/waitlist/store";
import { markKey, tableMarks, tableWaitlistStore, type KvTable } from "../src/lib/waitlist/supabase-store";

function memoryTable(): KvTable & { rows: Map<string, { value: unknown; at: number }> } {
  const rows = new Map<string, { value: unknown; at: number }>();
  const id = (p: string, k: string) => `${p}\u0000${k}`;
  return {
    rows,
    async get(p, k) {
      return rows.get(id(p, k))?.value ?? null;
    },
    async put(p, k, value) {
      rows.set(id(p, k), { value, at: Date.now() });
    },
    async keys(p) {
      return Array.from(rows.keys()).filter((r) => r.startsWith(`${p}\u0000`)).map((r) => r.slice(p.length + 1)).sort();
    },
    async remove(p, k) {
      rows.delete(id(p, k));
    },
    async bump(p, k) {
      const next = ((rows.get(id(p, k))?.value as number) ?? 0) + 1;
      rows.set(id(p, k), { value: next, at: Date.now() });
      return next;
    },
    async sweep(p, olderThan) {
      let n = 0;
      for (const [r, v] of rows) if (r.startsWith(`${p}\u0000`) && v.at < olderThan && rows.delete(r)) n++;
      return n;
    },
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

test("the capture limiter keeps the local cap when the shared one fails", async () => {
  let localHits = 0;
  const local = () => ++localHits > 1;
  const broken = layeredLimiter(local, async () => {
    throw new Error("relation does not exist");
  });
  assert.equal(await broken("ip"), false);
  assert.equal(await broken("ip"), true);
  const shared = layeredLimiter(() => false, async () => true);
  assert.equal(await shared("ip"), true);
  assert.equal(await layeredLimiter(() => false)("ip"), false);
});
