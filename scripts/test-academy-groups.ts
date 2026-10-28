import test from "node:test";
import assert from "node:assert/strict";
import { dayKey } from "../src/lib/academy/engine";
import {
  assembleGroup,
  CROCKFORD,
  generateInviteCode,
  groupPreview,
  joinDecision,
  leavePlan,
  memberSummary,
  normalizeDisplayName,
  normalizeGroupName,
  normalizeInviteCode,
  normalizeKind,
  removeDecision,
  validTimeZone,
  type CorpusLookup,
  type GroupRow,
  type MemberRow,
  type MemberSummary,
} from "../src/lib/academy/groups";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 28, 15);
const TODAY = dayKey(NOW, "UTC");
const YESTERDAY = dayKey(NOW - DAY, "UTC");

const card = (stability: number, reps: number, lastReview: number) => ({ state: "review", stability, difficulty: 5, due: lastReview + DAY, lastReview, reps, lapses: 0 });

const lookup: CorpusLookup = (branch) =>
  branch === "physics"
    ? { title: "Physics", corpus: { meta: { branch: "physics", title: "Physics" }, atoms: [{ id: "f-ma", shell: "nucleus" }, { id: "energy", shell: "nucleus" }, { id: "momentum", shell: "frontier" }] } }
    : null;

function member(user: string, joined: string, role: "owner" | "member" = "member", group = "g1"): MemberRow {
  return { group_id: group, user_id: user, role, display_name: user.toUpperCase(), joined_at: joined };
}

test("invite codes are 10 Crockford characters and normalize what people type", () => {
  const code = generateInviteCode();
  assert.equal(code.length, 10);
  for (const ch of code) assert.ok(CROCKFORD.includes(ch));
  assert.equal(generateInviteCode(() => new Uint8Array(10).fill(255)), "ZZZZZZZZZZ");
  assert.equal(normalizeInviteCode("7k3m-9q2x ab"), "7K3M9Q2XAB");
  assert.equal(normalizeInviteCode("oil0000000"), "0110000000");
  assert.equal(normalizeInviteCode("7K3M9Q2XAU"), null);
  assert.equal(normalizeInviteCode("SHORT"), null);
  assert.equal(normalizeInviteCode(42), null);
});

test("names, display names and kinds are trimmed and bounded", () => {
  assert.equal(normalizeGroupName("  The   Rossis "), "The Rossis");
  assert.equal(normalizeGroupName(""), null);
  assert.equal(normalizeGroupName("x".repeat(61)), null);
  assert.equal(normalizeDisplayName("Nonna"), "Nonna");
  assert.equal(normalizeDisplayName("x".repeat(41)), null);
  assert.equal(normalizeKind("family"), "family");
  assert.equal(normalizeKind("team"), null);
  assert.equal(validTimeZone("America/New_York"), "America/New_York");
  assert.equal(validTimeZone("Mars/Base"), undefined);
});

test("joining checks membership, the group cap and the per-user cap", () => {
  const six = ["a", "b", "c", "d", "e", "f"].map((u, i) => member(u, `2026-10-0${i + 1}`));
  assert.equal(joinDecision("family", six, "a", 3), "already");
  assert.equal(joinDecision("family", six, "z", 0), "full");
  assert.equal(joinDecision("friends", six, "z", 0), "ok");
  assert.equal(joinDecision("friends", six, "z", 20), "joined_limit");
});

test("an owner leaving hands the group to the oldest member and the last one deletes it", () => {
  const ms = [member("own", "2026-10-01", "owner"), member("late", "2026-10-09"), member("early", "2026-10-03")];
  assert.deepEqual(leavePlan(ms, "own", "own"), { action: "leave", newOwner: "early" });
  assert.deepEqual(leavePlan(ms, "own", "late"), { action: "leave", newOwner: null });
  assert.deepEqual(leavePlan([member("own", "2026-10-01", "owner")], "own", "own"), { action: "delete" });
  assert.deepEqual(leavePlan(ms, "own", "stranger"), { action: "not_member" });
});

test("only the owner removes members, and never themselves", () => {
  const ms = [member("own", "2026-10-01", "owner"), member("kid", "2026-10-02")];
  assert.equal(removeDecision(ms, "own", "own", "kid"), "ok");
  assert.equal(removeDecision(ms, "own", "kid", "own"), "forbidden");
  assert.equal(removeDecision(ms, "own", "own", "own"), "self");
  assert.equal(removeDecision(ms, "own", "own", "ghost"), "not_member");
});

test("a member summary counts languages across shared memory and system branches", () => {
  const recent = NOW - 2 * 3600_000;
  const rows = [
    {
      branch: "lang-fr",
      data: { lang: "fr", baseline: { cards: { "fr:chat": card(60, 4, recent), "fr:chien": card(2, 1, NOW - 3 * DAY), "es:gato": card(60, 3, recent) } }, log: [], migrated: "v1" },
    },
    {
      branch: "lang-sys-romance",
      data: {
        cards: { "fr:chat": card(1, 1, NOW - 9 * DAY), "es:gato": card(50, 2, NOW - DAY), "es:perro": card(1, 0, NOW - DAY) },
        stats: { xp: 10, streak: 5, lastStudyDay: YESTERDAY, history: { [TODAY]: { new: 1, reviews: 2 } } },
      },
    },
    { branch: "lang-sys-romance.bak-v1", data: { cards: { "it:gatto": card(90, 9, recent) } } },
    { branch: "lang-systems", data: { systems: [] } },
  ];
  const s = memberSummary(rows, lookup, NOW, "UTC");
  assert.deepEqual(s.languages, [
    { lang: "fr", learned: 2, mastered: 1 },
    { lang: "es", learned: 1, mastered: 1 },
  ]);
  assert.equal(s.streak, 5);
  assert.equal(s.todayReviews, 3);
  assert.equal(s.lastActivity, new Date(recent).toISOString());
  assert.deepEqual(s.subjects, []);
});

test("a member summary rolls up subject branches and drops unknown ones", () => {
  const rows = [
    {
      branch: "physics",
      data: {
        cards: { "f-ma": card(200, 6, NOW - DAY), energy: card(1, 1, NOW - DAY) },
        stats: { xp: 30, streak: 2, lastStudyDay: TODAY, history: { [TODAY]: { new: 0, reviews: 4 } } },
      },
    },
    { branch: "mystery", data: { cards: { x: card(200, 3, NOW) }, stats: { streak: 40, lastStudyDay: TODAY } } },
  ];
  const s = memberSummary(rows, lookup, NOW, "UTC");
  assert.deepEqual(s.subjects, [{ branch: "physics", title: "Physics", started: 2, mastered: 1 }]);
  assert.equal(s.streak, 2);
  assert.equal(s.todayReviews, 4);
});

test("a streak lapses after a missed day, matching liveStreak", () => {
  const stale = [{ branch: "physics", data: { cards: { "f-ma": card(5, 1, NOW - 3 * DAY) }, stats: { streak: 9, lastStudyDay: dayKey(NOW - 2 * DAY, "UTC") } } }];
  assert.equal(memberSummary(stale, lookup, NOW, "UTC").streak, 0);
  const empty = memberSummary([], lookup, NOW);
  assert.deepEqual(empty, { streak: 0, todayReviews: 0, lastActivity: null, languages: [], subjects: [] });
});

test("a group lists the owner first, marks me, and fills summaries", () => {
  const group: GroupRow = { id: "g1", name: "The Rossis", kind: "family", owner_id: "mom", invite_code: "7K3M9Q2XAB", created_at: "2026-10-01" };
  const rows = [member("kid", "2026-10-02"), member("mom", "2026-10-05", "member"), member("dad", "2026-10-01"), member("other", "2026-10-01", "owner", "g2")];
  const sum: MemberSummary = { streak: 3, todayReviews: 7, lastActivity: null, languages: [{ lang: "it", learned: 4, mastered: 1 }], subjects: [] };
  const g = assembleGroup(group, rows, new Map([["kid", sum]]), "kid");
  assert.equal(g.code, "7K3M9Q2XAB");
  assert.equal(g.role, "member");
  assert.deepEqual(g.members.map((m) => [m.userId, m.role, m.isMe]), [
    ["mom", "owner", false],
    ["dad", "member", false],
    ["kid", "member", true],
  ]);
  assert.equal(g.members[2].streak, 3);
  assert.equal(g.members[0].todayReviews, 0);
  assert.equal(assembleGroup(group, rows, new Map(), "mom").role, "owner");
  assert.deepEqual(groupPreview(group, rows.slice(0, 3)), { name: "The Rossis", kind: "family", members: 3, owner: "MOM" });
});
