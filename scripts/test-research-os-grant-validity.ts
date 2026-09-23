import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizeNode, readGrants, type AccessStore, type GrantRow } from "../src/lib/research-os/read-access";
import { loadGrants } from "../src/lib/research-os/access-db";

const NODE = "00000000-0000-0000-0000-00000000000a";
const LEARNER = "00000000-0000-0000-0000-0000000000b1";

const ROWS: GrantRow[] = [
  { id: "g1", node_id: NODE, grantee_id: LEARNER, grantee_group: null, role: "cite", expires_at: null },
  { id: "g2", node_id: NODE, grantee_id: LEARNER, grantee_group: null, role: "own", expires_at: null },
  { id: "g3", node_id: NODE, grantee_id: LEARNER, grantee_group: "class:x", role: "view", expires_at: null },
];

function fakeClient(rows: GrantRow[]): () => SupabaseClient {
  const builder = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    order: () => builder,
    range: (from: number) => Promise.resolve({ data: from === 0 ? rows : [], error: null }),
  };
  return () => ({ from: () => builder }) as unknown as SupabaseClient;
}

test("readGrants, the read adapter's path, ignores an invalid grant row", async () => {
  const read = await readGrants([NODE], fakeClient(ROWS));
  assert.ok(read.ok);
  assert.deepEqual(
    read.value.map((g) => g.id),
    ["g1"],
  );
});

test("loadGrants, the access route's path, ignores an invalid grant row", async () => {
  const read = await loadGrants(NODE, fakeClient(ROWS));
  assert.ok(read.ok);
  assert.deepEqual(
    read.value.map((g) => g.id),
    ["g1"],
  );
});

test("an invalid grant row admits nobody through authorizeNode", async () => {
  const client = fakeClient(ROWS.slice(1));
  const store: AccessStore = {
    async nodes() {
      return { ok: true, value: [{ id: NODE, visibility: "private", ownerId: null }] };
    },
    grants: (ids) => readGrants(ids, client),
    async groups() {
      return { ok: true, value: ["class:x"] };
    },
  };
  const viewed = await authorizeNode(NODE, { id: LEARNER }, "view", store);
  assert.deepEqual(viewed, { ok: false, reason: "denied" });
});

test("a read failure is unavailable on the route's path", async () => {
  const failing = () =>
    ({
      from: () => {
        const b = { select: () => b, in: () => b, order: () => b, range: () => Promise.resolve({ data: null, error: { message: "down" } }) };
        return b;
      },
    }) as unknown as SupabaseClient;
  const read = await loadGrants(NODE, failing);
  assert.deepEqual(read, { ok: false, reason: "unavailable" });
});
