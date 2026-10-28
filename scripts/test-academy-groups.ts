import test from "node:test";
import assert from "node:assert/strict";
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
  generateInviteCode,
  groupPreview,
  joinDecision,
  memberSummary,
  normalizeDisplayName,
  normalizeGroupName,
  normalizeInviteCode,
  normalizeKind,
  removeDecision,
  validTimeZone,
  type CheerRow,
  type CorpusLookup,
  type WordLookup,
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

test("cheers are capped at three a day per pair and nudges need an idle recipient", () => {
  const ms = [member("a", "2026-10-01", "owner"), member("b", "2026-10-02")];
  const sent = (n: number, at = NOW - 3600_000): CheerRow[] =>
    Array.from({ length: n }, (_, i) => ({ id: `x${i}`, group_id: "g1", from_id: "a", to_id: "b", kind: "cheer", created_at: new Date(at).toISOString(), seen_at: null }));
  assert.equal(cheerDecision(ms, "a", "b", "cheer", sent(2), 5, NOW), "ok");
  assert.equal(cheerDecision(ms, "a", "b", "cheer", sent(3), 5, NOW), "cheer_limit");
  assert.equal(cheerDecision(ms, "a", "b", "cheer", sent(3, NOW - DAY), 5, NOW), "ok");
  assert.equal(cheerDecision(ms, "b", "a", "cheer", sent(3), 5, NOW), "ok");
  assert.equal(cheerDecision(ms, "a", "b", "nudge", [], 1, NOW), "nudge_not_needed");
  assert.equal(cheerDecision(ms, "a", "b", "nudge", [], 0, NOW), "ok");
  assert.equal(cheerDecision(ms, "a", "a", "cheer", [], 0, NOW), "self");
  assert.equal(cheerDecision(ms, "a", "c", "cheer", [], 0, NOW), "not_member");
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

test("day steps follow the calendar across a DST change", () => {
  assert.equal(shiftDay("2026-3-9", -1), "2026-3-8");
  assert.equal(shiftDay("2026-3-1", -1), "2026-2-28");
  assert.equal(shiftDay("2026-12-31", 1), "2027-1-1");
  const justAfter = Date.UTC(2026, 2, 9, 4, 30);
  const rows = [{ branch: "physics", data: { cards: {}, stats: { streak: 6, lastStudyDay: "2026-3-8" } } }];
  assert.equal(memberSummary(rows, lookup, justAfter, "America/New_York").streak, 6);
  const sundayNight = currentWeek(Date.UTC(2026, 2, 9, 3, 30), "America/New_York");
  assert.equal(sundayNight.weekStart, "2026-03-02");
  assert.deepEqual(sundayNight.keys, ["2026-3-8", "2026-3-7", "2026-3-6", "2026-3-5", "2026-3-4", "2026-3-3", "2026-3-2"]);
});

test("cheer limits count UTC days whatever the caller's zone", () => {
  const ms = [member("a", "2026-10-01", "owner"), member("b", "2026-10-02")];
  const lateUtc = Date.UTC(2026, 9, 28, 23, 0);
  const sent: CheerRow[] = [0, 1, 2].map((i) => ({ id: `y${i}`, group_id: "g1", from_id: "a", to_id: "b", kind: "cheer", created_at: new Date(Date.UTC(2026, 9, 28, 1 + i)).toISOString(), seen_at: null }));
  assert.equal(cheerDecision(ms, "a", "b", "cheer", sent, 0, lateUtc), "cheer_limit");
  assert.equal(cheerDecision(ms, "a", "b", "cheer", sent, 0, Date.UTC(2026, 9, 29, 0, 30)), "ok");
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
