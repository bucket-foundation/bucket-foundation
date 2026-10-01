import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import { jobRoutes } from "../src/job-routes";
import { checkModules, jobSpecs, type AnalysisCard } from "../src/job-specs";
import { JOB_MARKER, JobRunner, type JobSpec, type JobView } from "../src/jobs";
import { buildPySource } from "../src/pack/pysrc";
import { PeopleStore } from "../src/people";
import { startServe, type Serve } from "../src/serve";
import { Store } from "../src/store";

const BUN = process.execPath;
const REPO = join(import.meta.dir, "../../..");

const spec = (script: string, extra: Partial<JobSpec> = {}): JobSpec => ({
  label: "test",
  inputs: { note: { label: "Note", maxBytes: 1024, exts: [".txt", ".md"] } },
  plan: (d) => ({ argv: [BUN, "-e", script, d.inputs.note, d.out] }),
  ...extra,
});

const SPECS: Record<string, JobSpec> = {
  echo: spec(`const fs=require("fs");const [f,out]=process.argv.slice(1);console.log("read "+fs.readFileSync(f,"utf8"));fs.writeFileSync(out+"/done","ok")`, {
    after: (d) => ({ wrote: readFileSync(join(d.out, "done"), "utf8") }),
  }),
  sleep: spec(`setTimeout(()=>{},60000)`),
  family: spec(`const cp=require("child_process"),fs=require("fs");const [,out]=process.argv.slice(1);const c=cp.spawn("sleep",["60"],{stdio:"ignore"});fs.writeFileSync(out+"/grandchild",String(c.pid));setTimeout(()=>{},60000)`),
  echoer: spec(`const fs=require("fs");const [f]=process.argv.slice(1);const t=fs.readFileSync(f,"utf8");console.log("Traceback (most recent call last):");console.log("ValueError: bad row "+t.split("\\n")[1]);console.log("contact avery [at] uni [dot] example");console.log("fitted 160 people");console.error(t.split("\\n")[2].slice(5,40))`),
  noisy: spec(`process.stdout.write("x".repeat(100000)+"END")`),
  fail: spec(`console.error("boom");process.exit(3)`),
  refuse: spec("", { plan: () => ({ error: "this job needs numpy: python3 -m pip install --user numpy" }) }),
  badafter: spec(`0`, { after: () => { throw new Error("no review.json"); } }),
};

let root: string;
let runner: JobRunner;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "bkt-jobs-"));
  runner = new JobRunner({ root, specs: SPECS, timeoutMs: 5_000, logBytes: 1024 });
});
afterEach(() => {
  runner.stopAll();
  rmSync(root, { recursive: true, force: true });
});

async function settle(id: string, r = runner): Promise<JobView> {
  for (let i = 0; i < 400; i++) {
    const j = r.get(id)!;
    if (j.state !== "running") return j;
    await Bun.sleep(25);
  }
  throw new Error("job did not settle");
}

describe("job runner", () => {
  test("runs a job in a marked folder, captures output, runs after, deletes inputs", async () => {
    const j = runner.start("echo", { note: "hello" });
    const done = await settle(j.id);
    expect(done.state).toBe("done");
    expect(done.log).toContain("read hello");
    expect(done.result).toEqual({ wrote: "ok" });
    expect(readFileSync(join(root, j.id, JOB_MARKER), "utf8").trim()).toBe(j.id);
    expect(existsSync(join(root, j.id, "inputs"))).toBe(false);
    const md = await settle(runner.start("echo", { note: { text: "hi", ext: ".md" } }).id);
    expect(md.state).toBe("done");
  });

  test("runs one job at a time", async () => {
    const a = runner.start("sleep", { note: "x" });
    expect(() => runner.start("echo", { note: "y" })).toThrow("another job is running");
    runner.cancel(a.id);
    expect((await settle(a.id)).state).toBe("cancelled");
    expect((await settle(runner.start("echo", { note: "y" }).id)).state).toBe("done");
  });

  test("cancel and timeout stop the whole process group, grandchildren included", async () => {
    const alive = (pid: number) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    for (const how of ["cancel", "timeout"] as const) {
      const r = new JobRunner({ root, specs: SPECS, timeoutMs: how === "timeout" ? 400 : 60_000, killGraceMs: 300 });
      const j = r.start("family", { note: "x" });
      const pidFile = join(root, j.id, "out", "grandchild");
      for (let i = 0; i < 200 && !existsSync(pidFile); i++) await Bun.sleep(10);
      const pid = Number(readFileSync(pidFile, "utf8"));
      expect(alive(pid)).toBe(true);
      if (how === "cancel") r.cancel(j.id);
      const done = await settle(j.id, r);
      expect(done.state).toBe(how === "cancel" ? "cancelled" : "timeout");
      for (let i = 0; i < 100 && alive(pid); i++) await Bun.sleep(20);
      expect(alive(pid)).toBe(false);
    }
  });

  test("log lines that repeat input text or carry an email are hidden", async () => {
    const note = ["header line", "Avery Stone works on water interfaces at North Institute", "the statement says membranes carry charge across the cell"].join("\n");
    const r = new JobRunner({ root, specs: { ...SPECS, echoer: { ...SPECS.echoer, inputs: { note: { label: "Note", maxBytes: 4096, exts: [".txt"] } } } } });
    const done = await settle(r.start("echoer", { note }).id, r);
    expect(done.log).toContain("Traceback (most recent call last):");
    expect(done.log).toContain("fitted 160 people");
    expect(done.log).not.toContain("Avery Stone");
    expect(done.log).not.toContain("membranes carry charge");
    expect(done.log).not.toContain("[at]");
    expect(done.log.match(/line hidden/g)?.length).toBe(3);
  });

  test("a job past its time limit is stopped", async () => {
    const r = new JobRunner({ root, specs: SPECS, timeoutMs: 150 });
    const j = r.start("sleep", { note: "x" });
    const done = await settle(j.id, r);
    expect(done.state).toBe("timeout");
    expect(done.error).toBe("the job ran past its time limit");
    expect(existsSync(join(root, j.id, "inputs"))).toBe(false);
  });

  test("the log keeps only its last bytes", async () => {
    const done = await settle(runner.start("noisy", { note: "x" }).id);
    expect(done.logTruncated).toBe(true);
    expect(Buffer.byteLength(done.log)).toBeLessThanOrEqual(1024);
    expect(done.log.trimEnd().endsWith("END")).toBe(true);
  });

  test("failures carry a reason", async () => {
    const failed = await settle(runner.start("fail", { note: "x" }).id);
    expect([failed.state, failed.code, failed.error]).toEqual(["failed", 3, "exited with code 3"]);
    expect(failed.log).toContain("boom");
    const refused = runner.start("refuse", { note: "x" });
    expect([refused.state, refused.error]).toEqual(["failed", "this job needs numpy: python3 -m pip install --user numpy"]);
    const bad = await settle(runner.start("badafter", { note: "x" }).id);
    expect([bad.state, bad.error]).toEqual(["failed", "no review.json"]);
  });

  test("inputs are checked", () => {
    expect(() => runner.start("nope", { note: "x" })).toThrow("unknown job nope");
    expect(() => runner.start("echo", {})).toThrow("Note is required");
    expect(() => runner.start("echo", { note: "x", extra: "y" })).toThrow("takes no input named extra");
    expect(() => runner.start("echo", { note: "x".repeat(2048) })).toThrow("larger than");
    expect(() => runner.start("echo", { note: { text: "x", ext: ".exe" } })).toThrow("must be one of .txt, .md");
  });

  test("delete needs the job marker and refuses symlinks", async () => {
    const j = await settle(runner.start("echo", { note: "x" }).id);
    expect(() => runner.remove("../etc")).toThrow("bad job id");
    writeFileSync(join(root, j.id, JOB_MARKER), "someone-else\n");
    expect(() => runner.remove(j.id)).toThrow("no matching job marker");
    writeFileSync(join(root, j.id, JOB_MARKER), `${j.id}\n`);
    runner.remove(j.id);
    expect(existsSync(join(root, j.id))).toBe(false);
    const target = mkdtempSync(join(tmpdir(), "bkt-target-"));
    symlinkSync(target, join(root, "20260930T000000-deadbeef"));
    expect(() => runner.remove("20260930T000000-deadbeef")).toThrow("symlinked");
    expect(existsSync(target)).toBe(true);
    rmSync(target, { recursive: true });
  });
});

describe("job routes", () => {
  let s: Serve;
  let auth: Record<string, string>;
  const req = (path: string, init: { method?: string; body?: unknown } = {}) =>
    fetch(`http://127.0.0.1:${s.port}${path}`, {
      method: init.method ?? "GET",
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      headers: { host: `127.0.0.1:${s.port}`, ...auth },
    });
  beforeEach(async () => {
    s = startServe({ uid: 3, resolvePeerUid: () => 3, routes: jobRoutes(runner) });
    auth = {};
    const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const r = await fetch(`http://127.0.0.1:${s.port}/session`, { method: "POST", body: JSON.stringify({ nonce }), headers: { host: `127.0.0.1:${s.port}`, origin: `http://127.0.0.1:${s.port}` } });
    auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
  });
  afterEach(() => s.stop());

  test("start, poll, cancel and delete over HTTP", async () => {
    const kinds = (await (await req("/local/jobs")).json()) as { kinds: { kind: string }[] };
    expect(kinds.kinds.map((k) => k.kind)).toContain("echo");
    const j = (await (await req("/local/jobs", { method: "POST", body: { kind: "sleep", files: { note: "x" } } })).json()) as JobView;
    expect((await req("/local/jobs", { method: "POST", body: { kind: "echo", files: { note: "x" } } })).status).toBe(409);
    expect(((await (await req(`/local/jobs/one?id=${j.id}`)).json()) as JobView).state).toBe("running");
    expect((await req("/local/jobs/delete", { method: "POST", body: { id: j.id } })).status).toBe(409);
    expect((await req("/local/jobs/cancel", { method: "POST", body: { id: j.id } })).status).toBe(200);
    await settle(j.id);
    expect((await req("/local/jobs/delete", { method: "POST", body: { id: j.id } })).status).toBe(200);
    expect((await req(`/local/jobs/one?id=${j.id}`)).status).toBe(404);
  });

  test("bad bodies and missing tokens are refused", async () => {
    expect((await req("/local/jobs", { method: "POST", body: { kind: "echo", files: { note: 3 } } })).status).toBe(400);
    auth = {};
    expect((await req("/local/jobs")).status).toBe(401);
  });
});

const HAS_DEPS = checkModules("python3", ["numpy", "scipy", "sklearn", "matplotlib"]) === null;

describe("real job specs", () => {
  test.skipIf(!HAS_DEPS)("fit-me runs on the host, imports its review and leaves no statement behind", async () => {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    const people = new PeopleStore(store, key);
    const cache = mkdtempSync(join(tmpdir(), "bkt-py-"));
    const r = new JobRunner({
      root,
      timeoutMs: 120_000,
      specs: jobSpecs({ src: buildPySource(join(import.meta.dir, ".."), REPO), cacheRoot: join(cache, "bkt", "py"), dataRoot: join(root, "fit-data"), people }),
    });
    const fixtures = join(REPO, "tools/prime-directions/tests/fixtures");
    const j = r.start("fit-me", {
      statement: readFileSync(join(fixtures, "statement-synthetic.md"), "utf8").repeat(4),
      people: readFileSync(join(fixtures, "people-synthetic.jsonl"), "utf8"),
    }, { k: 6, min_df: 2, max_df: 0.9, min_chars: 50 });
    let done = j;
    for (let i = 0; i < 1200 && done.state === "running"; i++) {
      await Bun.sleep(100);
      done = r.get(j.id)!;
    }
    if (done.error) console.log(done.log.slice(-3000));
    expect(done.error).toBeNull();
    expect(done.state).toBe("done");
    expect((done.result as { imported: number }).imported).toBeGreaterThan(100);
    expect(people.review()!.rows.length).toBeGreaterThan(100);
    expect(existsSync(join(root, j.id, "inputs"))).toBe(false);
    expect(existsSync(join(root, j.id, "out/fit/review.json"))).toBe(true);
    store.close();
    rmSync(cache, { recursive: true, force: true });
  }, 150_000);

  const HAS_NUMPY = checkModules("python3", ["numpy"]) === null;
  const TABLE = ["day,sleep_h,focus,mood"].concat(Array.from({ length: 40 }, (_, i) => `2026-08-${String((i % 28) + 1).padStart(2, "0")},${(6 + (i % 5) * 0.5).toFixed(1)},${50 + ((i * 7) % 40)},${i % 9 === 0 ? "" : "ok"}`)).join("\n");

  async function analyzed(text: string) {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    const cache = mkdtempSync(join(tmpdir(), "bkt-py-"));
    const r = new JobRunner({ root, timeoutMs: 120_000, specs: jobSpecs({ src: buildPySource(join(import.meta.dir, ".."), REPO), cacheRoot: join(cache, "bkt", "py"), dataRoot: root, people: new PeopleStore(store, key) }) });
    let done = r.start("analyze", { data: { text, ext: ".csv" } });
    for (let i = 0; i < 1200 && done.state === "running"; i++) {
      await Bun.sleep(100);
      done = r.get(done.id)!;
    }
    store.close();
    rmSync(cache, { recursive: true, force: true });
    return done;
  }

  test.skipIf(!HAS_NUMPY)("analyze returns a card of rows, columns and warnings", async () => {
    const done = await analyzed(TABLE);
    expect(done.state).toBe("done");
    const { card } = done.result as { card: AnalysisCard };
    expect(card.rows).toBe(40);
    expect(card.time).toBe("day");
    expect(card.columns).toEqual([
      { name: "day", kind: "datetime", unit: null, missing: 0, low: null, high: null },
      { name: "sleep", kind: "float", unit: "h", missing: 0, low: 6, high: 8 },
      { name: "focus", kind: "integer", unit: null, missing: 0, low: 50, high: 89 },
      { name: "mood", kind: "string", unit: null, missing: 5, low: null, high: null },
    ]);
    expect(card.warnings.map((w) => w.code)).toEqual(["W_MISSING", "W_TIME_ORDER", "W_TIME_DUP"]);
    expect(card.problems).toEqual([]);
  }, 150_000);

  test.skipIf(!HAS_NUMPY)("an analysis that stops on the table's form still returns its problems", async () => {
    const done = await analyzed("name,name\na,b\n");
    expect(done.state).toBe("failed");
    expect(done.error).toBe("exited with code 2");
    const { card } = done.result as { card: AnalysisCard };
    expect(card.problems.map((p) => p.code)).toEqual(["E_DUP_COLUMN", "E_NO_NUMERIC"]);
  }, 150_000);

  test("analyze names the install line when its module is missing", () => {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    const specs = jobSpecs({ src: { version: "x", files: {} }, cacheRoot: root, dataRoot: root, people: new PeopleStore(store, key), python: "python3", check: () => "this job needs numpy: python3 -m pip install --user numpy" });
    const j = new JobRunner({ root, specs }).start("analyze", { data: "a,b\n1,2\n" });
    expect(j.state).toBe("failed");
    expect(j.install).toBe("python3 -m pip install --user numpy");
    expect(j.result).toBeNull();
    store.close();
  });

  test("fit-me refuses with an install hint when Python modules are missing", () => {
    const key = newDataKey();
    const store = new Store(":memory:", key);
    const specs = jobSpecs({ src: { version: "x", files: {} }, cacheRoot: root, dataRoot: root, people: new PeopleStore(store, key), check: () => "this job needs scikit-learn" });
    const r = new JobRunner({ root, specs });
    expect(r.start("fit-me", { statement: "s", people: "p" }).error).toBe("this job needs scikit-learn");
    expect(() => r.start("fit-me", { statement: "s", people: "p" }, { k: 1 })).toThrow("k must be a whole number from 2 to 256");
    expect(() => r.start("fit-me", { statement: "s", people: "p" }, { shell: 1 })).toThrow("takes no option shell");
    store.close();
  });
});
