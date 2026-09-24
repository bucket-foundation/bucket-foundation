import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { parseHistoryDecision } from "../src/lib/history/review";
import { openLaunchScope } from "./lib/test-harness";

openLaunchScope();

const ID = "0f8c7a52-2b8e-4a3e-9f4e-3a8a0f1f2c11";

test("history decisions parse approve, reject with a reason, and prefer with a role", () => {
  assert.deepEqual(parseHistoryDecision({ action: "approve", silverId: ID }), { ok: true, value: { action: "approve", silverId: ID } });
  assert.deepEqual(parseHistoryDecision({ action: "reject", silverId: ID, reason: "  one source only " }), { ok: true, value: { action: "reject", silverId: ID, reason: "one source only" } });
  assert.deepEqual(parseHistoryDecision({ action: "prefer", silverId: ID, role: "born" }), { ok: true, value: { action: "prefer", silverId: ID, role: "born" } });
  assert.equal(parseHistoryDecision({ action: "reject", silverId: ID }).ok, false);
  assert.equal(parseHistoryDecision({ action: "prefer", silverId: ID }).ok, false);
  assert.equal(parseHistoryDecision({ action: "approve", silverId: "x" }).ok, false);
  assert.equal(parseHistoryDecision({ action: "delete", silverId: ID }).ok, false);
  assert.equal(parseHistoryDecision(null).ok, false);
});

test("the history review route refuses a caller who is not a graph reviewer", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.RESEARCH_OS_REVIEWER_EMAILS = "reviewer@school.example";
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const route = require("../src/app/api/research-os/history/route") as {
    GET: (req: NextRequest) => Promise<Response>;
    POST: (req: NextRequest) => Promise<Response>;
  };
  const get = await route.GET(new NextRequest("http://localhost/api/research-os/history"));
  assert.equal(get.status, 403);
  const post = await route.POST(
    new NextRequest("http://localhost/api/research-os/history", { method: "POST", body: JSON.stringify({ action: "approve", silverId: ID }), headers: { "content-type": "application/json" } }),
  );
  assert.equal(post.status, 403);
});
