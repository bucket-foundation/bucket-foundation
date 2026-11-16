import test from "node:test";
import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { progressDeps } from "../src/lib/academy/progress-server";
import { POST } from "../src/app/api/academy/progress/route";

type Rpc = { fn: string; args: { p_user: string; p_rows: { branch: string; data: unknown }[]; p_reset: boolean } };

function stub(reply: (args: Rpc["args"]) => { written: string[]; refused: string[] }): Rpc[] {
  const calls: Rpc[] = [];
  const deps = progressDeps as unknown as Record<string, unknown>;
  deps.configured = () => true;
  deps.verifyUser = async () => "u-1";
  deps.verifyDevice = async () => ({ ok: true });
  deps.readAgeBand = async () => ({ ok: true, band: "adult" });
  deps.decideLearnWrite = () => ({ allowed: true });
  deps.syncMastery = async () => ({ advanced: 0 });
  deps.service = () => ({
    rpc: async (fn: string, args: Rpc["args"]) => {
      calls.push({ fn, args });
      return { data: reply(args), error: null };
    },
  });
  return calls;
}

function post(body: unknown): NextRequest {
  return new Request("https://bucket.foundation/api/academy/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as unknown as NextRequest;
}

const blank = { cards: {}, prof: {}, settings: { newPerDay: 4 }, stats: { xp: 0, history: {} } };
const studied = { cards: { "es:hola": { reps: 1 } }, stats: { xp: 5, history: {} } };

test("a blank push the database refuses returns 409 blank_overwrite", async () => {
  const calls = stub((a) => ({ written: [], refused: a.p_rows.map((r) => r.branch) }));
  const res = await POST(post({ branch: "lang-sys-s1", data: blank }));
  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { error: "blank_overwrite", branches: ["lang-sys-s1"] });
  assert.equal(calls[0].fn, "academy_progress_write");
  assert.equal(calls[0].args.p_reset, false);
});

test("a batch writes the non-blank branches and reports the refused one", async () => {
  stub(() => ({ written: ["b2"], refused: ["b1"] }));
  const res = await POST(post({ branches: { b1: { data: blank }, b2: { data: studied } } }));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.written, 1);
  assert.deepEqual(j.refused, ["b1"]);
});

test("an explicit reset passes the flag to the database", async () => {
  const calls = stub((a) => ({ written: a.p_rows.map((r) => r.branch), refused: [] }));
  const res = await POST(post({ branch: "lang-sys-s1", data: blank, reset: true }));
  assert.equal(res.status, 200);
  assert.equal(calls[0].args.p_reset, true);
});

test("a settings-only push and a partial state pass through as written", async () => {
  const calls = stub((a) => ({ written: a.p_rows.map((r) => r.branch), refused: [] }));
  const res = await POST(post({ branches: { s: { data: { settings: { newPerDay: 8 } } }, p: { data: { cards: { "es:a": {} } } } } }));
  assert.equal(res.status, 200);
  assert.deepEqual(calls[0].args.p_rows.map((r) => r.branch), ["s", "p"]);
});

function failing(result: { data: unknown; error: { message: string } | null }): string[] {
  stub(() => ({ written: [], refused: [] }));
  (progressDeps as unknown as Record<string, unknown>).service = () => ({ rpc: async () => result });
  const logged: string[] = [];
  test.mock.method(console, "error", (...parts: unknown[]) => void logged.push(parts.join(" ")));
  return logged;
}

test("a database error on the write returns 500 write_failed and logs the cause", async () => {
  const logged = failing({ data: null, error: { message: "connection reset" } });
  const res = await POST(post({ branch: "lang-sys-s1", data: studied }));
  test.mock.restoreAll();
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "write_failed" });
  assert.deepEqual(logged, ["[academy/progress] write failed: connection reset"]);
});

test("a write that answers with no result returns 500 write_failed", async () => {
  const logged = failing({ data: null, error: null });
  const res = await POST(post({ branch: "lang-sys-s1", data: studied }));
  test.mock.restoreAll();
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "write_failed" });
  assert.deepEqual(logged, ["[academy/progress] write returned no result"]);
});
