import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { directBackend, readServerRecord, SERVER_FILE, writeServerRecord, type LearnBackend } from "../src/core/backend";
import { checkLimits } from "../../../src/lib/research-os/work-quiz/limits";
import { newDataKey } from "../src/crypto";
import { daily, learnDue, learnPath, quizJson, reviewJson, type LearnIo } from "../src/cli/learn";
import { findCommand } from "../src/cli/table";
import { NoDataError, resolve, UsageError } from "../src/cli/run";
import { DailyQuizStore, fermi } from "../src/daily-quiz";
import { localRoutes } from "../src/local";
import { startServe } from "../src/serve";
import { Store } from "../src/store";
import { LEARN_ITEMS } from "./fixtures/learn-items";

const CLI = join(import.meta.dir, "../src/cli.tsx");
const WRITER = join(import.meta.dir, "fixtures/learn-writer.ts");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-learn-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function io(input: string[] = []): LearnIo & { out: string[] } {
  const out: string[] = [];
  return {
    out,
    print: (l) => out.push(l),
    lines: async function* () {
      for (const l of input) yield l;
    },
  };
}

function backend(store: Store, key: Buffer, now = 1_000_000): LearnBackend {
  const recorded: unknown[] = [];
  return directBackend({ store, content: {}, daily: new DailyQuizStore(store, key), record: (...a) => recorded.push(a), now: () => now, seed: () => "seed" });
}

const spec = (name: string) => findCommand(name)!;

describe("learn commands over the core module", () => {
  test("quiz --json prints questions that pass the limits, then one result per answer line", async () => {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    store.importPack("fixture", LEARN_ITEMS);
    const b = backend(store, key);
    const t = io(['{"choice":0,"elapsedMs":800}', "", '{"choice":null,"elapsedMs":900}']);
    expect(await quizJson(b, 3, spec("learn quiz"), t)).toBe(0);
    const head = JSON.parse(t.out[0]) as { v: number; questions: { itemId: string; prompt: string; choices: string[]; limitSec: number }[] };
    expect(head.v).toBe(1);
    expect(head.questions).toHaveLength(3);
    for (const q of head.questions) {
      expect(Object.keys(q)).toEqual(["itemId", "prompt", "choices", "limitSec"]);
      expect(checkLimits({ prompt: q.prompt, choices: q.choices })).toEqual([]);
    }
    expect(t.out).toHaveLength(3);
    const second = JSON.parse(t.out[2]);
    expect(Object.keys(second)).toEqual(["v", "itemId", "correct", "timedOut", "rating", "answer"]);
    expect([second.itemId, second.correct]).toEqual([head.questions[1].itemId, false]);
    expect(store.db.query<{ n: number }, []>("select count(*) n from attempts").get()!.n).toBe(2);
    store.close();
  });

  test("a bad answer line is a usage error and a line past the last question too", async () => {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    store.importPack("fixture", LEARN_ITEMS);
    await expect(quizJson(backend(store, key), 1, spec("learn quiz"), io(["not json"]))).rejects.toThrow("answer line 1 is not one JSON object");
    await expect(quizJson(backend(store, key), 1, spec("learn quiz"), io(['{"choice":9,"elapsedMs":1}']))).rejects.toBeInstanceOf(UsageError);
    await expect(quizJson(backend(store, key), 1, spec("learn quiz"), io(['{"choice":0,"elapsedMs":1}', '{"choice":0,"elapsedMs":1}']))).rejects.toThrow("answer line 2 has no question left");
    await expect(quizJson(backend(store, key), 1, spec("learn quiz"), io(['{"itemId":"other","choice":0,"elapsedMs":1}']))).rejects.toThrow("answer line 1 names other");
    store.close();
  });

  test("due, review --json and path read the same store", async () => {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    store.importPack("fixture", LEARN_ITEMS);
    const early = backend(store, key, 1_000_000);
    await expect(learnDue(early, 10, false, io())).rejects.toBeInstanceOf(NoDataError);
    for (const q of await early.quiz(2)) await early.answerQuiz(q.itemId, 3, 500);
    const later = backend(store, key, 1_000_000 + 400 * 86_400_000);
    const due = io();
    expect(await learnDue(later, 10, true, due)).toBe(0);
    expect(JSON.parse(due.out[0]).cards).toHaveLength(2);
    const text = io();
    await learnDue(later, 10, false, text);
    expect(text.out[0]).toBe("2 cards are due.");
    const rated = io(['{"rating":3,"elapsedMs":700}']);
    expect(await reviewJson(later, 10, spec("learn review"), rated)).toBe(0);
    expect(Object.keys(JSON.parse(rated.out[0]).cards[0])).toEqual(["id", "title", "prompt", "answer"]);
    expect(Object.keys(JSON.parse(rated.out[1]))).toEqual(["v", "itemId", "due"]);
    const path = io();
    await expect(learnPath(later, null, [], true, path)).rejects.toBeInstanceOf(NoDataError);
    expect(path.out).toEqual(['{"v":1,"decks":[]}']);
    store.close();
  });

  test("daily prints the day's questions in plain text and grades answer lines", async () => {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    const d = new DailyQuizStore(store, key);
    d.put({ day: "2026-10-01", questions: [fermi({ id: "q1", prompt: "How many days in a year?", answer: 365, explain: "Earth's orbit." })] }, 1);
    const text = io();
    expect(await daily(backend(store, key), "2026-10-01", false, spec("daily"), text)).toBe(0);
    expect(text.out).toEqual(["Daily quiz for 2026-10-01: 1 questions, 0 answered.", "1. How many days in a year?", "Answer in the Bucket window, or send answers with --json."]);
    const json = io(['{"response":"360","elapsedMs":4000}']);
    expect(await daily(backend(store, key), "2026-10-01", true, spec("daily"), json)).toBe(0);
    expect(JSON.parse(json.out[1])).toMatchObject({ v: 1, id: "q1", correct: true });
    await expect(daily(backend(store, key), "2026-10-02", true, spec("daily"), io())).rejects.toThrow("no daily quiz for 2026-10-02");
    store.close();
  });

  test("usage is checked before any store opens", () => {
    expect(() => resolve(["learn", "quiz", "--count", "0"])).toThrow("--count needs a whole number from 1 to 50");
    expect(() => resolve(["daily", "2026-02-30"])).toThrow("give the day as YYYY-MM-DD");
    expect(() => resolve(["learn", "bogus"])).toThrow("unknown learn command bogus");
    expect(resolve(["learn", "quiz", "--json", "--count", "5"]).kind).toBe("run");
  });
});

describe("writes beside a running server", () => {
  test("two direct writers lose no rows", async () => {
    const key = newDataKey();
    const db = join(dir, "bkt.db");
    new Store(db, key).close();
    const n = 60;
    const procs = ["a", "b"].map((label) => Bun.spawn([process.execPath, WRITER, db, key.toString("hex"), String(n), label], { stdout: "pipe", stderr: "pipe" }));
    const outs = await Promise.all(procs.map(async (p) => ({ code: await p.exited, out: await new Response(p.stdout).text(), err: await new Response(p.stderr).text() })));
    for (const o of outs) expect(o).toMatchObject({ code: 0, out: `${n}\n` });
    const store = new Store(db, key);
    expect(store.db.query<{ n: number }, []>("select count(*) n from attempts").get()!.n).toBe(2 * n);
    store.close();
  }, 60_000);

  test("with bkt serve running, the CLI writes through it and a direct writer beside it loses nothing", async () => {
    const key = newDataKey();
    const home = join(dir, "data");
    mkdirSync(home, { mode: 0o700 });
    const db = join(home, "bkt.db");
    const store = new Store(db, key);
    store.importPack("fixture", LEARN_ITEMS);
    const srv = startServe({ routes: localRoutes(store), cliToken: "T".repeat(43), uid: 1, resolvePeerUid: () => 1 });
    const release = writeServerRecord(home, { pid: process.pid, port: srv.port, token: "T".repeat(43) });
    try {
      expect(readServerRecord(home)?.port).toBe(srv.port);
      const answers = Array.from({ length: 5 }, () => '{"choice":0,"elapsedMs":600}').join("\n");
      const cli = Bun.spawn([process.execPath, CLI, "learn", "quiz", "--json", "--count", "5"], {
        env: { PATH: join(dir, "bin"), HOME: join(dir, "user"), BKT_HOME: home, TMPDIR: dir },
        stdin: Buffer.from(`${answers}\n`),
        stdout: "pipe",
        stderr: "pipe",
      });
      const writer = Bun.spawn([process.execPath, WRITER, db, key.toString("hex"), "40", "w"], { stdout: "pipe", stderr: "pipe" });
      const [code, out, err, wcode] = await Promise.all([cli.exited, new Response(cli.stdout).text(), new Response(cli.stderr).text(), writer.exited]);
      expect(err).toBe("");
      expect(code).toBe(0);
      expect(wcode).toBe(0);
      expect(out.trimEnd().split("\n")).toHaveLength(6);
      expect(store.db.query<{ n: number }, []>("select count(*) n from attempts").get()!.n).toBe(45);
      expect(readdirSync(home).filter((f) => f.startsWith("keyring") || f === "keys.lock")).toEqual([]);
    } finally {
      release();
      srv.stop();
      store.close();
    }
    expect(existsSync(join(home, SERVER_FILE))).toBe(false);
  }, 60_000);

  test("a server record whose process is gone is ignored", () => {
    writeServerRecord(dir, { pid: 1, port: 1, token: "T".repeat(43) });
    expect(readServerRecord(dir, () => false)).toBeNull();
    expect(readServerRecord(dir, () => true)?.port).toBe(1);
  });
});
