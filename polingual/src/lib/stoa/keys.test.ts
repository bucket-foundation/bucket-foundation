import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { bearer, createRoomKeys, hostToken, openSignKey, playerAccess, playerToken, readToken, roomSecrets, secretOk, stoaConfigured, type PlayerClaims } from "./keys";

const OLD = randomBytes(48).toString("base64");
const NEW = randomBytes(48).toString("base64url");
const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const UNTIL = new Date(NOW + 2 * HOUR).toISOString();
const env = { STOA_ROOM_SECRET: OLD };
const rotated = { STOA_ROOM_SECRET: NEW, STOA_ROOM_SECRET_PREV: OLD, STOA_ROOM_SECRET_PREV_UNTIL: UNTIL };
const after = { STOA_ROOM_SECRET: NEW };

test("a missing, short or low-variety secret leaves Stoa unconfigured", () => {
  assert.equal(stoaConfigured({}), false);
  assert.equal(stoaConfigured({ STOA_ROOM_SECRET: "short" }), false);
  assert.equal(stoaConfigured({ STOA_ROOM_SECRET: "a".repeat(64) }), false);
  assert.equal(stoaConfigured({ STOA_ROOM_SECRET: "correct horse battery staple correct horse battery" }), false);
  assert.equal(secretOk(randomBytes(24).toString("base64")), false);
  assert.equal(stoaConfigured(env), true);
});

test("the previous secret counts only inside its stated window", () => {
  assert.deepEqual(roomSecrets(rotated, NOW), [NEW, OLD]);
  assert.deepEqual(roomSecrets(rotated, NOW + 2 * HOUR), [NEW]);
  assert.deepEqual(roomSecrets({ STOA_ROOM_SECRET: NEW, STOA_ROOM_SECRET_PREV: OLD }, NOW), [NEW], "no end time, no previous secret");
  assert.deepEqual(roomSecrets({ ...rotated, STOA_ROOM_SECRET_PREV_UNTIL: new Date(NOW + 4 * HOUR).toISOString() }, NOW), [NEW], "a window over 3 hours is refused");
  assert.deepEqual(roomSecrets({ ...rotated, STOA_ROOM_SECRET_PREV_UNTIL: "soon" }, NOW), [NEW]);
  assert.deepEqual(roomSecrets({ ...rotated, STOA_ROOM_SECRET_PREV: NEW }, NOW), [NEW]);
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
  assert.ok(openSignKey(rid, keys.signKey, rotated, NOW));
  assert.equal(openSignKey(rid, keys.signKey, rotated, NOW + 2 * HOUR), null, "the window closes on its own");
  assert.equal(openSignKey(rid, keys.signKey, after), null);
  const fresh = createRoomKeys(rid, rotated);
  assert.ok(openSignKey(rid, fresh.signKey, after));
  assert.ok(openSignKey(rid, fresh.signKey, rotated, NOW));
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
  assert.equal(readToken(t, { STOA_ROOM_SECRET: randomBytes(48).toString("base64") }, NOW), null);
  assert.equal(readToken(`${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${body}.`, env, NOW), null);
  assert.equal(readToken("", env, NOW), null);
  assert.equal(readToken("a.b", env, NOW), null);
});

test("tokens signed with the previous secret pass during rotation and fail after", () => {
  const t = hostToken(randomUUID(), randomUUID(), NOW + 3 * HOUR, env, NOW);
  assert.equal(readToken(t, rotated, NOW)?.typ, "host");
  assert.equal(readToken(t, rotated, NOW + 2 * HOUR), null);
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
