import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeHandle as serverNormalize } from "@academy/profile";
import { cleanHandle, normalizeHandle, loadProfile, profileFrom, saveProfile, PROFILE_ME, SIGN_IN_AGAIN } from "./profile";

function deps(status: number, body: unknown, seen: { url?: string; auth?: string | null } = {}) {
  return {
    token: async () => "tok",
    fetch: (async (url: string, init?: RequestInit) => {
      seen.url = url;
      seen.auth = new Headers(init?.headers).get("authorization");
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch,
  };
}

test("handle rules follow the server, reserved names included", () => {
  assert.deepEqual(cleanHandle(" Gio_Polly "), { handle: "gio_polly" });
  assert.ok("error" in cleanHandle("a"));
  assert.ok("error" in cleanHandle("admin"));
  assert.ok("error" in cleanHandle("bad name"));
});

test("profile parses the API shape", () => {
  assert.deepEqual(profileFrom({ profile: { handle: "ana", displayName: "Ana" } }), { handle: "ana", displayName: "Ana" });
  assert.equal(profileFrom({ profile: null }), null);
});

test("load asks for me=1 with the bearer token", async () => {
  const seen: { url?: string; auth?: string | null } = {};
  assert.deepEqual(await loadProfile(deps(200, { profile: null }, seen)), { status: "ready", profile: null });
  assert.equal(seen.url, PROFILE_ME);
  assert.match(seen.url ?? "", /\?me=1$/);
  assert.equal(seen.auth, "Bearer tok");
});

test("load maps 401 to signed out and other failures to error", async () => {
  assert.deepEqual(await loadProfile(deps(401, {})), { status: "signed-out" });
  assert.deepEqual(await loadProfile(deps(500, {})), { status: "error" });
});

test("save sends the token and maps 401 and taken names", async () => {
  const seen: { url?: string; auth?: string | null } = {};
  const p = { handle: "ana", displayName: "Ana" };
  assert.deepEqual(await saveProfile(p, deps(200, { profile: p }, seen)), { ok: true, profile: p });
  assert.equal(seen.auth, "Bearer tok");
  assert.deepEqual(await saveProfile(p, deps(401, {})), { ok: false, error: SIGN_IN_AGAIN, signIn: true });
  const taken = await saveProfile(p, deps(409, { error: "handle_taken" }));
  assert.equal(taken.ok, false);
});

test("client handle rules match the server for every sample", () => {
  for (const h of ["ana", "Ana", " ana ", "a", "ab", "a-b", "-ab", "ab-", "a_b_c", "admin", "Settings", "me", "x".repeat(32), "x".repeat(33), "é1", "a.b", "www", "root"]) assert.equal(normalizeHandle(h), serverNormalize(h), h);
});
