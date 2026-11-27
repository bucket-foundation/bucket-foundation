import "./lobby-test-env";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import * as groups from "../src/lib/academy/groups-server";
import { triviaAllowed, triviaQuestion, triviaScores, triviaSet, triviaView, type TriviaRow } from "../src/lib/academy/lobby-trivia";
import { fakeDb } from "./lobby-fake-db";

const Q = { prompt: "Where did Abuela grow up?", choices: ["Lima", "Quito", "Cusco"], answer: 2 };

test("questions are trimmed and checked, ten at most", () => {
  assert.deepEqual(triviaQuestion({ ...Q, prompt: "  Where did  Abuela grow up? " }), Q);
  assert.equal(triviaQuestion({ ...Q, choices: ["Lima"] }), null);
  assert.equal(triviaQuestion({ ...Q, choices: ["Lima", "lima"] }), null);
  assert.equal(triviaQuestion({ ...Q, answer: 3 }), null);
  assert.equal(triviaQuestion({ ...Q, prompt: "x".repeat(141) }), null);
  assert.equal(triviaSet(Array(10).fill(Q))?.length, 10);
  assert.equal(triviaSet(Array(11).fill(Q)), null);
  assert.equal(triviaSet([]), null);
});

test("only the host saves before play and opens questions in order", () => {
  const row = { current: -1, open: false, questions: [Q, Q] };
  assert.ok(triviaAllowed("save", null, "h", "h"));
  assert.ok(!triviaAllowed("save", null, "p", "h"));
  assert.ok(triviaAllowed("open", row, "h", "h", 0));
  assert.ok(!triviaAllowed("open", row, "h", "h", 1));
  assert.ok(!triviaAllowed("save", { ...row, current: 0 }, "h", "h"));
  assert.ok(triviaAllowed("answer", { ...row, current: 0, open: true }, "p", "h"));
  assert.ok(!triviaAllowed("answer", { ...row, current: 0, open: true }, "h", "h"));
  assert.ok(!triviaAllowed("open", { ...row, current: 1 }, "h", "h", 2));
});

test("players see the answer only after reveal, and open picks do not score yet", () => {
  const row: TriviaRow = { lobby_id: "L", questions: [Q, Q], current: 1, open: true, answers: { "0": { p: 2 }, "1": { p: 2 } }, created_at: "" };
  const v = triviaView(row, "p", "h");
  assert.equal(v.answer, null);
  assert.deepEqual(v.scores, { p: 100 });
  assert.equal(v.questions, null);
  assert.equal(triviaView({ ...row, open: false }, "p", "h").answer, 2);
  assert.deepEqual(triviaScores(row), { p: 200 });
});

const LOBBY = "00000000-0000-4000-8000-0000000000b2";

test("route: host writes, opens and reveals; players answer once and score", async () => {
  const { db, tables } = fakeDb({ lobbies: [{ id: LOBBY, host_id: "h" }], lobby_players: [{ lobby_id: LOBBY, user_id: "h", score: 0 }, { lobby_id: LOBBY, user_id: "p", score: 0 }, { lobby_id: LOBBY, user_id: "q", score: 0 }], lobby_screens: [], lobby_trivia: [] }, { lobby_trivia: ["lobby_id"] });
  const g = groups as unknown as Record<string, unknown>;
  g.service = () => db;
  g.requestUser = async (r: NextRequest) => r.headers.get("x-test-user");
  const route = await import("../src/app/api/academy/lobby-trivia/route");
  const post = async (uid: string, body: Record<string, unknown>) => {
    const r = await route.POST(new NextRequest("http://x/api/academy/lobby-trivia", { method: "POST", headers: { "x-test-user": uid, "content-type": "application/json" }, body: JSON.stringify({ lobbyId: LOBBY, ...body }) }));
    return r.status;
  };
  assert.equal(await post("p", { action: "save", questions: [Q] }), 403);
  assert.equal(await post("h", { action: "save", questions: Array(11).fill(Q) }), 400);
  assert.equal(await post("h", { action: "save", questions: [Q, Q] }), 200);
  assert.equal(await post("p", { action: "answer", pick: 2 }), 403);
  assert.equal(await post("h", { action: "open", index: 0 }), 200);
  assert.equal(await post("p", { action: "answer", pick: 2 }), 200);
  assert.equal(await post("p", { action: "answer", pick: 1 }), 409);
  assert.equal(await post("q", { action: "answer", pick: 0 }), 200);
  assert.equal(await post("h", { action: "reveal" }), 200);
  assert.deepEqual(tables.lobby_players.map((r) => r.score), [0, 100, 0]);
  assert.equal(await post("h", { action: "save", questions: [Q] }), 403);
});
