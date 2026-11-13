import { test } from "node:test";
import assert from "node:assert/strict";
import { handleError, loadProfile, profileFrom, saveProfile } from "./profile";

const res = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("handle rules match the server", () => {
  assert.equal(handleError("gio_polly"), null);
  assert.ok(handleError("Gio"));
  assert.ok(handleError("a"));
});

test("profile parses the API shape", () => {
  assert.deepEqual(profileFrom({ profile: { handle: "ana", displayName: "Ana" } }), { handle: "ana", displayName: "Ana" });
  assert.equal(profileFrom({ profile: null }), null);
});

test("load and save report errors in one sentence", async () => {
  assert.deepEqual(await loadProfile(res(401, {})), { status: "error" });
  assert.deepEqual(await loadProfile(res(200, { profile: null })), { status: "ready", profile: null });
  const taken = await saveProfile({ handle: "ana", displayName: "Ana" }, res(409, { error: "handle_taken" }));
  assert.equal(taken.ok, false);
  const ok = await saveProfile({ handle: "ana", displayName: "Ana" }, res(200, { profile: { handle: "ana", displayName: "Ana" } }));
  assert.deepEqual(ok, { ok: true, profile: { handle: "ana", displayName: "Ana" } });
});
