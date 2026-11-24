import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { messageReportDecision, normalizeMessageReport } from "../src/lib/academy/lobbies";
import { fileMessageReport, normalizeBlockChange, type ReportDeps, type ReportRow } from "../src/lib/academy/lobby-reports";

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

function fakeDeps(opts: { allow?: boolean; inserted?: boolean; notifyFails?: boolean; author?: string } = {}) {
  const log = { keys: [] as string[][], inserted: [] as ReportRow[], notified: 0 };
  const deps: ReportDeps = {
    async take(keys) { log.keys.push(keys); return opts.allow ?? true; },
    async memberLobby(_uid, lobbyId) { return { id: lobbyId }; },
    async message(lobbyId, id) { return id === 7 ? { id, lobby_id: lobbyId, user_id: opts.author ?? THEM, body: "rude words" } : null; },
    async targetName() { return "Troll"; },
    async insert(row) { log.inserted.push(row); return opts.inserted ?? true; },
    async notify() { log.notified++; if (opts.notifyFails) throw new Error("no mail"); },
  };
  return { deps, log };
}

test("route stores the report, emails a moderator and promises a 24h review", async () => {
  const { deps, log } = fakeDeps();
  const reply = await fileMessageReport(deps, ME, "203.0.113.9", { lobbyId: LOBBY, messageId: 7, reason: "harassment" });
  assert.equal(reply.status, 200);
  assert.equal(reply.body.reviewWithinHours, 24);
  assert.deepEqual(log.keys[0], [`report:user:${ME}`, "report:ip:203.0.113.9"]);
  assert.equal(log.inserted[0].body, "rude words");
  assert.equal(log.inserted[0].target_name, "Troll");
  assert.equal(log.notified, 1);
});

test("route refuses over the hourly cap before touching the lobby", async () => {
  const { deps, log } = fakeDeps({ allow: false });
  const reply = await fileMessageReport(deps, ME, "unknown", { lobbyId: LOBBY, messageId: 7, reason: "spam" });
  assert.equal(reply.status, 429);
  assert.deepEqual(log.keys[0], [`report:user:${ME}`]);
  assert.equal(log.inserted.length, 0);
});

test("route rejects bad input, missing messages and self reports", async () => {
  assert.equal((await fileMessageReport(fakeDeps().deps, ME, "", { lobbyId: LOBBY, messageId: 7, reason: "nope" })).status, 400);
  assert.equal((await fileMessageReport(fakeDeps().deps, ME, "", { lobbyId: LOBBY, messageId: 8, reason: "spam" })).status, 404);
  assert.equal((await fileMessageReport(fakeDeps({ author: ME }).deps, ME, "", { lobbyId: LOBBY, messageId: 7, reason: "spam" })).status, 400);
});

test("a duplicate report is not emailed twice and a mail failure still stores it", async () => {
  const dup = fakeDeps({ inserted: false });
  assert.equal((await fileMessageReport(dup.deps, ME, "", { lobbyId: LOBBY, messageId: 7, reason: "spam" })).status, 200);
  assert.equal(dup.log.notified, 0);
  const down = fakeDeps({ notifyFails: true });
  assert.equal((await fileMessageReport(down.deps, ME, "", { lobbyId: LOBBY, messageId: 7, reason: "spam" })).status, 200);
});

test("block changes need another player and a name to block", () => {
  assert.deepEqual(normalizeBlockChange({ userId: THEM, name: " Troll ", blocked: true }, ME), { userId: THEM, name: "Troll", blocked: true });
  assert.deepEqual(normalizeBlockChange({ userId: THEM, blocked: false }, ME), { userId: THEM, name: "Player", blocked: false });
  assert.equal(normalizeBlockChange({ userId: ME, name: "me", blocked: true }, ME), null);
  assert.equal(normalizeBlockChange({ userId: THEM, blocked: true }, ME), null);
});

test("account delete and guest merge cover reports and blocks", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261123140000_polingual_lobby_message_reports.sql"), "utf8");
  const merge = sql.slice(sql.indexOf("function bucket.merge_lobby_guest"), sql.indexOf("function bucket.delete_lobby_user"));
  assert.match(merge, /update bucket\.lobby_message_reports set reporter_id = p_user/);
  assert.match(merge, /update bucket\.lobby_chat_blocks set blocker_id = p_user/);
  const del = sql.slice(sql.indexOf("function bucket.delete_lobby_user"));
  assert.match(del, /delete from bucket\.lobby_message_reports where reporter_id = p_user or target_user_id = p_user/);
  assert.match(del, /delete from bucket\.lobby_chat_blocks where blocker_id = p_user or target_user_id = p_user/);
  assert.match(sql, /function bucket\.review_lobby_report/);
});

test("the report table is closed to clients and dedupes per reporter and message", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261123140000_polingual_lobby_message_reports.sql"), "utf8");
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on bucket\.lobby_message_reports, bucket\.lobby_chat_blocks, bucket\.lobby_report_limits from public, anon, authenticated/);
  assert.match(sql, /unique \(reporter_id, message_id\)/);
  assert.match(sql, /'offensive_name', 'harassment', 'spam', 'other'/);
});
