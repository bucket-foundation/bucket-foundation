import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import { startServe, type Serve } from "../src/serve";
import { Store } from "../src/store";
import { checkRepoPath, RepoPathError, WorkQuizStore, workQuizRoutes, type GitRunner } from "../src/work-quiz";

const BEADS = Array.from({ length: 12 }, (_, i) =>
  JSON.stringify({ id: `bkt-${100 + i}`, title: `Ship slice ${i} of the window`, status: i % 3 ? "closed" : "open", priority: i % 4, created_at: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z` }),
).join("\n");
const LOG = Array.from({ length: 30 }, (_, i) => `2026-09-${String(1 + (i % 28)).padStart(2, "0")}|feat(bkt): slice number ${i} (#${300 + i})`).join("\n");

let home: string;
let repo: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "bkt-home-"));
  repo = join(home, "code", "project");
  mkdirSync(join(repo, ".git"), { recursive: true });
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe("repository path", () => {
  test("accepts a git folder under home and refuses anything else", () => {
    expect(checkRepoPath("~/code/project", home)).toBe(repo);
    expect(() => checkRepoPath("code/project", home)).toThrow("full path");
    expect(() => checkRepoPath("~/nope", home)).toThrow("does not exist");
    expect(() => checkRepoPath(join(home, "code"), home)).toThrow("not a git repository");
    expect(() => checkRepoPath("/etc", home)).toThrow(RepoPathError);
    const outside = mkdtempSync(join(tmpdir(), "bkt-out-"));
    mkdirSync(join(outside, ".git"));
    symlinkSync(outside, join(home, "link"));
    expect(() => checkRepoPath("~/link", home)).toThrow("inside your home folder");
    rmSync(outside, { recursive: true });
  });
});

describe("work quiz routes", () => {
  let dir: string;
  let store: Store;
  let s: Serve;
  let auth: Record<string, string>;
  const calls: string[][] = [];
  const git: GitRunner = async (args, cwd) => {
    calls.push([cwd, ...args]);
    if (args[0] === "log") return LOG;
    if (args[0] === "remote") return "git@github.com:example/project.git\n";
    return "true\n";
  };
  const req = (path: string, init: { method?: string; body?: unknown } = {}) =>
    fetch(`http://127.0.0.1:${s.port}${path}`, { method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { host: `127.0.0.1:${s.port}`, ...auth } });

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "bkt-wq-"));
    const key = newDataKey();
    store = new Store(join(dir, "bkt.db"), key);
    s = startServe({ uid: 4, resolvePeerUid: () => 4, routes: workQuizRoutes(new WorkQuizStore(store, key), { git, home, seed: () => "seed-1" }) });
    auth = {};
    const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const r = await fetch(`http://127.0.0.1:${s.port}/session`, { method: "POST", body: JSON.stringify({ nonce }), headers: { host: `127.0.0.1:${s.port}`, origin: `http://127.0.0.1:${s.port}` } });
    auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
  });
  afterEach(() => {
    s.stop();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("with no sources the quiz is not ready and next is 404", async () => {
    expect(((await (await req("/local/work-quiz/status")).json()) as { ready: boolean }).ready).toBe(false);
    expect((await req("/local/work-quiz/next")).status).toBe(404);
  });

  test("beads and a repo feed questions; answers are graded and recorded", async () => {
    expect(await (await req("/local/work-quiz/beads", { method: "POST", body: { text: BEADS } })).json()).toEqual({ beads: 12 });
    expect(await (await req("/local/work-quiz/repo", { method: "POST", body: { path: "~/code/project" } })).json()).toEqual({ repo });
    const st = (await (await req("/local/work-quiz/status")).json()) as { ready: boolean; beads: number; prs: number };
    expect([st.ready, st.beads, st.prs]).toEqual([true, 12, 30]);
    expect(calls.every(([cwd]) => cwd === repo)).toBe(true);
    const q = (await (await req("/local/work-quiz/next")).json()) as { id: string; choices: string[] | null; answer?: string };
    expect(q.answer).toBeUndefined();
    const res = (await (await req("/local/work-quiz/answer", { method: "POST", body: { id: q.id, response: q.choices ? q.choices[0] : "5", elapsedMs: 1000 } })).json()) as { answer: string; correct: boolean };
    expect(typeof res.answer).toBe("string");
    expect((await req("/local/work-quiz/answer", { method: "POST", body: { id: q.id, response: "x", elapsedMs: 1 } })).status).toBe(404);
    expect(((await (await req("/local/work-quiz/status")).json()) as { answered: number }).answered).toBe(1);
  });

  test("bad inputs are refused and sources stay sealed at rest", async () => {
    expect((await req("/local/work-quiz/beads", { method: "POST", body: { text: "not beads" } })).status).toBe(400);
    expect((await req("/local/work-quiz/repo", { method: "POST", body: { path: "/etc" } })).status).toBe(400);
    await req("/local/work-quiz/beads", { method: "POST", body: { text: BEADS } });
    await req("/local/work-quiz/repo", { method: "POST", body: { path: repo } });
    store.db.run("pragma wal_checkpoint(truncate)");
    for (const f of readdirSync(dir)) {
      const bytes = readFileSync(join(dir, f));
      expect(bytes.includes("Ship slice")).toBe(false);
      expect(bytes.includes(repo)).toBe(false);
    }
    expect(await (await req("/local/work-quiz/forget", { method: "POST", body: {} })).json()).toEqual({ cleared: true });
    expect(((await (await req("/local/work-quiz/status")).json()) as { ready: boolean }).ready).toBe(false);
  });

  test("routes need the header token", async () => {
    auth = {};
    expect((await req("/local/work-quiz/status")).status).toBe(401);
  });
});
