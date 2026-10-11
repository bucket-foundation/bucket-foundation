import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLimits, LIMITS } from "../../../src/lib/research-os/work-quiz/limits";
import type { QuizQuestion } from "../../../src/lib/research-os/work-quiz/types";
import pack from "../content/pack.json" with { type: "json" };
import type { ChatScan } from "../src/chat-sources";
import { newDataKey } from "../src/crypto";
import { CRITIC_DIR_ENV, criticDir, lessonFill, readCriticQuiz } from "../src/daily-fill";
import { DAILY_MAX, DAILY_MIN } from "../src/daily-quiz";
import type { Item } from "../src/grade";
import { notifyState, settingsRoutes } from "../src/settings";
import { Store } from "../src/store";
import { parseStamp, VERSION } from "../src/version";
import { WorkQuizStore, workQuizRoutes, type WorkQuizOptions } from "../src/work-quiz";

const AT = Date.parse("2026-10-11T09:00:00");
const DAY = "2026-10-11";
const PACK = pack as unknown as { version: string; items: Item[] };
const CRITIC = [
  { id: "critic-1", type: "recall", prompt: "Which branch takes desktop PRs?", choices: ["dev", "main", "ops"], answer: "dev", limitSec: 30, explain: "Desktop work targets dev." },
  { id: "critic-2", type: "estimate", prompt: "How many tests ran in the suite?", answer: "600", log10Tolerance: 1, limitSec: 60, explain: "About six hundred." },
];
const NO_CHATS: ChatScan = { stubs: [], counts: { files: 0, bytes: 0, dropped: 0, skipped: 0, timedOut: false } };
const ONE_CHAT: ChatScan = { stubs: [{ id: "a".repeat(16), root: "claude", label: "Wire the Fermi grader into the daily route", date: "2026-10-10", turns: 7 }], counts: { ...NO_CHATS.counts, files: 1 } };

let dir: string;
let critics: string;
let logs: string[];
const stores: Store[] = [];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-fill-"));
  critics = join(dir, "bucket-daily");
  logs = [];
});
afterEach(() => {
  for (const s of stores.splice(0)) s.close();
  rmSync(dir, { recursive: true, force: true });
});

function open(name = "bkt.db", lessons = true) {
  const key = newDataKey();
  const store = new Store(join(dir, name), key);
  stores.push(store);
  if (lessons) store.importPack(PACK.version, PACK.items);
  return { store, key, wq: new WorkQuizStore(store, key) };
}

function routesFor(wq: WorkQuizStore, o: WorkQuizOptions = {}) {
  const offline = async () => {
    throw new TypeError("connection refused");
  };
  return workQuizRoutes(wq, { now: () => AT, home: dir, criticDir: critics, log: (l) => logs.push(l), writer: { fetch: offline }, ...o });
}

async function daily(routes: ReturnType<typeof workQuizRoutes>, day = DAY) {
  const res = await routes["GET /local/work-quiz/daily"](new Request("http://x"), new URL(`http://x/?day=${day}`));
  return { status: res.status, body: (await res.json()) as { questions: { id: string; origin?: string; choices: string[] | null }[]; error?: string } };
}

const chatOn = (routes: ReturnType<typeof workQuizRoutes>) =>
  routes["POST /local/work-quiz/chat"](new Request("http://x", { method: "POST", body: JSON.stringify({ claude: true, codex: false }) }), new URL("http://x/"));

function plant(body: unknown, day = DAY) {
  mkdirSync(join(critics, day), { recursive: true });
  writeFileSync(join(critics, day, "quiz.json"), typeof body === "string" ? body : JSON.stringify(body));
}

function expectValid(stored: QuizQuestion[]) {
  expect(stored.length).toBeGreaterThanOrEqual(DAILY_MIN);
  expect(stored.length).toBeLessThanOrEqual(DAILY_MAX);
  for (const q of stored) {
    expect({ id: q.id, over: checkLimits(q) }).toEqual({ id: q.id, over: [] });
    if (q.choices) expect(q.choices.length).toBe(LIMITS.choices);
    expect(q.origin).toBeTruthy();
  }
  expect(new Set(stored.map((q) => q.id)).size).toBe(stored.length);
}

describe("daily quiz fill", () => {
  test("with both chat switches off and no work sources the quiz fills from lessons", async () => {
    const { wq } = open();
    const got = await daily(routesFor(wq));
    expect(got.status).toBe(200);
    expect(got.body.questions.length).toBe(DAILY_MAX);
    expect(got.body.questions.map((q) => q.origin)).toEqual(Array(DAILY_MAX).fill("lesson"));
    const stored = wq.daily.get(DAY)!.questions;
    expectValid(stored);
    expect(stored.every((q) => q.sources[0].kind === "atom")).toBe(true);
    expect(wq.chat()).toEqual({ claude: false, codex: false });
    expect(wq.coverage().filter((r) => r.factId.startsWith("atom:")).length).toBe(DAILY_MAX);
  });

  test("a chat that yields one question leads and the fill completes the quiz", async () => {
    const { wq } = open();
    const routes = routesFor(wq, { readChats: () => ONE_CHAT });
    wq.setChat({ claude: true, codex: false });
    const got = await daily(routes);
    expect(got.status).toBe(200);
    const origins = got.body.questions.map((q) => q.origin);
    const chats = origins.filter((o) => o === "chat").length;
    expect(chats).toBeGreaterThanOrEqual(1);
    expect(chats).toBeLessThan(DAILY_MAX);
    expect(origins.slice(0, chats)).toEqual(Array(chats).fill("chat"));
    expect(origins.slice(chats).every((o) => o === "lesson")).toBe(true);
    expect(got.body.questions.length).toBe(DAILY_MAX);
    expectValid(wq.daily.get(DAY)!.questions);
  });

  test("chats that are on and yield nothing still leave a filled quiz", async () => {
    const { wq } = open();
    wq.setChat({ claude: true, codex: true });
    const got = await daily(routesFor(wq, { readChats: () => NO_CHATS }));
    expect(got.body.questions.map((q) => q.origin)).toEqual(Array(DAILY_MAX).fill("lesson"));
  });

  test("a valid critic file leads the quiz", async () => {
    const { wq } = open();
    plant({ day: DAY, questions: CRITIC });
    const got = await daily(routesFor(wq));
    expect(got.body.questions.map((q) => q.id).slice(0, 2)).toEqual(["critic-1", "critic-2"]);
    expect(got.body.questions.map((q) => q.origin)).toEqual(["critic", "critic", "lesson", "lesson", "lesson"]);
    expectValid(wq.daily.get(DAY)!.questions);
    expect(logs).toEqual([]);
  });

  test("a malformed critic file is skipped with one plain line and the quiz still fills", async () => {
    const { wq } = open();
    plant("{ not json");
    const got = await daily(routesFor(wq));
    expect(got.status).toBe(200);
    expect(got.body.questions.every((q) => q.origin === "lesson")).toBe(true);
    expect(logs).toEqual([`daily quiz ${DAY}: critic quiz skipped: quiz.json is not JSON`]);
  });

  test("the critic reader keeps the good questions and names each one it drops", () => {
    plant({ day: DAY, questions: [CRITIC[0], { ...CRITIC[0], id: "two", choices: ["dev", "main"] }, { ...CRITIC[0], id: "long", prompt: Array(40).fill("word").join(" ") }, CRITIC[0], 7] });
    const got = readCriticQuiz(DAY, critics);
    expect(got.questions.map((q) => [q.id, q.origin])).toEqual([["critic-1", "critic"]]);
    expect(got.skipped).toHaveLength(4);
    expect(got.skipped[0]).toContain("needs exactly 3 choices");
    plant({ day: "2026-10-10", questions: CRITIC });
    expect(readCriticQuiz(DAY, critics)).toEqual({ questions: [], skipped: ["quiz.json is for another day"] });
    plant({ day: DAY, questions: [] });
    expect(readCriticQuiz(DAY, critics).skipped).toEqual(["quiz.json holds no questions"]);
    plant("x".repeat(300 * 1024));
    expect(readCriticQuiz(DAY, critics).skipped).toEqual(["quiz.json is larger than 256 KB"]);
    expect(readCriticQuiz("2026-10-12", critics)).toEqual({ questions: [], skipped: [] });
    expect(readCriticQuiz("../etc", critics)).toEqual({ questions: [], skipped: [] });
    expect(criticDir({ [CRITIC_DIR_ENV]: "/tmp/x" }, "/home/ada")).toBe("/tmp/x");
    expect(criticDir({}, "/home/ada")).toBe("/home/ada/.local/share/bucket-daily");
  });

  test("a critic file that arrives after the first build joins an unanswered quiz", async () => {
    const { wq } = open();
    const routes = routesFor(wq);
    expect((await daily(routes)).body.questions.every((q) => q.origin === "lesson")).toBe(true);
    plant({ day: DAY, questions: CRITIC });
    const again = await daily(routes);
    expect(again.body.questions.slice(0, 2).map((q) => q.id)).toEqual(["critic-1", "critic-2"]);
    const kept = again.body.questions.map((q) => q.id);
    expect((await daily(routes)).body.questions.map((q) => q.id)).toEqual(kept);
  });

  test("turning a chat switch on rebuilds an unanswered quiz with the chat questions first", async () => {
    const { wq } = open();
    const routes = routesFor(wq, { readChats: () => ONE_CHAT });
    expect((await daily(routes)).body.questions.every((q) => q.origin === "lesson")).toBe(true);
    await chatOn(routes);
    expect((await daily(routes)).body.questions[0].origin).toBe("chat");
  });

  test("the same day and store give the same quiz", async () => {
    const a = open("a.db");
    const b = open("b.db");
    plant({ day: DAY, questions: CRITIC });
    const first = await daily(routesFor(a.wq));
    const second = await daily(routesFor(b.wq));
    expect(first.body.questions).toEqual(second.body.questions);
    expect(a.wq.daily.get(DAY)!.questions).toEqual(b.wq.daily.get(DAY)!.questions);
    expect((await daily(routesFor(a.wq))).body.questions).toEqual(first.body.questions);
  });

  test("lessons come least seen first and an overdue lesson card returns as review", async () => {
    const { wq } = open();
    const first = wq.daily.get(DAY) ?? (await daily(routesFor(wq)), wq.daily.get(DAY)!);
    const missed = first.questions[0];
    wq.record(missed, false, 1, 1000, AT);
    const later = AT + 3 * 86_400_000;
    const next = await daily(workQuizRoutes(wq, { now: () => later, home: dir, criticDir: critics, log: () => {} }), "2026-10-14");
    expect(next.body.questions[0]).toMatchObject({ id: missed.id, origin: "review" });
    const seen = new Set(first.questions.map((q) => q.id));
    expect(next.body.questions.slice(1).some((q) => seen.has(q.id))).toBe(false);
    expectValid(wq.daily.get("2026-10-14")!.questions);
  });

  test("a store with no lessons and no sources still builds nothing", async () => {
    const { wq } = open("empty.db", false);
    const got = await daily(routesFor(wq));
    expect([got.status, got.body.error]).toEqual([404, "no quiz for that day"]);
    expect(lessonFill({ day: DAY, items: [], count: 5 })).toEqual({ questions: [], picks: [] });
  });
});

describe("settings route and version", () => {
  test("the settings route reports the version, the data folder and the notification timer", async () => {
    const timers = join(dir, "timers");
    mkdirSync(timers);
    const get = async () => (await settingsRoutes({ dataDir: dir, timerDir: timers, version: "9.9.9", build: { commit: "abcdef123", date: "2026-10-08" } })["GET /local/settings"](new Request("http://x"), new URL("http://x/"))).json();
    expect(await get()).toEqual({ version: "9.9.9", build: { commit: "abcdef123", date: "2026-10-08" }, dataDir: dir, notify: { supported: true, on: false, at: null }, notifyDefault: "08:53" });
    writeFileSync(join(timers, "bkt-quiz-notify.timer"), "[Timer]\nOnCalendar=*-*-* 07:30:00\nPersistent=true\n");
    expect(notifyState(timers)).toEqual({ supported: true, on: true, at: "07:30" });
    expect(notifyState(null)).toEqual({ supported: false, on: false, at: null });
  });

  test("the version comes from the package file, every package agrees, and a build stamp parses", () => {
    const root = join(import.meta.dir, "..", "..");
    const read = (p: string) => readFileSync(join(root, p), "utf8");
    const own = JSON.parse(read("bkt/package.json")).version as string;
    expect(VERSION).toBe(own);
    expect(own).toMatch(/^\d+\.\d+\.\d+$/);
    expect(JSON.parse(read("bkt-desktop/package.json")).version).toBe(own);
    expect(JSON.parse(read("bkt-desktop/src-tauri/tauri.conf.json")).version).toBe(own);
    expect(read("bkt-desktop/src-tauri/Cargo.toml")).toContain(`name = "bucket-desktop"\nversion = "${own}"`);
    const tags = Bun.spawnSync(["git", "tag", "--list", "bkt-v*", "--merged", "HEAD"], { cwd: root }).stdout.toString().split("\n").filter(Boolean);
    const num = (v: string) => v.split(".").reduce((n, p) => n * 1000 + Number(p), 0);
    for (const t of tags) expect(num(own)).toBeGreaterThanOrEqual(num(t.slice("bkt-v".length)));
    expect(parseStamp("e61d7174b 2026-10-08")).toEqual({ commit: "e61d7174b", date: "2026-10-08" });
    expect(parseStamp("")).toBeNull();
    expect(parseStamp(undefined)).toBeNull();
  });
});
