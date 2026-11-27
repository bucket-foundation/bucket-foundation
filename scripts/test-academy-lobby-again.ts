import test from "node:test";
import assert from "node:assert/strict";
import * as groups from "../src/lib/academy/groups-server";

process.env.POLINGUAL_LOBBY_SETUP = "on";
process.env.POLINGUAL_LOBBY_END = "on";

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

function fakeDb(tables: Record<string, Row[]>) {
  const log: string[] = [];
  const from = (table: string) => {
    let op: "select" | "update" | "delete" = "select";
    let patch: Row = {};
    const filters: Filter[] = [];
    const run = async () => {
      await Promise.resolve();
      const rows = tables[table] ?? [];
      const hit = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") for (const r of hit) Object.assign(r, patch);
      if (op === "delete") tables[table] = rows.filter((r) => !hit.includes(r));
      if (op !== "select") log.push(`${op} ${table} ${hit.length}`);
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    const chain = {
      select: () => chain,
      update: (p: Row) => ((op = "update"), (patch = p), chain),
      delete: () => ((op = "delete"), chain),
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), chain),
      neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), chain),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), chain),
      limit: () => chain,
      then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => run().then(ok, bad),
    };
    return chain;
  };
  return { db: { from }, log };
}

test("two pollers reach the next game together and only one resets it", async () => {
  const server = await import("../src/lib/academy/lobbies-server");
  const now = Date.parse("2026-11-27T10:00:00.000Z");
  const started = new Date(now - 120_000).toISOString();
  const lobby = { id: "L1", code: "ABC123", host_id: "h", name: "R", game: "flags", root: "en", targets: ["es"], seed: "1", status: "done", listed: true, rounds: 2, round_seconds: 10, reveal_seconds: 0, started_at: started, version: 1, created_at: started, standing_slot: null, playlist: ["flags", "daily"], mix: false, start_at: null, ended_at: null };
  const seen = new Date(now - 1000).toISOString();
  const tables: Record<string, Row[]> = {
    lobbies: [{ ...lobby }],
    lobby_players: [
      { lobby_id: "L1", user_id: "h", display_name: "H", ready: false, score: 300, total: 100, last_seen: seen, joined_at: started, is_bot: false },
      { lobby_id: "L1", user_id: "p", display_name: "P", ready: false, score: 200, total: 0, last_seen: seen, joined_at: started, is_bot: false },
    ],
    lobby_answers: [{ lobby_id: "L1", round: 0 }],
    lobby_prompts: [{ lobby_id: "L1", round: 0 }],
  };
  const { db, log } = fakeDb(tables);
  (groups as unknown as Record<string, unknown>).service = () => db;

  const [a, b] = await Promise.all([server.againHosted({ ...lobby } as never, now), server.againHosted({ ...lobby } as never, now)]);
  assert.equal(log.filter((l) => l.startsWith("update lobbies") && l.endsWith(" 1")).length, 2);
  assert.equal(log.filter((l) => l === "delete lobby_answers 0" || l === "delete lobby_answers 1").length, 1);
  assert.deepEqual(tables.lobby_players.map((p) => p.total), [400, 200]);
  assert.equal(a.status, "lobby");
  assert.equal(b.status, "lobby");
  assert.equal(tables.lobbies[0].game, "daily");

  tables.lobbies[0].status = "playing";
  tables.lobbies[0].started_at = new Date(now + 3000).toISOString();
  tables.lobby_answers.push({ lobby_id: "L1", round: 0 });
  const late = await server.againHosted({ ...lobby } as never, now + 1);
  assert.equal(late.status, "playing");
  assert.equal(tables.lobby_answers.length, 1);
  assert.deepEqual(tables.lobby_players.map((p) => p.total), [400, 200]);
});
