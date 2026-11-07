import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRoomKeys, hostToken, playerToken, readToken, type PlayerClaims } from "./keys";
import { clientIpFrom, createRoom, hostAction, ipKey, joinRoom, medianGrace, netKey, newCode, playerAction, roomState, submitAnswer, submitProbe, sweep, type LiveDeps, type Rpc } from "./live";
import { isNickname, nicknameChoices } from "./nicknames";
import { parseSettings } from "./questions";
import { verifyEvent } from "./verify";

const NOW = 1_800_000_000_000;
const env = {
  STOA_ROOM_SECRET: randomBytes(48).toString("base64"),
  STOA_SWEEP_SECRET: "w".repeat(40),
  POLINGUAL_DB_URL: "https://db.test",
  POLINGUAL_DB_SERVICE_KEY: "service",
  POLINGUAL_DB_ANON_KEY: "anon",
};
const RID = randomUUID();
const PID = randomUUID();
const UID = randomUUID();
const TOPIC = randomUUID();
const KEYS = createRoomKeys(RID, env);
const EXP = NOW + 3 * 3_600_000;

type Sent = { url: string; body: unknown };

function deps(rpc: Rpc, sent: Sent[] = [], over: Partial<LiveDeps> = {}): LiveDeps {
  return {
    env,
    rpc,
    send: async (url, init) => {
      sent.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
      if (url.endsWith("/auth/v1/user")) {
        const auth = (init.headers as Record<string, string>).Authorization;
        return auth === "Bearer good-session" ? Response.json({ id: UID }) : new Response("{}", { status: 401 });
      }
      return new Response(null, { status: 202 });
    },
    build: () => [{ idx: 0, round: 1, kind: "pick_word", prompt: { en: "water", lang: "es" }, options: ["agua", "fuego", "tierra", "aire"], answer: 0 }],
    now: () => NOW,
    ...over,
  };
}

function wrap(extra: Record<string, unknown>, events: unknown[] = []) {
  return { data: { room_id: RID, topic: TOPIC, sign_key: KEYS.signKey, events, ...extra } };
}

const player = (tv = 1) => `Bearer ${playerToken(RID, PID, tv, EXP, env, NOW)}`;
const host = () => `Bearer ${hostToken(RID, UID, EXP, env, NOW)}`;

test("nicknames come only from the generated list", () => {
  assert.equal(isNickname("brave-otter"), true);
  assert.equal(isNickname("brave-bobby"), false);
  assert.equal(isNickname("Brave-Otter"), false);
  assert.equal(isNickname("brave-otter-x"), false);
  let i = 0;
  const choices = nicknameChoices(() => [0.1, 0.2, 0.1, 0.2, 0.5, 0.5, 0.9, 0.9][i++ % 8]);
  assert.equal(choices.length, 3);
  assert.ok(choices.every(isNickname));
});

test("room codes use the Crockford alphabet", () => {
  for (let i = 0; i < 200; i++) assert.match(newCode(), /^[0-9A-HJKMNP-TV-Z]{6}$/);
});

test("settings need known target languages", () => {
  assert.deepEqual(parseSettings({ home: "en", targets: ["es", "fr"] }), { home: "en", targets: ["es", "fr"], rounds: 3, per_round: 5, window_ms: 20000 });
  assert.equal(parseSettings({ home: "en", targets: [] }), null);
  assert.equal(parseSettings({ home: "en", targets: ["xx"] }), null);
  assert.equal(parseSettings({ home: "en", targets: ["en"] }), null);
});

test("every route answers 503 while Stoa is unconfigured", async () => {
  const d = deps(async () => assert.fail("no db call"), [], { env: {} });
  assert.equal((await joinRoom({ code: "ABC123", nickname: "brave-otter" }, "1.1.1.1", d)).status, 503);
  assert.equal((await createRoom("Bearer good-session", {}, d)).status, 503);
  assert.equal((await submitAnswer(player(), { idx: 0, choice: 0 }, d)).status, 503);
});

test("a host signs in, creates a room and gets a host token", async () => {
  const calls: Record<string, unknown>[] = [];
  let first = true;
  const d = deps(async (fn, args) => {
    calls.push(args);
    if (first) {
      first = false;
      return { error: "code_taken" };
    }
    return { data: { room_id: args.p_id, code: args.p_code, topic: TOPIC, expires_at: EXP, verify_key: args.p_verify_key } };
  });
  assert.equal((await createRoom(null, {}, d)).status, 401);
  assert.equal((await createRoom("Bearer bad", { settings: { targets: ["es"] } }, d)).status, 401);
  assert.equal((await createRoom("Bearer good-session", { settings: { targets: ["zz"] } }, d)).status, 400);
  const r = await createRoom("Bearer good-session", { settings: { targets: ["es"] } }, d);
  assert.equal(r.status, 200);
  assert.equal(calls.length, 2, "a taken code retries with a new one");
  assert.notEqual(calls[0].p_id, calls[1].p_id);
  assert.equal(calls[1].p_host, UID);
  assert.match(String(calls[1].p_sign_key), /^v1\./);
  const claims = readToken(String(r.body.host_token), env, NOW);
  assert.deepEqual([claims?.typ, claims?.rid], ["host", r.body.room_id]);
  assert.deepEqual(r.body.realtime, { url: "https://db.test", key: "anon", topic: `stoa:${TOPIC}` });
  assert.ok(!JSON.stringify(r.body).includes("v1."), "the sealed key stays on the server");
});

test("a room without questions refuses to open", async () => {
  const d = deps(async () => assert.fail("no db call"), [], { build: () => null });
  assert.deepEqual((await createRoom("Bearer good-session", { settings: { targets: ["es"] } }, d)).body, { error: "no_questions" });
});

test("join returns a player token carrying the token version", async () => {
  const d = deps(async (fn, args) => {
    assert.equal(fn, "live_join");
    assert.deepEqual(args, { p_code: "ABC123", p_nickname: "brave-otter", p_ip: ipKey("9.9.9.1") });
    return wrap({ player_id: PID, token_version: 3, expires_at: EXP, verify_key: KEYS.verifyKey });
  });
  const r = await joinRoom({ code: "abc123", nickname: "brave-otter" }, "9.9.9.1", d);
  assert.equal(r.status, 200);
  const c = readToken(String(r.body.token), env, NOW) as PlayerClaims;
  assert.deepEqual([c.typ, c.rid, c.pid, c.tv, c.exp], ["player", RID, PID, 3, EXP / 1000]);
  assert.equal(r.body.verify_key, KEYS.verifyKey);
});

test("join refuses free-text names and malformed codes", async () => {
  const d = deps(async () => assert.fail("no db call"));
  assert.equal((await joinRoom({ code: "ABC123", nickname: "my name" }, "9.9.9.2", d)).status, 400);
  assert.equal((await joinRoom({ code: "ABCI23", nickname: "brave-otter" }, "9.9.9.2", d)).status, 400);
});

test("join sends a hashed IP and maps the database limits to 429", async () => {
  assert.match(ipKey("9.9.9.3"), /^[0-9a-f]{32}$/);
  assert.notEqual(ipKey("9.9.9.3"), ipKey("9.9.9.4"));
  assert.ok(!ipKey("9.9.9.3").includes("9.9.9.3"));
  assert.deepEqual(await joinRoom({ code: "ZZZ999", nickname: "brave-otter" }, "9.9.9.3", deps(async () => ({ data: { error: "slow_down", events: [] } }))), { status: 429, body: { error: "slow_down" } });
  assert.deepEqual(await joinRoom({ code: "ZZZ999", nickname: "brave-otter" }, "9.9.9.3", deps(async () => ({ data: { error: "no_room", events: [] } }))), { status: 404, body: { error: "no_room" } });
  assert.deepEqual(await joinRoom({ code: "ABC123", nickname: "brave-otter" }, "9.9.9.3", deps(async () => wrap({ error: "locked" }))), { status: 409, body: { error: "locked" } });
});

test("room-full and name-taken map to 409", async () => {
  assert.deepEqual(await joinRoom({ code: "FAAA01", nickname: "brave-otter" }, "9.9.9.5", deps(async () => wrap({ error: "room_full" }))), { status: 409, body: { error: "room_full" } });
  assert.deepEqual(await joinRoom({ code: "FAAA01", nickname: "brave-otter" }, "9.9.9.5", deps(async () => wrap({ error: "name_taken" }))), { status: 409, body: { error: "name_taken" } });
});

const snapshot = (tv: number, removed: boolean) =>
  wrap({ server_now: NOW, room: { id: RID, phase: "question", token_version: tv, expires_at: EXP, verify_key: KEYS.verifyKey }, player: { id: PID, removed, points: 0 } });

test("state reissues a token after a version bump", async () => {
  const r = await roomState(RID, player(1), deps(async () => snapshot(2, false)));
  assert.equal(r.status, 200);
  assert.equal((readToken(String(r.body.token), env, NOW) as PlayerClaims).tv, 2);
  assert.ok(!("sign_key" in r.body) && !("events" in r.body));
  const same = await roomState(RID, player(2), deps(async () => snapshot(2, false)));
  assert.equal(same.body.token, undefined);
});

test("a removed player gets 403 from state", async () => {
  assert.deepEqual(await roomState(RID, player(1), deps(async () => snapshot(2, true))), { status: 403, body: { error: "removed" } });
});

test("a token for another room or a forged token gets 401", async () => {
  const d = deps(async () => assert.fail("no db call"));
  assert.equal((await roomState(randomUUID(), player(), d)).status, 401);
  assert.equal((await roomState(RID, "Bearer x.y.z", d)).status, 401);
  assert.equal((await roomState(RID, null, d)).status, 401);
});

test("host state passes the host user and player state passes the player", async () => {
  const seen: Record<string, unknown>[] = [];
  const d = deps(async (fn, args) => {
    seen.push(args);
    return snapshot(1, false);
  });
  await roomState(RID, host(), d);
  await roomState(RID, player(), d);
  assert.deepEqual(seen, [{ p_room: RID, p_player: null, p_host: UID }, { p_room: RID, p_player: PID, p_host: null }]);
});

test("an answer goes to the database with the token version and returns the receive time", async () => {
  const fns: string[] = [];
  const d = deps(async (fn, args) => {
    fns.push(fn);
    if (fn === "live_tick") return wrap({});
    assert.equal(fn, "live_answer");
    assert.deepEqual(args, { p_room: RID, p_player: PID, p_tv: 1, p_idx: 2, p_choice: 3 });
    return wrap({ received_at: NOW + 5 });
  });
  assert.deepEqual(await submitAnswer(player(), { idx: 2, choice: 3 }, d), { status: 200, body: { received_at: NOW + 5 } });
  assert.deepEqual(fns, ["live_answer", "live_tick"], "a stored answer is followed by a tick for the early reveal");
  assert.equal((await submitAnswer(player(), { idx: 2, choice: 4 }, d)).status, 400);
  assert.equal((await submitAnswer(host(), { idx: 2, choice: 1 }, d)).status, 401);
});

test("late, duplicate, stale and removed answers map to their codes", async () => {
  for (const [code, status] of [["late", 409], ["duplicate", 409], ["not_open", 409], ["paused", 409]] as const) {
    assert.deepEqual(await submitAnswer(player(), { idx: 0, choice: 0 }, deps(async () => wrap({ error: code }))), { status, body: { error: code } });
  }
  assert.deepEqual(await submitAnswer(player(), { idx: 0, choice: 0 }, deps(async () => ({ error: "stale_token" }))), { status: 409, body: { error: "stale_token" } });
  assert.deepEqual(await submitAnswer(player(), { idx: 0, choice: 0 }, deps(async () => ({ error: "removed" }))), { status: 403, body: { error: "removed" } });
});

test("a call broadcasts only its last event, signed on the room topic, and it verifies on a phone", async () => {
  const sent: Sent[] = [];
  const reveal = { idx: 0, answer: 0, counts: [3, 1, 0, 0], right: 3 };
  const d = deps(async () => wrap({}, [{ seq: 6, type: "board", issued_at: NOW, payload: {} }, { seq: 7, type: "reveal", issued_at: NOW, payload: reveal }]), sent);
  await hostAction(RID, "skip", host(), d);
  const call = sent.find((s) => s.url === "https://db.test/realtime/v1/api/broadcast");
  assert.ok(call);
  const msgs = (call.body as { messages: { topic: string; event: string; private: boolean; payload: unknown }[] }).messages;
  assert.equal(msgs.length, 1);
  const [msg] = msgs;
  assert.deepEqual([msg.topic, msg.event, msg.private], [`stoa:${TOPIC}`, "stoa", false]);
  const v = await verifyEvent(msg.payload, { roomId: RID, lastSeq: 6, publicKey: KEYS.verifyKey, now: NOW + 200, clockOffsetMs: 0 });
  assert.deepEqual(v, { ok: true, seq: 7, type: "reveal", issuedAt: NOW, payload: reveal });
});

test("probe grace is the median delay, capped at 1000 ms", () => {
  const s = (d: number[]) => d.map((x, i) => ({ sent_at: NOW + i * 3000, received_at: NOW + i * 3000 + x }));
  assert.equal(medianGrace(s([120, 80, 400])), 120);
  assert.equal(medianGrace(s([100, 200, 300, 400])), 250);
  assert.equal(medianGrace(s([3000, 4000, 5000])), 1000);
  assert.equal(medianGrace(s([-50, -20, -10])), 0);
  assert.equal(medianGrace(s([100, 200])), null);
  assert.equal(medianGrace("x"), null);
});

test("probe reports grace and verify failures", async () => {
  const d = deps(async (fn, args) => {
    assert.equal(fn, "live_probe");
    assert.deepEqual(args, { p_room: RID, p_player: PID, p_tv: 1, p_grace: 200, p_failed: true, p_net: netKey(RID, "203.0.113.9") });
    return wrap({ rotated: true });
  });
  const samples = [150, 200, 250].map((x) => ({ sent_at: NOW, received_at: NOW + x }));
  assert.deepEqual(await submitProbe(player(), { samples, failed: true }, d, "203.0.113.9"), { status: 200, body: { rotated: true } });
  const quiet = deps(async (_fn, args) => {
    assert.equal(args.p_failed, false, "a failure count from the client is ignored");
    return wrap({ rotated: false });
  });
  await submitProbe(player(), { failures: 900 }, quiet);
});

test("the report network key is per room and hides the address", () => {
  const a = netKey(RID, "203.0.113.9");
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(a, netKey(RID, "203.0.113.9"), "one network reports as one");
  assert.notEqual(a, netKey(randomUUID(), "203.0.113.9"), "the key does not link rooms");
  assert.notEqual(a, netKey(RID, "203.0.113.10"));
  assert.ok(!a.includes("203"));
  assert.equal(netKey(RID, null), netKey(RID, ""), "unknown addresses share one network");
});

test("host controls need the host token for that room", async () => {
  const d = deps(async (fn, args) => {
    assert.equal(fn, "live_host");
    return wrap({}, [{ seq: 1, type: String(args.p_action) === "start" ? "open" : "pause", issued_at: NOW, payload: {} }]);
  });
  assert.deepEqual(await hostAction(RID, "start", host(), d), { status: 200, body: { ok: true, events: 1 } });
  for (const action of ["lock", "unlock", "kick_all", "rotate"]) assert.equal((await hostAction(RID, action, host(), d)).status, 200);
  assert.equal((await hostAction(RID, "start", player(), d)).status, 401);
  assert.equal((await hostAction(randomUUID(), "start", host(), d)).status, 401);
  assert.equal((await hostAction(RID, "explode", host(), d)).status, 404);
});

test("player controls validate their values", async () => {
  const seen: unknown[] = [];
  const d = deps(async (fn, args) => {
    seen.push(args.p_value);
    return wrap({ token_version: 2 });
  });
  const target = randomUUID();
  assert.deepEqual(await playerAction(RID, target, "remove", host(), {}, d), { status: 200, body: { ok: true, token_version: 2 } });
  assert.equal((await playerAction(RID, target, "rename", host(), { nickname: "rude words" }, d)).status, 400);
  assert.equal((await playerAction(RID, target, "rename", host(), { nickname: "calm-owl" }, d)).status, 200);
  assert.equal((await playerAction(RID, target, "time", host(), { factor: 4 }, d)).status, 400);
  assert.equal((await playerAction(RID, target, "time", host(), { factor: 2 }, d)).status, 200);
  assert.equal((await playerAction(RID, target, "move", host(), { team: 2 }, d)).status, 200);
  assert.deepEqual(seen, [null, "calm-owl", "2.00", "2"]);
  assert.equal((await playerAction(RID, "nope", "remove", host(), {}, d)).status, 404);
});

test("sweep needs the shared secret and ticks every due room", async () => {
  const sent: Sent[] = [];
  const other = randomUUID();
  const d = deps(async (fn, args) => {
    if (fn === "live_due") return { data: [RID, other] };
    assert.equal(fn, "live_tick");
    return args.p_room === RID ? wrap({}, [{ seq: 4, type: "reveal", issued_at: NOW, payload: {} }]) : { error: "no_room" };
  }, sent);
  assert.equal((await sweep("Bearer wrong", d)).status, 401);
  assert.equal((await sweep(null, d)).status, 401);
  assert.deepEqual(await sweep(`Bearer ${"w".repeat(40)}`, d), { status: 200, body: { rooms: 2, ticked: 2, events: 1 } });
  assert.equal(sent.filter((s) => s.url.endsWith("/api/broadcast")).length, 1);
});

test("sweep ticks at most 5 rooms at a time and stops starting work after its budget", async () => {
  const ids = Array.from({ length: 20 }, () => randomUUID());
  let running = 0;
  let peak = 0;
  let clock = NOW;
  const d = deps(async (fn) => {
    if (fn === "live_due") return { data: ids };
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    clock += 400;
    running--;
    return { error: "no_room" };
  }, [], { now: () => clock });
  const r = await sweep(`Bearer ${"w".repeat(40)}`, d);
  assert.equal(peak, 5);
  assert.ok((r.body.ticked as number) < 20, `ticked ${r.body.ticked}`);
});

test("room creation passes School mode to the database", async () => {
  const seen: Record<string, unknown>[] = [];
  const d = deps(async (_fn, args) => {
    seen.push(args.p_settings as Record<string, unknown>);
    return { data: { room_id: args.p_id, code: args.p_code, topic: TOPIC, expires_at: EXP, verify_key: args.p_verify_key } };
  });
  await createRoom("Bearer good-session", { settings: { targets: ["es"] }, school_mode: true }, d);
  await createRoom("Bearer good-session", { settings: { targets: ["es"] } }, d);
  await createRoom("Bearer good-session", { settings: { targets: ["es"] }, school_mode: "yes" }, d);
  assert.deepEqual(seen.map((s) => s.school_mode), [true, false, false]);
});

test("after a rotation the last event goes out on the old and the new topic", async () => {
  const sent: Sent[] = [];
  const old = randomUUID();
  const d = deps(async () => ({ data: { room_id: RID, topic: TOPIC, topics: [TOPIC, old], sign_key: KEYS.signKey, events: [{ seq: 9, type: "rotate", issued_at: NOW, payload: {} }] } }), sent);
  assert.equal((await hostAction(RID, "rotate", host(), d)).status, 200);
  const call = sent.find((s) => s.url.endsWith("/realtime/v1/api/broadcast"))!;
  const msgs = (call.body as { messages: { topic: string; payload: unknown }[] }).messages;
  assert.deepEqual(msgs.map((m) => m.topic), [`stoa:${TOPIC}`, `stoa:${old}`]);
  assert.deepEqual(msgs[0].payload, msgs[1].payload);
  const v = await verifyEvent(msgs[1].payload, { roomId: RID, lastSeq: 8, publicKey: KEYS.verifyKey, now: NOW, clockOffsetMs: 0 });
  assert.equal(v.ok && v.type, "rotate");
});

test("the client IP comes only from x-real-ip, which Vercel sets and overwrites", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  assert.equal(clientIpFrom(h({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6, 203.0.113.7" })), "203.0.113.7", "a spoofed forwarded-for is ignored");
  assert.equal(clientIpFrom(h({ "x-real-ip": " 2001:db8::1 " })), "2001:db8::1");
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "198.51.100.4" })), null, "forwarded-for alone is never trusted");
  assert.equal(clientIpFrom(h({ "x-real-ip": "not an ip" })), null);
  assert.equal(clientIpFrom(h({})), null);
  assert.notEqual(ipKey("203.0.113.7"), ipKey(null));
});
