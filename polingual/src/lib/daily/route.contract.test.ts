import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { DAILY_BRANCH, type DailyBook } from "./store";

const root = join(process.cwd(), "../src");
const at = (p: string) => pathToFileURL(join(root, p)).href;
const upserts: unknown[] = [];

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service";

mock.module(at("lib/auth/verify.ts"), { namedExports: { verifyRequestUser: async () => ({ id: "u1" }) } });
mock.module(at("lib/academy/device-server.ts"), { namedExports: { serverVerifyDevice: async () => ({ ok: true }) } });
mock.module(at("lib/research-os/learn-gate.ts"), { namedExports: { readAgeBand: async () => ({ ok: true, band: "adult", consent: null }), decideLearnWrite: () => ({ allowed: true }) } });
mock.module(at("lib/research-os/learn-sync.ts"), { namedExports: { syncAcademyMastery: async () => ({ advanced: 0 }) } });
mock.module("@supabase/supabase-js", { namedExports: { createClient: () => ({ from: () => ({ upsert: async (rows: unknown) => (upserts.push(rows), { error: null }) }) }) } });

test("the progress route accepts the polingual-daily branch at a full book's size", async () => {
  const { POST } = await import(at("app/api/academy/progress/route.ts"));
  const results: DailyBook = {};
  for (let d = 0; d < 120; d++) {
    const day = `2026-${1 + (d % 12)}-${1 + (d % 28)}`;
    results[`daily-set|${day}|${d}`] = { game: "daily-set", day, score: 6, total: 6, pattern: "111111", savedAt: d, words: Array.from({ length: 16 }, (_, i) => ({ lang: "es", itemId: `item-${i}`, form: "palabra", gloss: "word", right: true })) };
  }
  const body = JSON.stringify({ branch: DAILY_BRANCH, data: { results } });
  assert.ok(body.length > 100_000);
  const res = await POST(new Request("http://localhost/api/academy/progress", { method: "POST", body, headers: { authorization: "Bearer t" } }) as never);
  assert.equal(res.status, 200);
  assert.equal((upserts[0] as { branch: string }[])[0].branch, DAILY_BRANCH);
  const bad = await POST(new Request("http://localhost/api/academy/progress", { method: "POST", body: JSON.stringify({ branch: "-bad", data: {} }) }) as never);
  assert.equal(bad.status, 400);
});
