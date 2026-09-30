import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PRIVACY_ENDPOINT, deleteConfirmed, requestDelete, requestExport } from "../src/lib/research-os/privacy-actions";
import { LAUNCH_APIS } from "../src/lib/research-os/launch-scope";

type Call = { url: string; init: RequestInit };

function fake(status: number, body: unknown, calls: Call[]) {
  return async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
}

test("profile renders the export and delete controls, and the privacy API stays in launch scope", () => {
  const page = fs.readFileSync(path.join(__dirname, "..", "src/app/research-os/(app)/profile/page.tsx"), "utf8");
  assert.match(page, /<PrivacySection token=\{token\} onDeleted=\{signOut\} \/>/);
  assert.ok(LAUNCH_APIS.includes(PRIVACY_ENDPOINT));
});

test("export posts the export action with the session token", async () => {
  const calls: Call[] = [];
  const out = await requestExport("tok", fake(200, { learnerId: "l", tables: {} }, calls));
  assert.deepEqual(out, { ok: true, data: { learnerId: "l", tables: {} } });
  assert.equal(calls[0].url, PRIVACY_ENDPOINT);
  assert.equal(calls[0].init.method, "POST");
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { action: "export" });
});

test("delete sends nothing until the confirm word is typed", async () => {
  const calls: Call[] = [];
  assert.equal(deleteConfirmed(" DELETE "), true);
  assert.equal(deleteConfirmed("delete"), false);
  assert.deepEqual(await requestDelete("tok", "delete", fake(200, { deleted: true }, calls)), { ok: false, error: "confirm_required" });
  assert.equal(calls.length, 0);
  const out = await requestDelete("tok", "DELETE", fake(200, { deleted: true }, calls));
  assert.equal(out.ok, true);
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { action: "delete", confirm: "DELETE" });
});

test("a refused or failed call reports its error code", async () => {
  assert.deepEqual(await requestExport("tok", fake(401, { error: "unauthorized" }, [])), { ok: false, error: "unauthorized" });
  assert.deepEqual(await requestDelete("tok", "DELETE", fake(500, {}, [])), { ok: false, error: "delete_failed" });
  const down = await requestExport("tok", fake(503, {}, []));
  assert.equal(down.ok, false);
  const thrown = await requestExport("tok", async () => {
    throw new TypeError("fetch failed");
  });
  assert.deepEqual(thrown, { ok: false, error: "network_error" });
});
