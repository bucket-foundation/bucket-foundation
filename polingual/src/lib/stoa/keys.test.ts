import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { bearer, createRoomKeys, hostToken, openSignKey, playerAccess, playerToken, readToken, roomSecrets, stoaConfigured, type PlayerClaims } from "./keys";

const OLD = "o".repeat(40);
const NEW = "n".repeat(40);
const env = { STOA_ROOM_SECRET: OLD };
const rotated = { STOA_ROOM_SECRET: NEW, STOA_ROOM_SECRET_PREV: OLD };
const after = { STOA_ROOM_SECRET: NEW };
const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

test("a missing or short secret leaves Stoa unconfigured", () => {
  assert.equal(stoaConfigured({}), false);
  assert.equal(stoaConfigured({ STOA_ROOM_SECRET: "short" }), false);
  assert.equal(stoaConfigured(env), true);
  assert.deepEqual(roomSecrets(rotated), [NEW, OLD]);
  assert.deepEqual(roomSecrets({ STOA_ROOM_SECRET: NEW, STOA_ROOM_SECRET_PREV: NEW }), [NEW]);
});

test("a sealed room key opens for its room under the current secret", () => {
  const rid = randomUUID();
  const keys = createRoomKeys(rid, env);
  assert.match(keys.verifyKey, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(keys.signKey.length <= 512);
  assert.ok(!keys.signKey.includes(keys.verifyKey));
  assert.ok(openSignKey(rid, keys.signKey, env));
});

test("a sealed room key fails for another room id", () => {
  const keys = createRoomKeys(randomUUID(), env);
  assert.equal(openSignKey(randomUUID(), keys.signKey, env), null);
});

test("rotation keeps old rooms open through the previous secret, then drops them", () => {
  const rid = randomUUID();
  const keys = createRoomKeys(rid, env);
  assert.ok(openSignKey(rid, keys.signKey, rotated));
  assert.equal(openSignKey(rid, keys.signKey, after), null);
  const fresh = createRoomKeys(rid, rotated);
  assert.ok(openSignKey(rid, fresh.signKey, after));
});

test("a player token round-trips its claims", () => {
  const rid = randomUUID();
  const pid = randomUUID();
  const t = playerToken(rid, pid, 1, NOW + 3 * HOUR, env, NOW);
  assert.deepEqual(readToken(t, env, NOW + HOUR), { typ: "player", rid, pid, tv: 1, iat: NOW / 1000, exp: (NOW + 3 * HOUR) / 1000 });
});

test("a token expires at room close", () => {
  const t = playerToken(randomUUID(), randomUUID(), 1, NOW + HOUR, env, NOW);
  assert.ok(readToken(t, env, NOW + HOUR - 1000));
  assert.equal(readToken(t, env, NOW + HOUR), null);
});

test("a tampered or foreign token fails", () => {
  const t = playerToken(randomUUID(), randomUUID(), 1, NOW + HOUR, env, NOW);
  const [h, body, sig] = t.split(".");
  const forged = JSON.parse(Buffer.from(body, "base64url").toString());
  forged.tv = 9;
  assert.equal(readToken(`${h}.${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${sig}`, env, NOW), null);
  assert.equal(readToken(t, { STOA_ROOM_SECRET: "x".repeat(40) }, NOW), null);
  assert.equal(readToken(`${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${body}.`, env, NOW), null);
  assert.equal(readToken("", env, NOW), null);
  assert.equal(readToken("a.b", env, NOW), null);
});

test("tokens signed with the previous secret pass during rotation and fail after", () => {
  const t = hostToken(randomUUID(), randomUUID(), NOW + HOUR, env, NOW);
  assert.equal(readToken(t, rotated, NOW)?.typ, "host");
  assert.equal(readToken(t, after, NOW), null);
});

test("revoking a player blocks the token and a version bump makes the rest stale", () => {
  const claims = readToken(playerToken(randomUUID(), randomUUID(), 1, NOW + HOUR, env, NOW), env, NOW) as PlayerClaims;
  assert.equal(playerAccess(claims, { removed: false }, 1), "ok");
  assert.equal(playerAccess(claims, { removed: true }, 2), "removed");
  assert.equal(playerAccess(claims, null, 1), "removed");
  assert.equal(playerAccess(claims, { removed: false }, 2), "stale");
});

test("bearer reads an authorization header", () => {
  assert.equal(bearer("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(bearer("Basic abc"), null);
  assert.equal(bearer(null), null);
});
