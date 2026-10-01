import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHAT_CAPS, CHAT_OFF, chatRoot, localDay, MAX_LABEL, readChatSources, userText, type FactStub } from "../src/chat-sources";
import { newDataKey } from "../src/crypto";
import { parseDailyQuiz } from "../src/daily-quiz";
import { askModel, loopbackUrl, modelPrompt, templateQuestions, writeDailyQuiz, WriterError, type Fetcher } from "../src/quiz-writer";
import { scanLines, secretLine } from "../src/secret-scan";
import { startServe, type Serve } from "../src/serve";
import { Store } from "../src/store";
import { WorkQuizStore, workQuizRoutes } from "../src/work-quiz";

const FIXTURES = join(import.meta.dir, "fixtures", "chat");
const NOW = Date.parse("2026-09-30T12:00:00Z");
const DAY = localDay(NOW);
const BOTH = { claude: true, codex: true };
const PLANTED = [
  "sk-FAKEfixture0000000000000000",
  "ghp_FAKEfixture00000000000000000000",
  "AKIAFAKEFIXTURE00000",
  "FAKEpassword",
  "eyJGQUtFZml4dHVyZQ",
  "FAKEfixtureFAKEfixtureFAKEfixture",
  "plain looking line inside the block",
  "xoxb-FAKE-fixture",
  "figd_FAKEfixture",
  "9f86d081884c7a659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "OPENAI_API_KEY",
  "DATABASE_URL",
];
const CLAUDE_LABEL = "Wire the Fermi grader into the daily quiz route";
const CODEX_LABEL = "Refactor the deep link parser into a pure function";

const clean = (text: string) => PLANTED.filter((p) => text.includes(p));

let home: string;
let outside: string;

function plant(rel: string, fixture: string, at = NOW) {
  const path = join(home, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  copyFileSync(join(FIXTURES, fixture), path);
  utimesSync(path, at / 1000, at / 1000);
  return path;
}

function session(rel: string, text: string, at = NOW) {
  const path = join(home, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ type: "user", message: { role: "user", content: text }, timestamp: new Date(at).toISOString() })}\n`);
  utimesSync(path, at / 1000, at / 1000);
  return path;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "bkt-chat-home-"));
  outside = mkdtempSync(join(tmpdir(), "bkt-chat-out-"));
});
afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

function plantAll() {
  plant(".claude/projects/project-a/session.jsonl", "claude-session.jsonl");
  plant(".claude/projects/project-a/secrets.jsonl", "secrets-only.jsonl");
  plant(".codex/sessions/2026/09/29/rollout.jsonl", "codex-session.jsonl");
}

describe("secret scan", () => {
  test("drops token, key and env shapes and keeps plain text", () => {
    for (const bad of [
      "use sk-FAKEfixture0000000000000000 here",
      "ghp_FAKEfixture00000000000000000000",
      "github_pat_FAKEfixture0000000000",
      "aws AKIAFAKEFIXTURE00000 id",
      "xoxb-FAKE-fixture-0000000000",
      "figd_FAKEfixture0000000000000000",
      "eyJGQUtFZml4dHVyZQ.eyJGQUtFZml4dHVyZQ.FAKEsig",
      "-----BEGIN RSA PRIVATE KEY-----",
      "DATABASE_URL=postgres://127.0.0.1/db",
      "  export FOO=bar",
      'the "api_key": "abc" field',
      "password: hunter2",
      "Authorization: Bearer abcdefghijklmnop",
      "clone https://fixture:FAKEpassword@example.test/repo",
      "mail someone@example.test about it",
      "hash 9f86d081884c7a659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "the db password is correct-horse-battery",
      "password hunter2",
      "my passphrase was open sesame",
      "set the token to tulip-garden",
      "sk_live_FAKE0000",
      "rk_live_FAKE0000",
      "whsec_FAKEfixture",
      "hf_FAKEfixture00",
      "SG.FAKEfixture.FAKE",
      "post to https://hooks.slack.com/services/T000/B000/FAKE",
      "short id a1b2c3d4e5f6a7b8c9d0 here",
      "ghp_FAKE0000",
    ])
      expect([bad, secretLine(bad)]).toEqual([bad, true]);
    for (const ok of [CLAUDE_LABEL, CODEX_LABEL, "Open packages/bkt/src/work-quiz.ts and read the daily route", "How many of the 200 files changed since 2026-09-28?",
      "The key file sits next to the token count table",
      "Add a secret scan to the reader and keep the password field hidden",
      "The key is to read the plan before the branch feat/desktop-quiz-2-sources",
      "Use scikit sk-learn for the fit",
    ])
      expect([ok, secretLine(ok)]).toEqual([ok, false]);
  });

  test("drops every line inside a PEM block", () => {
    const scan = scanLines("before the key\n-----BEGIN OPENSSH PRIVATE KEY-----\nshort\nplain looking line inside the block\n-----END OPENSSH PRIVATE KEY-----\nafter the key");
    expect(scan.kept).toEqual(["before the key", "after the key"]);
    expect(scan.dropped).toBe(4);
  });

  test("a key split across two lines drops both lines", () => {
    expect(scanLines("first plain line of text\nthe deploy key is ghp_FA\nKEfixture0000 for now\nlast plain line of text").kept).toEqual(["first plain line of text", "last plain line of text"]);
    expect(scanLines("the password\nis correct-horse-battery").kept).toEqual([]);
    expect(scanLines("Wire the Fermi grader\ninto the daily quiz route").dropped).toBe(0);
  });
});

describe("chat sources", () => {
  test("both roots are off by default and nothing is read", () => {
    plantAll();
    expect(readChatSources(CHAT_OFF, { home, now: NOW })).toEqual({ stubs: [], counts: { files: 0, bytes: 0, dropped: 0, skipped: 0, timedOut: false } });
    const store = new Store(":memory:", newDataKey());
    expect(new WorkQuizStore(store, newDataKey()).chat()).toEqual(CHAT_OFF);
    store.close();
  });

  test("one switch reads one root", () => {
    plantAll();
    expect(readChatSources({ claude: false, codex: true }, { home, now: NOW }).stubs.map((s) => s.root)).toEqual(["codex"]);
  });

  test("fixture sessions become stubs with no planted secret", () => {
    plantAll();
    const { stubs, counts } = readChatSources(BOTH, { home, now: NOW });
    const byRoot = Object.fromEntries(stubs.map((s) => [s.root, s]));
    expect(stubs.length).toBe(2);
    expect(byRoot.claude).toMatchObject({ label: CLAUDE_LABEL, turns: 2, date: localDay(Date.parse("2026-09-30T10:01:00Z")) });
    expect(byRoot.codex).toMatchObject({ label: CODEX_LABEL, turns: 1, date: localDay(Date.parse("2026-09-29T08:01:00Z")) });
    expect(stubs.every((s) => /^[0-9a-f]{16}$/.test(s.id) && s.label.length <= MAX_LABEL)).toBe(true);
    expect(Object.keys(stubs[0]).sort()).toEqual(["date", "id", "label", "root", "turns"]);
    expect(clean(JSON.stringify(stubs))).toEqual([]);
    expect(counts.files).toBe(3);
    expect(counts.dropped).toBeGreaterThanOrEqual(9);
  });

  test("a long first line is cut to 80 characters", () => {
    session(".claude/projects/p/long.jsonl", "word ".repeat(60));
    expect(readChatSources(BOTH, { home, now: NOW }).stubs[0].label.length).toBe(MAX_LABEL);
  });

  test("assistant and tool entries yield no text", () => {
    expect(userText({ type: "assistant", message: { role: "assistant", content: "x" } })).toBeNull();
    expect(userText({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "x" }] } })).toBeNull();
    expect(userText({ type: "user", isSidechain: true, message: { role: "user", content: "x" } })).toBeNull();
  });

  test("symlinked files and folders are skipped", () => {
    plant(".claude/projects/p/real.jsonl", "claude-session.jsonl");
    const elsewhere = session("elsewhere/target.jsonl", "A session that sits outside the root folder");
    symlinkSync(elsewhere, join(home, ".claude/projects/p/link.jsonl"));
    mkdirSync(join(outside, "dir"));
    writeFileSync(join(outside, "dir", "far.jsonl"), readFileSync(elsewhere));
    symlinkSync(join(outside, "dir"), join(home, ".claude/projects/linked-dir"));
    const { stubs, counts } = readChatSources(BOTH, { home, now: NOW });
    expect(stubs.map((s) => s.label)).toEqual([CLAUDE_LABEL]);
    expect(counts.skipped).toBe(2);
  });

  test("a root that resolves outside home through a symlinked parent is refused", () => {
    mkdirSync(join(outside, "projects"));
    writeFileSync(join(outside, "projects", "far.jsonl"), `${JSON.stringify({ type: "user", message: { role: "user", content: "A session that sits outside the home folder" } })}\n`);
    utimesSync(join(outside, "projects", "far.jsonl"), NOW / 1000, NOW / 1000);
    symlinkSync(outside, join(home, ".claude"));
    expect(chatRoot("claude", home)).toBeNull();
    expect(readChatSources(BOTH, { home, now: NOW }).stubs).toEqual([]);
    expect(chatRoot("codex", home)).toBeNull();
  });

  test("a root that is a symlink is refused, inside home or at home itself", () => {
    session("elsewhere/inside.jsonl", "A session behind a root symlinked inside home");
    mkdirSync(join(home, ".claude"));
    symlinkSync(join(home, "elsewhere"), join(home, ".claude/projects"));
    mkdirSync(join(home, ".codex"));
    symlinkSync(home, join(home, ".codex/sessions"));
    expect(chatRoot("claude", home)).toBeNull();
    expect(chatRoot("codex", home)).toBeNull();
    expect(readChatSources(BOTH, { home, now: NOW })).toEqual({ stubs: [], counts: { files: 0, bytes: 0, dropped: 0, skipped: 0, timedOut: false } });
  });

  test("files older than two days are skipped", () => {
    session(".claude/projects/p/old.jsonl", "A session from three days before the run", NOW - 3 * 86_400_000);
    session(".claude/projects/p/new.jsonl", "A session from one day before the run", NOW - 86_400_000);
    expect(readChatSources(BOTH, { home, now: NOW }).stubs.map((s) => s.label)).toEqual(["A session from one day before the run"]);
  });

  test("a file over 8 MB is skipped", () => {
    const big = session(".claude/projects/p/big.jsonl", "A session that grows past the file cap");
    writeFileSync(big, Buffer.concat([readFileSync(big), Buffer.alloc(CHAT_CAPS.fileBytes, 0x20)]));
    utimesSync(big, NOW / 1000, NOW / 1000);
    const { stubs, counts } = readChatSources(BOTH, { home, now: NOW });
    expect([stubs.length, counts.files, counts.skipped]).toEqual([0, 0, 1]);
  });

  test("the file count and total size caps hold", () => {
    for (let i = 0; i < 5; i++) session(`.claude/projects/p/s${i}.jsonl`, `Session number ${i} of the cap test`, NOW - i * 1000);
    const three = readChatSources(BOTH, { home, now: NOW, caps: { files: 3 } });
    expect([three.counts.files, three.counts.skipped, three.stubs.length]).toEqual([3, 2, 3]);
    expect(three.stubs[0].label).toBe("Session number 0 of the cap test");
    const size = readFileSync(join(home, ".claude/projects/p/s0.jsonl")).length;
    const small = readChatSources(BOTH, { home, now: NOW, caps: { bytes: size * 2 } });
    expect(small.counts.files).toBe(2);
    expect(small.counts.bytes).toBeLessThanOrEqual(size * 2);
    expect(CHAT_CAPS).toEqual({ days: 2, files: 200, bytes: 64 * 1024 * 1024, fileBytes: 8 * 1024 * 1024, ms: 3000 });
  });

  test("the wall time cap stops the run", () => {
    for (let i = 0; i < 5; i++) session(`.claude/projects/p/s${i}.jsonl`, `Session number ${i} of the time test`);
    let t = 0;
    const run = readChatSources(BOTH, { home, now: NOW, clock: () => (t += 1000) });
    expect(run.counts.timedOut).toBe(true);
    expect(run.counts.files).toBeLessThan(5);
  });
});

const STUBS: FactStub[] = [
  { id: "aaaaaaaaaaaaaaaa", root: "claude", label: CLAUDE_LABEL, date: "2026-09-30", turns: 12 },
  { id: "bbbbbbbbbbbbbbbb", root: "codex", label: CODEX_LABEL, date: "2026-09-29", turns: 4 },
  { id: "cccccccccccccccc", root: "claude", label: "Draft the README exception for the two roots", date: "2026-09-30", turns: 30 },
];
const POISON: FactStub = { id: "dddddddddddddddd", root: "claude", label: "push with ghp_FAKEfixture00000000000000000000", date: "2026-09-30", turns: 1 };

const reply = (questions: unknown): Fetcher => async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ questions }) } }] }));
const GOOD = {
  stub: "aaaaaaaaaaaaaaaa",
  prompt: "Which grader did the session wire into the daily quiz route?",
  choices: ["Fermi", "Exact match", "Rubric", "Peer"],
  answer: "Fermi",
  explain: "The session began with the Fermi grader.",
};

describe("question writer", () => {
  test("templates are deterministic, valid and need no model", () => {
    const a = templateQuestions(DAY, STUBS);
    expect(a).toEqual(templateQuestions(DAY, [...STUBS].reverse()));
    expect(a.length).toBe(5);
    expect(parseDailyQuiz({ day: DAY, questions: a }).questions.length).toBe(5);
    expect(a[0]).toMatchObject({ id: "chat-sessions", answer: "3", log10Tolerance: 0.5 });
    expect(a[1]).toMatchObject({ id: "chat-messages", answer: "46" });
    expect(templateQuestions(DAY, [])).toEqual([]);
  });

  test("a stub whose label holds a secret reaches no question and no prompt", () => {
    expect(clean(JSON.stringify(templateQuestions(DAY, [...STUBS, POISON], 20)))).toEqual([]);
    const prompt = modelPrompt([...STUBS, POISON], 5);
    expect(clean(prompt)).toEqual([]);
    expect(prompt).toContain(CLAUDE_LABEL);
  });

  test("the model address must be loopback", () => {
    expect(loopbackUrl("http://127.0.0.1:11435").port).toBe("11435");
    expect(loopbackUrl("http://[::1]:11435").hostname).toBe("[::1]");
    for (const bad of ["https://127.0.0.1:11435", "http://localhost:11435", "http://127.0.0.1.example.test", "http://10.0.0.5:11435", "http://user:pw@127.0.0.1:11435", "file:///etc/passwd", "nope"])
      expect(() => loopbackUrl(bad)).toThrow(WriterError);
  });

  test("a reachable model writes questions and templates fill the rest", async () => {
    const seen: { url: string; body: string; redirect: unknown }[] = [];
    const fetcher: Fetcher = async (url, init) => {
      seen.push({ url, body: String(init.body), redirect: init.redirect });
      return reply([GOOD, { ...GOOD, stub: "unknown" }, { ...GOOD, answer: "Absent" }])(url, init);
    };
    const w = await writeDailyQuiz(DAY, [...STUBS, POISON], { fetch: fetcher });
    expect([w.writer, w.modelError]).toEqual(["model", null]);
    expect(w.quiz!.questions.length).toBe(5);
    expect(w.quiz!.questions[0]).toMatchObject({ id: "chat-model-0", answer: "Fermi", sources: [{ kind: "chat", ref: "aaaaaaaaaaaaaaaa", href: null }] });
    expect(w.quiz!.questions.filter((q) => q.id.startsWith("chat-model-")).length).toBe(1);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("http://127.0.0.1:11435/v1/chat/completions");
    expect(seen[0].redirect).toBe("error");
    expect(clean(seen[0].body)).toEqual([]);
  });

  test("a secret in the model reply drops that question", async () => {
    const w = await writeDailyQuiz(DAY, STUBS, { fetch: reply([{ ...GOOD, explain: "token sk-FAKEfixture0000000000000000" }]) });
    expect([w.writer, w.modelError]).toEqual(["templates", "the model wrote no usable question"]);
    expect(clean(JSON.stringify(w.quiz))).toEqual([]);
  });

  test("templates answer when the model is down, slow, failing or off loopback", async () => {
    const want = templateQuestions(DAY, STUBS);
    const down: Fetcher = async () => {
      throw new TypeError("connection refused");
    };
    const slow: Fetcher = (_url, init) => new Promise((_done, fail) => init.signal!.addEventListener("abort", () => fail(init.signal!.reason)));
    let called = 0;
    const counted: Fetcher = async (url, init) => {
      called++;
      return reply([GOOD])(url, init);
    };
    const cases: [Fetcher, Record<string, unknown>, string][] = [
      [down, {}, "the model did not answer"],
      [slow, { timeoutMs: 20 }, "the model did not answer"],
      [async () => new Response("busy", { status: 503 }), {}, "the model answered 503"],
      [async () => new Response("<html>"), {}, "the model reply is not JSON"],
      [async () => new Response(JSON.stringify({ choices: [{ message: { content: "no json here" } }] })), {}, "the model reply holds no JSON"],
      [counted, { url: "http://example.test:11435" }, "the model address must be http on 127.0.0.1 or [::1]"],
    ];
    for (const [fetcher, extra, error] of cases) {
      const w = await writeDailyQuiz(DAY, STUBS, { fetch: fetcher, ...extra });
      expect([w.writer, w.modelError]).toEqual(["templates", error]);
      expect(w.quiz!.questions).toEqual(want);
    }
    expect(called).toBe(0);
    await expect(askModel(STUBS, { fetch: down })).rejects.toThrow();
    expect(await writeDailyQuiz(DAY, [], { fetch: counted })).toEqual({ quiz: null, writer: "none", modelError: null });
  });
});

describe("daily quiz from chats", () => {
  let dir: string;
  let store: Store;
  let s: Serve;
  let auth: Record<string, string>;
  let logs: string[];
  let prompts: string[];
  let model: Fetcher;
  let reads: number;
  const req = (path: string, init: { method?: string; body?: unknown } = {}) =>
    fetch(`http://127.0.0.1:${s.port}${path}`, { method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { host: `127.0.0.1:${s.port}`, ...auth } });
  const disk = () =>
    readdirSync(dir)
      .map((f) => readFileSync(join(dir, f)).toString("latin1"))
      .join("\n");

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "bkt-chat-db-"));
    const key = newDataKey();
    store = new Store(join(dir, "bkt.db"), key);
    logs = [];
    prompts = [];
    reads = 0;
    model = async () => {
      throw new TypeError("connection refused");
    };
    const fetcher: Fetcher = (url, init) => {
      prompts.push(String(init.body));
      return model(url, init);
    };
    s = startServe({ uid: 4, resolvePeerUid: () => 4, routes: workQuizRoutes(new WorkQuizStore(store, key), {
        home,
        now: () => NOW,
        writer: { fetch: fetcher },
        log: (l) => logs.push(l),
        readChats: (on, o) => {
          reads++;
          return readChatSources(on, o);
        },
      }) });
    auth = {};
    const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const r = await fetch(`http://127.0.0.1:${s.port}/session`, { method: "POST", body: JSON.stringify({ nonce }), headers: { host: `127.0.0.1:${s.port}`, origin: `http://127.0.0.1:${s.port}` } });
    auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
    plantAll();
  });
  afterEach(() => {
    s.stop();
    if (existsSync(dir)) {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("with the switches off the route reads nothing and builds nothing", async () => {
    expect(((await (await req("/local/work-quiz/status")).json()) as { chat: unknown }).chat).toEqual(CHAT_OFF);
    expect((await req(`/local/work-quiz/daily?day=${DAY}`)).status).toBe(404);
    expect(logs).toEqual([]);
    expect(prompts).toEqual([]);
    expect(reads).toBe(0);
  });

  test("a day with no stubs is read once", async () => {
    rmSync(join(home, ".claude/projects/project-a/session.jsonl"));
    rmSync(join(home, ".codex"), { recursive: true });
    await req("/local/work-quiz/chat", { method: "POST", body: BOTH });
    for (let i = 0; i < 3; i++) expect((await req(`/local/work-quiz/daily?day=${DAY}`)).status).toBe(404);
    expect(reads).toBe(1);
    await req("/local/work-quiz/chat", { method: "POST", body: BOTH });
    await req(`/local/work-quiz/daily?day=${DAY}`);
    expect(reads).toBe(2);
  });

  test("a forget during a build seals nothing", async () => {
    await req("/local/work-quiz/chat", { method: "POST", body: BOTH });
    let release = () => {};
    const asked = new Promise<void>((started) => {
      model = () =>
        new Promise((done) => {
          release = () => done(new Response("busy", { status: 503 }));
          started();
        });
    });
    const pending = req(`/local/work-quiz/daily?day=${DAY}`);
    await asked;
    expect((await req("/local/work-quiz/forget", { method: "POST", body: {} })).status).toBe(200);
    release();
    expect((await pending).status).toBe(404);
    expect(store.db.query<{ n: number }, []>("select count(*) n from daily_quiz").get()!.n).toBe(0);
    expect(logs).toEqual([]);
    expect((await req(`/local/work-quiz/daily?day=${DAY}`)).status).toBe(404);
    expect(reads).toBe(1);
  });

  test("the switch takes two booleans and no path", async () => {
    for (const bad of [{}, { claude: true }, { claude: "yes", codex: false }])
      expect((await req("/local/work-quiz/chat", { method: "POST", body: bad })).status).toBe(400);
    expect(await (await req("/local/work-quiz/chat", { method: "POST", body: { claude: true, codex: false, root: "/etc" } })).json()).toEqual({ chat: { claude: true, codex: false } });
  });

  test("templates build the quiz with the model down; secrets reach no body, disk, log or prompt", async () => {
    await req("/local/work-quiz/chat", { method: "POST", body: BOTH });
    const res = await req(`/local/work-quiz/daily?day=${DAY}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    const quiz = JSON.parse(text) as { questions: { id: string }[] };
    expect(quiz.questions.length).toBeGreaterThanOrEqual(3);
    expect(clean(text)).toEqual([]);
    const sealed = store.db.query<{ body: string }, []>("select body from daily_quiz").all();
    expect(sealed).toHaveLength(1);
    store.db.run("pragma wal_checkpoint(truncate)");
    const bytes = disk();
    expect(clean(bytes)).toEqual([]);
    expect(bytes.includes(CLAUDE_LABEL) || bytes.includes(CODEX_LABEL)).toBe(false);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatch(/^daily quiz \d{4}-\d{2}-\d{2}: 3 files, \d+ bytes, 2 sessions, \d+ lines dropped, 0 skipped, \d questions, writer templates \(the model did not answer\)$/);
    expect(clean(logs.join("\n") + prompts.join("\n"))).toEqual([]);
    expect(logs[0].includes(CLAUDE_LABEL) || logs[0].includes(CODEX_LABEL)).toBe(false);
    expect(prompts).toHaveLength(1);
    await req(`/local/work-quiz/daily?day=${DAY}`);
    expect(logs).toHaveLength(1);
    const first = quiz.questions[0];
    expect((await req("/local/work-quiz/answer", { method: "POST", body: { day: DAY, id: first.id, response: "2", elapsedMs: 900 } })).status).toBe(200);
  });

  test("a reachable model writes into the sealed quiz", async () => {
    await req("/local/work-quiz/chat", { method: "POST", body: BOTH });
    const id = readChatSources(BOTH, { home, now: NOW }).stubs.find((x) => x.root === "claude")!.id;
    model = reply([{ ...GOOD, stub: id }]);
    const quiz = (await (await req(`/local/work-quiz/daily?day=${DAY}`)).json()) as { questions: { id: string }[] };
    expect(quiz.questions[0].id).toBe("chat-model-0");
    expect(logs[0]).toContain("writer model");
    expect(clean(prompts.join("\n"))).toEqual([]);
  });

  test("another day is never built, and forgetting turns the switches off", async () => {
    await req("/local/work-quiz/chat", { method: "POST", body: BOTH });
    expect((await req("/local/work-quiz/daily?day=2026-09-01")).status).toBe(404);
    expect(logs).toEqual([]);
    await req("/local/work-quiz/forget", { method: "POST", body: {} });
    expect(((await (await req("/local/work-quiz/status")).json()) as { chat: unknown }).chat).toEqual(CHAT_OFF);
    expect((await req(`/local/work-quiz/daily?day=${DAY}`)).status).toBe(404);
  });
});
