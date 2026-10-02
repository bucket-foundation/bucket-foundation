import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeServerRecord } from "../src/core/backend";
import { formLabel, studyHistory } from "../src/core/history";
import { importProgress } from "../src/core/importer";
import { checkNote, noteRows } from "../src/core/notes";
import { directResearch } from "../src/core/research";
import { jsonBody } from "../src/cli/out";
import { historyText, historyTsv, noteLines, noteTsv } from "../src/cli/notes";
import { HistoryStore, historyRoutes } from "../src/history";
import { MemoryKeyring } from "../src/keyring";
import { localRoutes } from "../src/local";
import { NotesStore, notesRoutes } from "../src/notes";
import { startServe } from "../src/serve";
import { openSession, type Session } from "../src/setup";
import { LEARN_ITEMS } from "./fixtures/learn-items";

const CLI = join(import.meta.dir, "../src/cli.tsx");
const TOKEN = "T".repeat(43);
const SECRET = "S".repeat(43);
const DAY = 86_400_000;
const NOW = new Date(2026, 9, 1, 12, 0).getTime();

let dir: string;
let env: Record<string, string>;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-notes-"));
  env = { PATH: join(dir, "bin"), HOME: join(dir, "user"), BKT_HOME: join(dir, "data"), XDG_RUNTIME_DIR: join(dir, "run"), TMPDIR: dir, DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent/bkt-test-bus" };
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

async function session(): Promise<Session> {
  const s = await openSession(new MemoryKeyring(), join(dir, "mem"));
  s.store.importPack("fixture", LEARN_ITEMS);
  return s;
}

function seed(s: Session) {
  const item = LEARN_ITEMS[0].id;
  const at = (d: number, h = 0) => NOW - d * DAY + h * 3_600_000;
  s.store.recordAttempt({ itemId: item, mode: "quiz", response: "0", correct: true, rating: 3, elapsedMs: 900, at: at(0) });
  s.store.recordAttempt({ itemId: item, mode: "quiz", response: "1", correct: false, rating: 1, elapsedMs: 900, at: at(2) });
  s.store.recordAttempt({ itemId: item, mode: "review", response: null, correct: true, rating: 3, elapsedMs: 900, at: at(2, 1) });
  s.store.recordAttempt({ itemId: item, mode: "quiz", response: "0", correct: true, rating: 3, elapsedMs: 900, at: at(40) });
  const w = s.store.db.query("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at) values (?, ?, ?, ?, ?, ?, ?)");
  w.run("w1", "q1", "true_false", 1, 3, 500, at(0));
  w.run("w2", "q2", "true_false", 0, 1, 500, at(0));
  w.run("w3", "q3", "estimate", 1, 3, 500, at(5));
}

describe("import shape check", () => {
  const good = { state: "review", stability: 4.2, difficulty: 5, due: NOW + DAY, lastReview: NOW - DAY, reps: 3, lapses: 0, scheduledDays: 2 };

  test("a malformed card with a newer review is refused whole and changes no row, even with force", async () => {
    const s = await session();
    try {
      const decks = [{ id: "02-physics" }];
      expect(importProgress(s.store, decks, { branches: { "02-physics": { cards: { "atom-a": good } } } }, false, NOW)).toMatchObject({ ok: true });
      const before = JSON.stringify(s.store.learnState("02-physics"));
      const at = s.store.meta("web_import_at");
      for (const bad of [
        { ...good, state: "zzz", lastReview: NOW + 5 * DAY },
        { ...good, stability: "4", lastReview: NOW + 5 * DAY },
        { ...good, difficulty: 99, lastReview: NOW + 5 * DAY },
        { ...good, reps: -1, lastReview: NOW + 5 * DAY },
        { ...good, extra: 1, lastReview: NOW + 5 * DAY },
        "card",
      ]) {
        const payload = { branches: { "02-physics": { cards: { "atom-a": bad, "atom-b": good } } } };
        expect(importProgress(s.store, decks, payload, true, NOW + 9)).toMatchObject({ ok: false, status: 400 });
      }
      expect(importProgress(s.store, decks, { branches: { "02-physics": { cards: { "bad id!": good } } } }, true, NOW)).toMatchObject({ ok: false, status: 400 });
      expect(importProgress(s.store, decks, { branches: { "02-physics": { stats: { history: { yesterday: { new: 1 } } } } } }, true, NOW)).toMatchObject({ ok: false, status: 400 });
      expect(importProgress(s.store, decks, { branches: { "02-physics": { settings: { newPerDay: "9" } } } }, true, NOW)).toMatchObject({ ok: false, status: 400 });
      expect(JSON.stringify(s.store.learnState("02-physics"))).toBe(before);
      expect(s.store.meta("web_import_at")).toBe(at);
      expect(importProgress(s.store, decks, { branches: { "02-physics": { settings: { newPerDay: 6, theme: "dark", __proto__x: 1 } } } }, true, NOW)).toMatchObject({ ok: true });
      expect(Object.keys(s.store.learnState("02-physics").settings).sort()).toEqual(["newPerDay", "requestRetention"]);
      expect(s.store.learnState("02-physics").cards["atom-a"]).toEqual(good);
    } finally {
      s.store.close();
    }
  });

  test("bkt import refuses the malformed file with the plain message and a note file over the limit gets the same words", () => {
    writeFileSync(join(dir, "bad-card.json"), JSON.stringify({ branches: { "02-physics": { cards: { "atom-a": { state: "zzz" } } } } }));
    expect(bkt(["import", join(dir, "bad-card.json"), "--force", ...vault])).toEqual({ code: 1, out: "", err: "bkt: Bucket could not read that file.\n" });
    writeFileSync(join(dir, "big.txt"), "x".repeat(512 * 1024 + 1));
    expect(bkt(["notes", "add", "Big", "--file", join(dir, "big.txt"), ...vault])).toEqual({ code: 1, out: "", err: "bkt: Bucket could not read that file.\n" });
  }, 60_000);
});

describe("core", () => {
  test("study history counts days, reviews and accuracy for each form inside the window", async () => {
    const s = await session();
    try {
      seed(s);
      const h = studyHistory(s.store.db, NOW, 30);
      expect(h).toEqual({
        days: 30,
        studyDays: 3,
        reviews: 1,
        answered: 5,
        correct: 3,
        forms: [
          { form: "quiz", answered: 2, correct: 1, accuracy: 0.5 },
          { form: "true_false", answered: 2, correct: 1, accuracy: 0.5 },
          { form: "estimate", answered: 1, correct: 1, accuracy: 1 },
        ],
        byDay: [
          { day: "2026-09-26", reviews: 0, answered: 1, correct: 1 },
          { day: "2026-09-29", reviews: 1, answered: 1, correct: 0 },
          { day: "2026-10-01", reviews: 0, answered: 3, correct: 2 },
        ],
      });
      expect(historyText(h)).toBe(
        [
          "Days covered        30",
          "Study days          3",
          "Reviews             1",
          "Questions answered  5",
          "Correct             60%",
          "",
          "By question form",
          "Multiple choice  2 answered, 50% correct",
          "True or false    2 answered, 50% correct",
          "Estimate         1 answered, 100% correct",
        ].join("\n"),
      );
      expect(historyTsv(h)).toBe("2026-09-26\t0\t1\t1\n2026-09-29\t1\t1\t0\n2026-10-01\t0\t3\t2");
      expect(JSON.stringify(jsonBody("history", { ...h, byDay: h.byDay.slice(0, 1) }))).toBe(
        '{"v":1,"days":30,"studyDays":3,"reviews":1,"answered":5,"correct":3,"forms":[{"form":"quiz","answered":2,"correct":1,"accuracy":0.5},{"form":"true_false","answered":2,"correct":1,"accuracy":0.5},{"form":"estimate","answered":1,"correct":1,"accuracy":1}],"byDay":[{"day":"2026-09-26","reviews":0,"answered":1,"correct":1}]}',
      );
      expect(studyHistory(s.store.db, NOW, 60).studyDays).toBe(4);
      expect(formLabel("spot_error")).toBe("Spot the error");
      expect(formLabel("new_kind")).toBe("New kind");
    } finally {
      s.store.close();
    }
  });

  test("the window's history route carries the same study history", async () => {
    const s = await session();
    try {
      seed(s);
      const route = historyRoutes(new HistoryStore(s.store, s.key), () => NOW)["GET /local/history"];
      const url = new URL("http://127.0.0.1/local/history?days=30");
      const body = (await (await route(new Request(url), url)).json()) as { study: unknown };
      expect(body.study).toEqual(studyHistory(s.store.db, NOW, 30));
      const bad = new URL("http://127.0.0.1/local/history?days=0");
      expect(((await (await route(new Request(bad), bad)).json()) as { study: { days: number } }).study.days).toBe(30);
    } finally {
      s.store.close();
    }
  });

  test("note checks match the window's rules", () => {
    const shelf = { has: (id: string) => id === "0".repeat(36), count: () => 0 };
    expect(checkNote(null, shelf)).toEqual({ ok: false, status: 400, error: "bad body" });
    expect(checkNote({ title: "t" }, shelf)).toEqual({ ok: false, status: 400, error: "title and body required" });
    expect(checkNote({ title: "x".repeat(201), body: "" }, shelf)).toMatchObject({ ok: false, status: 413 });
    expect(checkNote({ id: "1".repeat(36), title: "t", body: "" }, shelf)).toEqual({ ok: false, status: 404, error: "no such note" });
    expect(checkNote({ title: "t", body: "" }, { ...shelf, count: () => 5000 })).toMatchObject({ ok: false, status: 409 });
    expect(checkNote({ title: "t", body: "b", pinned: true }, shelf)).toEqual({ ok: true, value: { id: undefined, title: "t", body: "b", pinned: true } });
  });

  test("note rows print numbered lines, tab separated rows and JSON without bodies", () => {
    const at = new Date(2026, 9, 1, 9, 5).getTime();
    const rows = noteRows([
      { id: "a".repeat(36), title: "Water", body: "secret body", pinned: true, createdAt: at, updatedAt: at },
      { id: "b".repeat(36), title: "", body: "", pinned: false, createdAt: at, updatedAt: at },
    ]);
    expect(noteLines(rows)).toBe("1  * Water  2026-10-01 09:05\n2  Untitled  2026-10-01 09:05");
    expect(noteTsv(rows)).toBe("1\tyes\t2026-10-01 09:05\tWater\n2\tno\t2026-10-01 09:05\t");
    expect(JSON.stringify(jsonBody("notes ls", { notes: rows }))).not.toContain("secret body");
  });

  test("import merges known decks once, and again only with force", async () => {
    const s = await session();
    try {
      const decks = [{ id: "02-physics" }];
      expect(importProgress(s.store, decks, { branches: { "zz-nope": {} } }, false, NOW)).toEqual({ ok: false, status: 400, error: "unknown decks: zz-nope" });
      expect(importProgress(s.store, decks, [1], false, NOW)).toMatchObject({ ok: false, status: 400 });
      expect(importProgress(s.store, decks, { branches: { "02-physics": {} } }, false, NOW)).toEqual({ ok: true, imported: ["02-physics"] });
      expect(importProgress(s.store, decks, { branches: { "02-physics": {} } }, false, NOW)).toEqual({ ok: false, status: 409, error: "already imported" });
      expect(importProgress(s.store, decks, { branches: { "02-physics": {} } }, true, NOW)).toEqual({ ok: true, imported: ["02-physics"] });
      const b = directResearch({ store: s.store, notes: new NotesStore(s.store, s.key), history: new HistoryStore(s.store, s.key), decks, now: () => NOW });
      expect(await b.addNote({ title: "", body: "x" })).toMatchObject({ ok: true });
      expect(await b.addNote({ title: 3 })).toMatchObject({ ok: false, status: 400 });
    } finally {
      s.store.close();
    }
  });
});

const vault = ["--keyring", "passphrase", "--passphrase-fd", "0"];

function bkt(args: string[], stdin = "pw\n") {
  const r = Bun.spawnSync([process.execPath, CLI, ...args], { env, stdin: Buffer.from(stdin), stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

describe("bkt notes, history and import", () => {
  test("usage errors and unreadable files stop before the store opens", () => {
    writeFileSync(join(dir, "bad.json"), "{not json");
    for (const args of [
      ["notes"],
      ["notes", "show", "abc"],
      ["notes", "show", "0"],
      ["notes", "add", " "],
      ["notes", "add", "t", "--body", "x", "--file", "y"],
      ["notes", "ls", "--json", "--tsv"],
      ["history", "--days", "0"],
      ["history", "--days", "x"],
      ["import"],
    ]) {
      const r = bkt([...args, ...vault]);
      expect([args.join(" "), r.code, r.out]).toEqual([args.join(" "), 2, ""]);
    }
    for (const args of [["import", join(dir, "missing.json")], ["import", join(dir, "bad.json")], ["notes", "add", "t", "--file", join(dir, "missing.txt")]]) {
      expect(bkt([...args, ...vault])).toEqual({ code: 1, out: "", err: "bkt: Bucket could not read that file.\n" });
    }
    expect(existsSync(env.BKT_HOME)).toBe(false);
  }, 60_000);

  test("notes add, ls and show; history; import once, refused twice, merged with --force", () => {
    expect(bkt(["notes", "ls", ...vault]).code).toBe(3);
    writeFileSync(join(dir, "body.txt"), "Water forms layers near surfaces.");
    expect(bkt(["notes", "add", "Water", "--file", join(dir, "body.txt"), "--pin", ...vault])).toEqual({ code: 0, out: "Saved the note Water.\n", err: "" });
    const added = JSON.parse(bkt(["notes", "add", "Light", "--body", "fast", "--json", ...vault]).out);
    expect(Object.keys(added)).toEqual(["v", "id", "title", "pinned", "createdAt", "updatedAt"]);
    expect(bkt(["notes", "ls", ...vault]).out).toMatch(/^1  \* Water  \S+ \S+\n2  Light  \S+ \S+\n$/);
    expect(bkt(["notes", "ls", "--tsv", ...vault]).out.trimEnd().split("\n").map((l) => l.split("\t").length)).toEqual([4, 4]);
    const shown = bkt(["notes", "show", "1", ...vault]).out.split("\n");
    expect([shown[0], shown[2], shown[3]]).toEqual(["* Water", "", "Water forms layers near surfaces."]);
    expect(JSON.parse(bkt(["notes", "show", "2", "--json", ...vault]).out)).toMatchObject({ v: 1, n: 2, title: "Light", body: "fast" });
    expect(bkt(["notes", "show", "3", ...vault]).code).toBe(3);
    const h = bkt(["history", ...vault]);
    expect([h.code, h.err]).toEqual([3, "bkt: no study in the last 30 days\n"]);
    expect(JSON.parse(bkt(["history", "--json", "--days", "7", ...vault]).out)).toMatchObject({ v: 1, days: 7, studyDays: 0 });
    writeFileSync(join(dir, "progress.json"), JSON.stringify({ branches: { "bucket-academy/v1/02-physics": JSON.stringify({}) } }));
    writeFileSync(join(dir, "unknown.json"), JSON.stringify({ branches: { "zz-nope": {} } }));
    expect(bkt(["import", join(dir, "unknown.json"), ...vault])).toEqual({ code: 1, out: "", err: "bkt: Bucket could not read that file.\n" });
    expect(bkt(["import", join(dir, "progress.json"), ...vault])).toEqual({ code: 0, out: "Brought over 1 deck.\n", err: "" });
    const again = bkt(["import", join(dir, "progress.json"), ...vault]);
    expect([again.code, again.err.startsWith("bkt: Your progress from the website is already on this computer.")]).toEqual([1, true]);
    expect(JSON.parse(bkt(["import", join(dir, "progress.json"), "--force", "--json", ...vault]).out)).toEqual({ v: 1, imported: ["02-physics"] });
  }, 120_000);

  test("with a server running, notes add and import go through it and open no store", async () => {
    const s = await session();
    const home = env.BKT_HOME;
    mkdirSync(home, { mode: 0o700 });
    const srv = startServe({
      routes: { ...localRoutes(s.store, { content: { version: "fixture", items: [], decks: [{ id: "02-physics" }] } as never }), ...notesRoutes(new NotesStore(s.store, s.key)), ...historyRoutes(new HistoryStore(s.store, s.key)) },
      cliToken: TOKEN,
      cliSecret: SECRET,
      uid: 1,
      resolvePeerUid: () => 1,
    });
    const release = writeServerRecord(home, { pid: process.pid, port: srv.port, token: TOKEN, secret: SECRET });
    const run = async (args: string[]) => {
      const p = Bun.spawn([process.execPath, CLI, ...args], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
      const [code, out, err] = await Promise.all([p.exited, new Response(p.stdout).text(), new Response(p.stderr).text()]);
      return { code, out, err };
    };
    try {
      expect(await run(["notes", "add", "From the CLI", "--body", "hello"])).toEqual({ code: 0, out: "Saved the note From the CLI.\n", err: "" });
      expect(new NotesStore(s.store, s.key).list().map((n) => n.title)).toEqual(["From the CLI"]);
      expect((await run(["notes", "ls"])).out).toContain("From the CLI");
      writeFileSync(join(dir, "progress.json"), JSON.stringify({ branches: { "02-physics": {} } }));
      expect(await run(["import", join(dir, "progress.json")])).toEqual({ code: 0, out: "Brought over 1 deck.\n", err: "" });
      expect((await run(["import", join(dir, "progress.json")])).err).toContain("already on this computer");
      expect((await run(["history", "--json"])).out).toContain('"studyDays":0');
      expect(existsSync(join(home, "bkt.db"))).toBe(false);
    } finally {
      release();
      srv.stop();
      s.store.close();
    }
  }, 60_000);
});
