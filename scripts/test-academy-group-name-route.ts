import test from "node:test";
import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import * as server from "../src/lib/academy/groups-server";
import { POST } from "../src/app/api/academy/groups/name/route";
import { POST as CREATE } from "../src/app/api/academy/groups/route";
import { POST as JOIN } from "../src/app/api/academy/groups/join/route";

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

function stubInsert(email: string | null): { row: Record<string, unknown>; chosen: boolean }[] {
  const inserts: { row: Record<string, unknown>; chosen: boolean }[] = [];
  mutable.configured = () => true;
  mutable.requestAccount = async () => ({ id: "u-9", email });
  mutable.joinLimited = () => false;
  mutable.countOwned = async () => 0;
  mutable.insertGroupWithCode = async () => ({ id: "g9", name: "G", kind: "friends", owner_id: "u-9", invite_code: "0123456789", created_at: "2026-11-12", weekly_goal: null });
  mutable.groupByCode = async () => ({ id: "g9", name: "G", kind: "friends", owner_id: "u-1", invite_code: "0123456789", created_at: "2026-11-12", weekly_goal: null });
  mutable.membersOf = async () => [];
  mutable.membershipsOf = async () => [];
  mutable.blocksTouching = async () => [];
  mutable.oneGroup = async () => ({ id: "g9" });
  mutable.insertMember = async (row: Record<string, unknown>, chosen: boolean) => {
    inserts.push({ row, chosen });
    return { error: null };
  };
  return inserts;
}

function groupsRequest(path: string, body: unknown): NextRequest {
  return new Request(`https://polingual.com/api/academy/groups${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as unknown as NextRequest;
}

test("create marks the name chosen only when it differs from the email default", async () => {
  let inserts = stubInsert("ana.rossi@example.com");
  assert.equal((await CREATE(groupsRequest("", { name: "Rossi", kind: "family", displayName: "Ana" }))).status, 200);
  assert.deepEqual(inserts.map((i) => i.chosen), [false]);
  inserts = stubInsert("ana.rossi@example.com");
  assert.equal((await CREATE(groupsRequest("", { name: "Rossi", kind: "family", displayName: "Nonna Lucia" }))).status, 200);
  assert.deepEqual(inserts.map((i) => i.chosen), [true]);
  inserts = stubInsert(null);
  assert.equal((await CREATE(groupsRequest("", { name: "Rossi", kind: "family", displayName: "Nonna Lucia" }))).status, 200);
  assert.deepEqual(inserts.map((i) => i.chosen), [false]);
});

test("join marks the name chosen only when it differs from the email default", async () => {
  let inserts = stubInsert("gia@example.com");
  assert.equal((await JOIN(groupsRequest("/join", { code: "0123456789", displayName: "gia" }))).status, 200);
  assert.deepEqual(inserts.map((i) => i.chosen), [false]);
  inserts = stubInsert("gia@example.com");
  assert.equal((await JOIN(groupsRequest("/join", { code: "0123456789", displayName: "Zia Gia" }))).status, 200);
  assert.deepEqual(inserts.map((i) => i.chosen), [true]);
  assert.equal(inserts[0].row.display_name, "Zia Gia");
});
