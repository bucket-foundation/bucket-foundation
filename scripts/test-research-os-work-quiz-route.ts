import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { openLaunchScope } from "./lib/test-harness";

openLaunchScope();
process.env.RESEARCH_OS_REVIEWER_EMAILS = "staff@bucket.foundation";

/* eslint-disable @typescript-eslint/no-require-imports */
const db = require("@/lib/research-os/db") as Record<string, unknown>;
const quizDb = require("@/lib/research-os/work-quiz/db") as Record<string, unknown>;
const sources = require("@/lib/research-os/work-quiz/sources-server") as Record<string, unknown>;
/* eslint-enable @typescript-eslint/no-require-imports */

const STAFF = { id: "00000000-0000-0000-0000-0000000000a1", email: "staff@bucket.foundation" };
const LEARNER = { id: "00000000-0000-0000-0000-0000000000b2", email: "someone@example.com" };
let who: { id: string; email: string } | null = null;
let writes = 0;

db.configured = () => true;
db.verifyLearner = async () => who?.id ?? null;
db.verifyLearnerIdentity = async () => who;
quizDb.dueCards = async () => [];
quizDb.openAttempt = async () => null;
quizDb.issueAttempt = async (learnerId: string, question: unknown, mode: string) => {
  writes++;
  return { id: "11111111-1111-4111-8111-111111111111", learner_id: learnerId, question, mode, issued_at: new Date().toISOString(), answered_at: null };
};
quizDb.loadAttempt = async () => null;
let picks = 0;
quizDb.loadCoverage = async () => [];
quizDb.recordPicks = async () => {
  picks++;
};
quizDb.recordMiss = async () => {};
quizDb.loadStats = async () => {
  writes++;
  return { answered: 0 };
};
sources.loadWorkSources = async () => ({
  status: "ok",
  sources: {
    repoUrl: null,
    beads: [
      { id: "bkt-aaaa", title: "Surprise timed work quiz", status: "open", priority: 1, createdAt: "2026-09-27" },
      { id: "bkt-bbbb", title: "Labor importer for occupations", status: "closed", priority: 2, createdAt: "2026-09-20" },
    ],
    prs: [
      { number: 341, title: "feat(ros): nearest node search (#341)", date: "2026-09-22", order: 0 },
      { number: 342, title: "feat(ros): computing history releases (#342)", date: "2026-09-23", order: 1 },
    ],
    notes: [],
  },
});

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const route = require("../src/app/api/research-os/work-quiz/route") as typeof import("../src/app/api/research-os/work-quiz/route");

const BASE = "http://localhost/api/research-os/work-quiz";
const get = (q = "") => route.GET(new NextRequest(`${BASE}${q}`), undefined);
const post = () =>
  route.POST(
    new NextRequest(BASE, { method: "POST", body: JSON.stringify({ attemptId: "11111111-1111-4111-8111-111111111111", response: "x" }), headers: { "content-type": "application/json" } }),
    undefined,
  );

async function read(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

test("anonymous callers are refused on every verb", async () => {
  who = null;
  writes = 0;
  for (const res of [await get(), await get("?view=stats"), await post()]) assert.equal(res.status, 401);
  assert.equal(writes, 0);
});

test("signed-in non-staff get 404 and no question or stats", async () => {
  who = LEARNER;
  writes = 0;
  for (const res of [await get(), await get("?view=stats"), await post()]) {
    const out = await read(res);
    assert.equal(out.status, 404);
    assert.deepEqual(out.body, { error: "not_found" });
  }
  assert.equal(writes, 0);
});

test("staff are served a question and stats", async () => {
  who = STAFF;
  writes = 0;
  const out = await read(await get("?mode=manual"));
  assert.equal(out.status, 200);
  assert.equal(out.body.status, "issued");
  assert.ok(out.body.question);
  assert.equal(writes, 1);
  assert.equal(picks, 1);
  assert.equal((await read(await get("?view=stats"))).status, 200);
});
