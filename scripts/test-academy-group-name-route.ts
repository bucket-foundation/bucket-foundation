import test from "node:test";
import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import * as server from "../src/lib/academy/groups-server";
import { POST } from "../src/app/api/academy/groups/name/route";

type Call = { table: string; values: Record<string, unknown>; eq: [string, unknown] };
type Reply = { data: unknown; error: { code?: string; message: string } | null };

const mutable = server as unknown as Record<string, unknown>;

function stub(uid: string | null, replies: Reply[]): Call[] {
  const calls: Call[] = [];
  mutable.configured = () => true;
  mutable.requestUser = async () => uid;
  mutable.service = () => ({
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: (col: string, val: unknown) => ({
          select: async () => {
            calls.push({ table, values, eq: [col, val] });
            return replies.shift() ?? { data: [], error: null };
          },
        }),
      }),
    }),
  });
  return calls;
}

function request(body: unknown): NextRequest {
  return new Request("https://polingual.com/api/academy/groups/name", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as unknown as NextRequest;
}

test("renames every membership of the caller and marks the name chosen", async () => {
  const calls = stub("u-1", [{ data: [{ group_id: "g1" }, { group_id: "g2" }], error: null }]);
  const res = await POST(request({ displayName: "  Nonna   Lucia " }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { displayName: "Nonna Lucia", groups: 2 });
  assert.deepEqual(calls, [{ table: "group_members", values: { display_name: "Nonna Lucia", chosen_name: true }, eq: ["user_id", "u-1"] }]);
});

test("falls back to the name alone before the column migration lands", async () => {
  const calls = stub("u-2", [{ data: null, error: { code: "42703", message: "column group_members.chosen_name does not exist" } }, { data: [{ group_id: "g1" }], error: null }]);
  const res = await POST(request({ displayName: "Gia" }));
  assert.equal(res.status, 200);
  assert.deepEqual(calls.map((c) => c.values), [{ display_name: "Gia", chosen_name: true }, { display_name: "Gia" }]);
});

test("refuses signed-out callers, empty names and filtered names without writing", async () => {
  let calls = stub(null, []);
  assert.equal((await POST(request({ displayName: "Gia" }))).status, 401);
  calls = stub("u-3", []);
  assert.equal((await POST(request({ displayName: "   " }))).status, 400);
  const blocked = await POST(request({ displayName: "sh1t head" }));
  assert.equal(blocked.status, 422);
  assert.deepEqual(await blocked.json(), { error: "name_not_allowed" });
  assert.equal(calls.length, 0);
});

test("a failed write is a server error", async () => {
  stub("u-4", [{ data: null, error: { code: "42501", message: "permission denied" } }]);
  assert.equal((await POST(request({ displayName: "Gia" }))).status, 500);
});
