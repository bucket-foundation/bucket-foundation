import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { messageReportDecision, normalizeMessageReport } from "../src/lib/academy/lobbies";

const LOBBY = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const THEM = "33333333-3333-4333-8333-333333333333";

test("message reports need a lobby, a positive message id and a known reason", () => {
  assert.deepEqual(normalizeMessageReport({ lobbyId: LOBBY, messageId: 7, reason: "harassment" }), { lobbyId: LOBBY, messageId: 7, reason: "harassment" });
  assert.equal(normalizeMessageReport({ lobbyId: LOBBY, messageId: 7, reason: "rude" }), null);
  assert.equal(normalizeMessageReport({ lobbyId: LOBBY, messageId: 0, reason: "spam" }), null);
  assert.equal(normalizeMessageReport({ lobbyId: LOBBY, messageId: "7", reason: "spam" }), null);
  assert.equal(normalizeMessageReport({ lobbyId: "x", messageId: 7, reason: "spam" }), null);
  assert.equal(normalizeMessageReport(null), null);
});

test("a report targets another player's message in the same lobby", () => {
  const report = { lobbyId: LOBBY, messageId: 7, reason: "spam" as const };
  assert.equal(messageReportDecision(ME, report, { lobby_id: LOBBY, user_id: THEM }), "ok");
  assert.equal(messageReportDecision(ME, report, { lobby_id: LOBBY, user_id: ME }), "self");
  assert.equal(messageReportDecision(ME, report, { lobby_id: THEM, user_id: THEM }), "not_found");
  assert.equal(messageReportDecision(ME, report, null), "not_found");
});

test("the report table is closed to clients and dedupes per reporter and message", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261123140000_polingual_lobby_message_reports.sql"), "utf8");
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on bucket\.lobby_message_reports from public, anon, authenticated/);
  assert.match(sql, /unique \(reporter_id, message_id\)/);
  assert.match(sql, /'offensive_name', 'harassment', 'spam', 'other'/);
});
