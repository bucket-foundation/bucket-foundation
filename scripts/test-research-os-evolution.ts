import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessStore } from "../src/lib/research-os/read-access";
import { authorizeEdgeFactoids, isEdgeId, purgeEdgeFactoids } from "../src/lib/research-os/edge-factoids";
import { EVOLUTION_EDGE_KINDS, EVOLUTION_LEVELS, EVOLUTION_NODE_KINDS, edgeSubject, evolutionEdgeFits, parseEdgeSubject } from "../src/lib/research-os/evolution";

const store = (visibility: Record<string, "public" | "private">, fail = false): AccessStore => ({
  async nodes(ids) {
    if (fail) return { ok: false, error: "down" };
    return { ok: true, value: ids.filter((id) => visibility[id]).map((id) => ({ id, visibility: visibility[id], ownerId: null })) };
  },
  async grants() {
    return { ok: true, value: [] };
  },
  async groups() {
    return { ok: true, value: [] };
  },
});

const rows = [
  { id: "f1", edge_id: "e1", role: "began", from_id: "a", to_id: "b" },
  { id: "f2", edge_id: "e2", role: "began", from_id: "a", to_id: "hidden" },
  { id: "f3", edge_id: "e3", role: "ended", from_id: "gone", to_id: "b" },
];

test("an edge factoid shows only when both endpoints pass", async () => {
  const r = await authorizeEdgeFactoids(rows, { id: null }, "view", store({ a: "public", b: "public", hidden: "private" }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.ok && r.rows.map((x) => x.id), ["f1"]);
});

test("an unreadable access store fails the whole read", async () => {
  const r = await authorizeEdgeFactoids(rows, { id: null }, "view", store({}, true));
  assert.equal(r.ok, false);
});

test("no rows reads nothing", async () => {
  assert.deepEqual(await authorizeEdgeFactoids([], { id: null }), { ok: true, rows: [] });
});

test("the six node kinds and nine edge kinds match the plan", () => {
  assert.deepEqual([...EVOLUTION_NODE_KINDS], ["occupation", "task", "technology", "software", "discovery", "topic"]);
  assert.equal(EVOLUTION_EDGE_KINDS.length, 9);
  assert.deepEqual(EVOLUTION_LEVELS.task, ["onet_task", "dwa", "iwa", "gwa", "factor"]);
});

test("edge endpoint rules", () => {
  assert.equal(evolutionEdgeFits("performs", "occupation", "task"), true);
  assert.equal(evolutionEdgeFits("performs", "task", "occupation"), false);
  assert.equal(evolutionEdgeFits("uses", "occupation", "software"), true);
  assert.equal(evolutionEdgeFits("uses", "software", "technology"), true);
  assert.equal(evolutionEdgeFits("uses", "task", "software"), false);
  assert.equal(evolutionEdgeFits("replaces", "software", "software"), true);
  assert.equal(evolutionEdgeFits("replaces", "software", "technology"), false);
  assert.equal(evolutionEdgeFits("replaces", "concept", "concept"), false);
  assert.equal(evolutionEdgeFits("influences", "software", "software"), true);
  assert.equal(evolutionEdgeFits("maps_to", "discovery", "topic"), true);
  assert.equal(evolutionEdgeFits("prerequisite", "concept", "law"), true);
});

test("edge subjects round-trip and reject anything else", () => {
  const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
  assert.equal(parseEdgeSubject(edgeSubject(id)), id);
  assert.equal(parseEdgeSubject("edge:not-a-uuid"), null);
  assert.equal(parseEdgeSubject("some-slug"), null);
  assert.equal(isEdgeId(id), true);
  assert.equal(isEdgeId("edge-1"), false);
});

function rpc(result: { data?: unknown; error?: { code?: string; message: string } | null }) {
  const calls: unknown[] = [];
  const svc = { rpc: async (name: string, args: unknown) => (calls.push([name, args]), { data: result.data ?? null, error: result.error ?? null }) } as unknown as SupabaseClient;
  return { svc, calls };
}

test("purge maps the database answers", async () => {
  const done = rpc({ data: { ok: true, factoids: 2, lineage: 2 } });
  assert.deepEqual(await purgeEdgeFactoids(done.svc, "e", "r"), { status: 200, body: { ok: true, factoids: 2, lineage: 2 } });
  assert.deepEqual(done.calls, [["purge_edge_factoids", { p_edge: "e", p_reviewer: "r" }]]);
  assert.equal((await purgeEdgeFactoids(rpc({ data: { ok: false, error: "edge_not_found" } }).svc, "e", "r")).status, 404);
  assert.equal((await purgeEdgeFactoids(rpc({ error: { code: "23514", message: "not withdrawn" } }).svc, "e", "r")).status, 409);
  assert.equal((await purgeEdgeFactoids(rpc({ error: { code: "08006", message: "down" } }).svc, "e", "r")).status, 503);
});
