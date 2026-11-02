import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dayKey } from "../src/lib/academy/engine";
import {
  assembleGroup,
  cardStrength,
  cheerDecision,
  CROCKFORD,
  currentWeek,
  fetchAllPages,
  visibleGroupIds,
  groupGoal,
  memberGraph,
  normalizeCheerKind,
  normalizeWeeklyGoal,
  shiftDay,
  windowLimiter,
  PREVIEW_PER_MINUTE,
  JOIN_PER_MINUTE,
  generateInviteCode,
  groupPreview,
  hiddenUsers,
  missingTable,
  joinBlocked,
  joinDecision,
  memberSummary,
  normalizeDisplayName,
  normalizeGroupName,
  normalizeInviteCode,
  normalizeKind,
  normalizeReportReason,
  removeDecision,
  toBlock,
  validTimeZone,
  type BlockRow,
  type CheerRow,
  type CorpusLookup,
  type WordLookup,
  type GroupRow,
  type MemberRow,
  type MemberSummary,
} from "../src/lib/academy/groups";
import { nameAllowed } from "../src/lib/academy/groups-names";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 28, 15);
const TODAY = dayKey(NOW, "UTC");
const YESTERDAY = dayKey(NOW - DAY, "UTC");

const card = (stability: number, reps: number, lastReview: number) => ({ state: "review", stability, difficulty: 5, due: lastReview + DAY, lastReview, reps, lapses: 0 });

const lookup: CorpusLookup = (branch) =>
  branch === "physics"
    ? {
        title: "Physics",
        corpus: {
          meta: { branch: "physics", title: "Physics" },
          atoms: [
            { id: "f-ma", title: "Newton's laws", shell: "nucleus" },
            { id: "energy", title: "Energy", shell: "nucleus", requires: ["f-ma"] },
            { id: "momentum", title: "Momentum", shell: "frontier", requires: ["f-ma", "energy", "ghost"] },
          ] as never,
        },
      }
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
  assert.deepEqual(s.languages.map(({ lang, learned, mastered }) => ({ lang, learned, mastered })), [
    { lang: "fr", learned: 2, mastered: 1 },
    { lang: "es", learned: 1, mastered: 1 },
  ]);
  assert.ok(s.languages[1].strength > 0.99);
  assert.ok(s.languages[0].strength > 0.5 && s.languages[0].strength < s.languages[1].strength);
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
  assert.deepEqual(s.subjects.map(({ strength, ...rest }) => rest), [{ branch: "physics", title: "Physics", started: 2, mastered: 1 }]);
  assert.ok(s.subjects[0].strength > 0.6 && s.subjects[0].strength < 1);
  assert.equal(s.streak, 2);
  assert.equal(s.todayReviews, 4);
});

test("a streak lapses after a missed day, matching liveStreak", () => {
  const stale = [{ branch: "physics", data: { cards: { "f-ma": card(5, 1, NOW - 3 * DAY) }, stats: { streak: 9, lastStudyDay: dayKey(NOW - 2 * DAY, "UTC") } } }];
  assert.equal(memberSummary(stale, lookup, NOW, "UTC").streak, 0);
  const empty = memberSummary([], lookup, NOW);
  assert.deepEqual(empty, { streak: 0, todayReviews: 0, weekReviews: 0, lastActivity: null, languages: [], subjects: [], recentWords: [], sets: [] });
});

test("a group lists the owner first, marks me, and fills summaries", () => {
  const group: GroupRow = { id: "g1", name: "The Rossis", kind: "family", owner_id: "mom", invite_code: "7K3M9Q2XAB", created_at: "2026-10-01" };
  const rows = [member("kid", "2026-10-02"), member("mom", "2026-10-05", "member"), member("dad", "2026-10-01"), member("other", "2026-10-01", "owner", "g2")];
  const sum: MemberSummary = { streak: 3, todayReviews: 7, weekReviews: 12, lastActivity: null, languages: [{ lang: "it", learned: 4, mastered: 1, strength: 0.8 }], subjects: [], recentWords: [], sets: [] };
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

const words: WordLookup = (lang, itemId) => {
  const table: Record<string, Record<string, string>> = { fr: { chat: "chat", chien: "chien", pain: "pain" }, es: { gato: "gato" } };
  const form = table[lang]?.[itemId];
  return form ? { form, gloss: itemId === "chat" || itemId === "gato" ? "cat" : itemId } : null;
};

test("the week starts on Monday and sums every day since", () => {
  const w = currentWeek(NOW, "UTC");
  assert.equal(w.weekStart, "2026-10-26");
  assert.deepEqual(w.keys, ["2026-10-28", "2026-10-27", "2026-10-26"]);
  assert.equal(currentWeek(Date.UTC(2026, 10, 1, 12), "UTC").weekStart, "2026-10-26");
  const rows = [
    {
      branch: "physics",
      data: { cards: {}, stats: { streak: 1, lastStudyDay: TODAY, history: { [TODAY]: { new: 1, reviews: 2 }, "2026-10-26": { new: 0, reviews: 5 }, "2026-10-25": { new: 9, reviews: 9 } } } },
    },
  ];
  assert.equal(memberSummary(rows, lookup, NOW, "UTC").weekReviews, 8);
});

test("finished games count toward the day and the week", () => {
  const rows = [
    {
      branch: "physics",
      data: { cards: {}, settings: { games: { days: { [TODAY]: 4, "2026-10-26": 3, "2026-10-25": 9 } } }, stats: { streak: 1, lastStudyDay: TODAY, history: {} } },
    },
  ];
  const s = memberSummary(rows, lookup, NOW, "UTC");
  assert.equal(s.todayReviews, 4);
  assert.equal(s.weekReviews, 7);
});

test("strength is retrievability now, falling with time since review", () => {
  assert.equal(cardStrength(undefined, NOW), 0);
  assert.ok(Math.abs(cardStrength(card(10, 2, NOW), NOW) - 1) < 1e-9);
  assert.ok(Math.abs(cardStrength(card(10, 2, NOW - 10 * DAY), NOW) - 0.9) < 1e-9);
});

test("recent words list the latest learned words with form and gloss, newest first", () => {
  const c = (introduced: string, reps: number, last: number) => ({ ...card(5, reps, last), introduced });
  const rows = [
    { branch: "lang-sys-a", data: { cards: { "fr:chat": c("2026-10-20", 3, NOW - DAY), "fr:pain": c("2026-10-27", 1, NOW - 2 * DAY), "fr:chien": c("2026-10-27", 0, NOW), "es:gato": card(5, 1, NOW - 3 * DAY), "fr:unknown": c("2026-10-28", 2, NOW) } } },
  ];
  const s = memberSummary(rows, lookup, NOW, "UTC", words);
  assert.deepEqual(s.recentWords, [
    { lang: "fr", form: "pain", gloss: "pain", learnedAt: "2026-10-27" },
    { lang: "es", form: "gato", gloss: "cat", learnedAt: "2026-10-25" },
    { lang: "fr", form: "chat", gloss: "cat", learnedAt: "2026-10-20" },
  ]);
  const many = { cards: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`fr:w${i}`, card(5, 1, NOW - i * 1000)])) };
  const wide: WordLookup = (_lang, id) => ({ form: id, gloss: id });
  assert.equal(memberSummary([{ branch: "lang-sys-b", data: many }], lookup, NOW, "UTC", wide).recentWords.length, 20);
});

test("sets come from the systems branch and skip removed ones", () => {
  const rows = [
    {
      branch: "lang-systems",
      data: {
        systems: [
          { id: "romance", name: "Romance", root: "en", targets: ["fr", "es"], createdAt: 10, placement: {} },
          { id: "gone", name: "Gone", root: "en", targets: ["de"], createdAt: 10, placement: {} },
        ],
        removed: { gone: 20 },
      },
    },
  ];
  assert.deepEqual(memberSummary(rows, lookup, NOW).sets, [{ id: "romance", name: "Romance", root: "en", targets: ["fr", "es"] }]);
});

test("the canon graph has one node per atom with strength and edges from requires", () => {
  const rows = [{ branch: "physics", data: { cards: { "f-ma": card(10, 3, NOW - 10 * DAY) } } }];
  const g = memberGraph(rows, "physics", lookup, words, NOW);
  assert.ok(g);
  assert.deepEqual(g.nodes.map((n) => [n.id, n.title, n.strength]), [
    ["f-ma", "Newton's laws", 0.9],
    ["energy", "Energy", 0],
    ["momentum", "Momentum", 0],
  ]);
  assert.deepEqual(g.edges, [
    { from: "f-ma", to: "energy" },
    { from: "f-ma", to: "momentum" },
    { from: "energy", to: "momentum" },
  ]);
  assert.equal(memberGraph(rows, "mystery", lookup, words, NOW), null);
});

test("a language graph lists learned words by strength with no edges", () => {
  const rows = [
    { branch: "lang-fr", data: { lang: "fr", baseline: { cards: { "fr:chat": card(10, 2, NOW - 10 * DAY), "fr:pain": card(10, 1, NOW), "fr:chien": card(10, 0, NOW) } }, log: [], migrated: "v1" } },
  ];
  const g = memberGraph(rows, "lang-fr", lookup, words, NOW);
  assert.deepEqual(g, { nodes: [{ id: "pain", title: "pain", strength: 1 }, { id: "chat", title: "chat", strength: 0.9 }], edges: [] });
  assert.deepEqual(memberGraph(rows, "lang-de", lookup, words, NOW), { nodes: [], edges: [] });
});

test("cheer checks cover self, membership and nudges; the daily cap is left to SQL", () => {
  const ms = [member("a", "2026-10-01", "owner"), member("b", "2026-10-02")];
  assert.equal(cheerDecision(ms, "a", "b", "cheer", 5), "ok");
  assert.equal(cheerDecision(ms, "a", "b", "nudge", 1), "nudge_not_needed");
  assert.equal(cheerDecision(ms, "a", "b", "nudge", 0), "ok");
  assert.equal(cheerDecision(ms, "a", "a", "cheer", 0), "self");
  assert.equal(cheerDecision(ms, "a", "c", "cheer", 0), "not_member");
  assert.equal(normalizeCheerKind("nudge"), "nudge");
  assert.equal(normalizeCheerKind("poke"), null);
});

test("the shared goal sums member week reviews and clears at zero", () => {
  assert.deepEqual(groupGoal(50, [12, 8, 0], "2026-10-26"), { weekly: 50, done: 20, weekStart: "2026-10-26" });
  assert.equal(groupGoal(0, [5], "2026-10-26"), null);
  assert.equal(groupGoal(null, [5], "2026-10-26"), null);
  assert.equal(normalizeWeeklyGoal(0), 0);
  assert.equal(normalizeWeeklyGoal(140), 140);
  assert.equal(normalizeWeeklyGoal(2.5), null);
  assert.equal(normalizeWeeklyGoal(-1), null);
  assert.equal(normalizeWeeklyGoal(10001), null);
});

test("a group carries its goal and the cheers I sent or received", () => {
  const group: GroupRow = { id: "g1", name: "Climbers", kind: "friends", owner_id: "a", invite_code: "7K3M9Q2XAB", created_at: "2026-10-01", weekly_goal: 30 };
  const ms = [member("a", "2026-10-01", "owner"), member("b", "2026-10-02"), member("c", "2026-10-03")];
  const sum = (weekReviews: number): MemberSummary => ({ streak: 0, todayReviews: 0, weekReviews, lastActivity: null, languages: [], subjects: [], recentWords: [], sets: [] });
  const cheers: CheerRow[] = [
    { id: "1", group_id: "g1", from_id: "a", to_id: "b", kind: "cheer", created_at: "2026-10-28T10:00:00Z", seen_at: null },
    { id: "2", group_id: "g1", from_id: "c", to_id: "b", kind: "nudge", created_at: "2026-10-28T11:00:00Z", seen_at: "2026-10-28T12:00:00Z" },
    { id: "3", group_id: "g1", from_id: "a", to_id: "c", kind: "cheer", created_at: "2026-10-28T12:00:00Z", seen_at: null },
    { id: "4", group_id: "g2", from_id: "a", to_id: "b", kind: "cheer", created_at: "2026-10-28T13:00:00Z", seen_at: null },
  ];
  const g = assembleGroup(group, ms, new Map([["a", sum(10)], ["b", sum(7)]]), "b", cheers, "2026-10-26");
  assert.deepEqual(g.goal, { weekly: 30, done: 17, weekStart: "2026-10-26" });
  assert.deepEqual(g.cheers, [
    { id: "2", from: "c", fromName: "C", to: "b", kind: "nudge", at: "2026-10-28T11:00:00Z", seen: true },
    { id: "1", from: "a", fromName: "A", to: "b", kind: "cheer", at: "2026-10-28T10:00:00Z", seen: false },
  ]);
  assert.equal(assembleGroup({ ...group, weekly_goal: 0 }, ms, new Map(), "b").goal, null);
});

test("day steps follow the calendar", () => {
  assert.equal(shiftDay("2026-3-9", -1), "2026-3-8");
  assert.equal(shiftDay("2026-3-1", -1), "2026-2-28");
  assert.equal(shiftDay("2026-12-31", 1), "2027-1-1");
});

test("spring forward: yesterday and the week keep every calendar day", () => {
  const justAfter = Date.UTC(2026, 2, 9, 4, 30);
  const rows = [{ branch: "physics", data: { cards: {}, stats: { streak: 6, lastStudyDay: "2026-3-8" } } }];
  assert.equal(memberSummary(rows, lookup, justAfter, "America/New_York").streak, 6);
  const sundayNight = currentWeek(Date.UTC(2026, 2, 9, 3, 30), "America/New_York");
  assert.equal(sundayNight.weekStart, "2026-03-02");
  assert.deepEqual(sundayNight.keys, ["2026-3-8", "2026-3-7", "2026-3-6", "2026-3-5", "2026-3-4", "2026-3-3", "2026-3-2"]);
  const london = currentWeek(Date.UTC(2026, 2, 29, 23, 30), "Europe/London");
  assert.deepEqual(london.keys, ["2026-3-30"]);
});

test("fall back: the 25 hour day does not repeat today as yesterday", () => {
  const lateSunday = Date.UTC(2026, 10, 2, 4, 30);
  const rows = [{ branch: "physics", data: { cards: {}, stats: { streak: 4, lastStudyDay: "2026-10-31" } } }];
  assert.equal(memberSummary(rows, lookup, lateSunday, "America/New_York").streak, 4);
  const week = currentWeek(lateSunday, "America/New_York");
  assert.equal(week.weekStart, "2026-10-26");
  assert.deepEqual(week.keys, ["2026-11-1", "2026-10-31", "2026-10-30", "2026-10-29", "2026-10-28", "2026-10-27", "2026-10-26"]);
  assert.equal(new Set(week.keys).size, 7);
});

test("the window limiter caps each key and frees it after the window", () => {
  let t = 0;
  const limited = windowLimiter(2, 60_000, () => t, 2);
  assert.equal(limited("ip"), false);
  assert.equal(limited("ip"), false);
  assert.equal(limited("ip"), true);
  assert.equal(limited("other"), false);
  t = 60_000;
  assert.equal(limited("ip"), false);
  assert.equal(PREVIEW_PER_MINUTE > JOIN_PER_MINUTE, true);
});

test("groups load only where I am a member", () => {
  const mine = [member("me", "2026-10-01", "member", "g1"), member("me", "2026-10-02", "owner", "g2")];
  assert.deepEqual(visibleGroupIds(mine), ["g1", "g2"]);
  assert.deepEqual(visibleGroupIds(mine, ["g2", "g9"]), ["g2"]);
  assert.deepEqual(visibleGroupIds([], ["g1"]), []);
});

test("paging reads past the 1000 row cap and stops on a short page", async () => {
  const total = 2345;
  const calls: [number, number][] = [];
  const rows = await fetchAllPages(async (from, to) => {
    calls.push([from, to]);
    return Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
  });
  assert.equal(rows.length, total);
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
  const exact = await fetchAllPages(async (from) => (from === 0 ? [1, 2] : []), 2);
  assert.deepEqual(exact, [1, 2]);
  await assert.rejects(fetchAllPages(async () => [1], 1, 3));
});

const OWNER = "00000000-0000-0000-0000-000000000001";
const MATE = "00000000-0000-0000-0000-000000000002";
const OTHER = "00000000-0000-0000-0000-000000000003";

function block(over: Partial<BlockRow>): BlockRow {
  return { id: "b1", blocker_id: MATE, target_user_id: null, target_group_id: null, name: "Name", created_at: "2026-11-01T00:00:00Z", ...over };
}

function row(user: string, role: "owner" | "member" = "member"): MemberRow {
  return { group_id: "g1", user_id: user, role, display_name: user.slice(-1), joined_at: `2026-10-0${user.slice(-1)}T00:00:00Z` };
}

const SUMMARY: MemberSummary = { streak: 0, todayReviews: 0, weekReviews: 10, lastActivity: null, languages: [], subjects: [], recentWords: [], sets: [] };

test("moderation migration keeps reports past deletion and blocks atomically", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261105000100_group_moderation.sql"), "utf8");
  const reports = sql.slice(sql.indexOf("bucket.group_reports ("), sql.indexOf("create index if not exists group_reports_open_idx"));
  assert.match(reports, /target_user_id uuid\s+references auth\.users \(id\) on delete set null/);
  assert.match(reports, /group_id\s+uuid\s+references bucket\.learning_groups \(id\) on delete set null/);
  assert.match(reports, /group_name\s+text\s+not null/);
  assert.doesNotMatch(reports, /cascade/);
  assert.match(sql, /function bucket\.block_member/);
  assert.match(sql, /function bucket\.block_group/);
});

test("missingTable spots an unapplied migration and nothing else", () => {
  assert.equal(missingTable({ code: "PGRST205", message: "Could not find the table 'bucket.group_blocks' in the schema cache" }), true);
  assert.equal(missingTable({ code: "42P01", message: 'relation "bucket.group_blocks" does not exist' }), true);
  assert.equal(missingTable({ message: 'relation "bucket.group_reports" does not exist' }), true);
  assert.equal(missingTable({ code: "42501", message: "permission denied" }), false);
  assert.equal(missingTable({ code: "42703", message: "column group_blocks.name does not exist" }), false);
  assert.equal(missingTable(null), false);
});

test("hiddenUsers hides both sides of a block", () => {
  const rows = [block({ blocker_id: MATE, target_user_id: OTHER }), block({ blocker_id: OWNER, target_user_id: MATE }), block({ blocker_id: MATE, target_group_id: "g9" })];
  assert.deepEqual(Array.from(hiddenUsers(rows, MATE)).sort(), [OWNER, OTHER]);
  assert.deepEqual(Array.from(hiddenUsers(rows, OTHER)), [MATE]);
});

test("joinBlocked covers a blocked owner, a blocking owner and a blocked group", () => {
  const group = { id: "g1", owner_id: OWNER };
  assert.equal(joinBlocked([block({ blocker_id: OWNER, target_user_id: MATE })], MATE, group), true);
  assert.equal(joinBlocked([block({ blocker_id: MATE, target_user_id: OWNER })], MATE, group), true);
  assert.equal(joinBlocked([block({ blocker_id: MATE, target_group_id: "g1" })], MATE, group), true);
  assert.equal(joinBlocked([block({ blocker_id: MATE, target_group_id: "g2" })], MATE, group), false);
  assert.equal(joinBlocked([block({ blocker_id: OTHER, target_user_id: MATE })], MATE, group), false);
});

test("assembleGroup drops hidden members and their cheers and keeps the goal total", () => {
  const group: GroupRow = { id: "g1", name: "G", kind: "friends", owner_id: OWNER, invite_code: "0123456789", created_at: "2026-10-01", weekly_goal: 100 };
  const members = [row(OWNER, "owner"), row(MATE), row(OTHER)];
  const sums = new Map(members.map((m) => [m.user_id, SUMMARY]));
  const cheers: CheerRow[] = [
    { id: "c1", group_id: "g1", from_id: OTHER, to_id: MATE, kind: "cheer", created_at: "2026-10-02", seen_at: null },
    { id: "c2", group_id: "g1", from_id: OWNER, to_id: MATE, kind: "cheer", created_at: "2026-10-03", seen_at: null },
  ];
  const g = assembleGroup(group, members, sums, MATE, cheers, "2026-09-28", new Set([OTHER]));
  assert.deepEqual(g.members.map((m) => m.userId), [OWNER, MATE]);
  assert.deepEqual(g.cheers.map((c) => c.id), ["c2"]);
  assert.equal(g.goal?.done, 30);
});

test("toBlock names the target kind", () => {
  assert.deepEqual(toBlock(block({ id: "b", target_group_id: "g1", name: "N" })), { id: "b", kind: "group", targetId: "g1", name: "N", at: "2026-11-01T00:00:00Z" });
  assert.equal(toBlock(block({ target_user_id: OTHER })).kind, "member");
});

test("normalizeReportReason keeps known reasons", () => {
  assert.equal(normalizeReportReason("spam"), "spam");
  assert.equal(normalizeReportReason("offensive_name"), "offensive_name");
  assert.equal(normalizeReportReason("nope"), null);
  assert.equal(normalizeReportReason(3), null);
});

test("nameAllowed rejects profanity in several spellings", () => {
  for (const name of ["fuck", "F U C K", "fuuuck you", "sh1t", "$hit", "Puta", "PUTÁ", "mierda team", "Scheiße", "n1gger", "the b1tch club", "f.u.c.k"]) {
    assert.equal(nameAllowed(name), false, name);
  }
});

test("nameAllowed keeps ordinary names", () => {
  for (const name of ["Rossi family", "Scunthorpe United", "Bass Players", "Niger Friends", "Cassandra", "Dick Van Dyke", "Essex crew", "Nonna Lucia", "Hannah", "Pushkin readers", "Associates", "José", "田中"]) {
    assert.equal(nameAllowed(name), true, name);
  }
});
