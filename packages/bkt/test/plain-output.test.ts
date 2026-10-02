import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { render } from "ink";
import type { AnalysisReport, AnalysisResult, RunningAnalysis } from "../src/analyze";
import { AnalysisBrowser, AnalyzeRun } from "../src/analyze-view";
import { App } from "../src/app";
import { packCanon } from "../src/core/search";
import type { CanonPack } from "../src/pack/canon";
import { analysisRows, stamp } from "../src/cli/out";
import { CLI_COMMANDS, commandHelp, generalHelp, type CommandSpec } from "../src/cli/table";
import type { Item } from "../src/grade";
import { freezeBank, reviewBank } from "../src/hai/bank";
import type { AiScores } from "../src/hai/probe";
import { GAIN_LABEL, RATIO_LABEL, reportRows, reportSentences } from "../src/hai/report-text";
import { MODEL } from "../src/hai/score";
import type { Report } from "../src/hai/session";
import { HaiStore } from "../src/hai/store";
import { SHORT_FIELDS } from "../src/short-fields";
import { HaiApp } from "../src/hai/view";
import { MemoryKeyring } from "../src/keyring";
import { openSession, type Session } from "../src/setup";
import { describeUpdate } from "../src/update";
import { VERSION } from "../src/version";

const CLI = join(import.meta.dir, "../src/cli.tsx");

function parsesAsData(t: string): boolean {
  try {
    const v: unknown = JSON.parse(t);
    return v !== null && typeof v === "object";
  } catch {
    return false;
  }
}

function structured(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const found: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 3) found.push(`quoted keys: ${run.join(" ")}`);
    run = [];
  };
  for (const line of lines) {
    const t = line.trim();
    if (/^[[{]/.test(t) && parsesAsData(t)) found.push(`parses: ${t}`);
    if (/^"[^"]+"\s*:/.test(t)) run.push(t);
    else flush();
  }
  flush();
  return found;
}

const DENY: { name: string; re: RegExp }[] = [
  { name: "json", re: /json/i },
  { name: "csv", re: /\bcsv\b/i },
  { name: "tsv", re: /\btsv\b/i },
  { name: "api", re: /\bapi\b/i },
  { name: "python", re: /python/i },
  { name: "numpy", re: /numpy/i },
  { name: "bead", re: /bead/i },
  { name: "hash", re: /\bhash(es|ed)?\b/i },
  { name: "home path", re: /~\// },
  { name: "id: prefix and code", re: /\b[a-z]{2,5}-(?=[a-z0-9]*\d)[a-z0-9]{2,8}\b/ },
  { name: "id: snake case", re: /\b[a-z0-9]+_[a-z0-9_]+\b/ },
  { name: "id: hex", re: /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/ },
];

const ALLOW = new Set<string>([]);

function denied(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !ALLOW.has(l))
    .flatMap((l) => DENY.filter((d) => d.re.test(l)).map((d) => `${d.name}: ${l}`));
}

describe("the structure check", () => {
  test("catches a JSON line, a JSON array and a block of quoted keys", () => {
    expect(structured('{"v":1,"items":3}')).toHaveLength(1);
    expect(structured("ok\n[1,2]\n")).toHaveLength(1);
    expect(structured('{\n  "device": "a",\n  "publicKey": "b",\n  "pack": "c"\n}')).toHaveLength(1);
  });

  test("passes a bare number, a word, aligned rows and a bracketed note", () => {
    expect(structured("42")).toEqual([]);
    expect(structured("true")).toEqual([]);
    expect(structured("Items       998\nCards seen  0")).toEqual([]);
    expect(structured("[draft] two rows")).toEqual([]);
    expect(structured('"probes": []\n"answers": []')).toEqual([]);
  });

  test("the screen denylist catches format words, paths and ids", () => {
    expect(denied(["Open review.json", "Pick a CSV", "see ~/data", "device 3fa9c2d17b", "task bkt-398t", "the due_at field"])).toHaveLength(6);
    expect(denied(["Waiting to sync 0", "1-4 answer, s skip, q stop"])).toEqual([]);
  });
});

let dir: string;
let env: Record<string, string>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-plain-"));
  mkdirSync(join(dir, "bin"));
  env = {
    PATH: join(dir, "bin"),
    HOME: join(dir, "user"),
    BKT_HOME: join(dir, "data"),
    BKT_ANALYSES: join(dir, "analyses"),
    XDG_RUNTIME_DIR: join(dir, "run"),
    TMPDIR: dir,
    DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent/bkt-test-bus",
  };
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function bkt(args: string[], stdin?: string) {
  const r = Bun.spawnSync([process.execPath, CLI, ...args], {
    env,
    stdin: stdin === undefined ? "ignore" : Buffer.from(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

const vault = ["--keyring", "passphrase", "--passphrase-fd", "0"];

const NOT_SPAWNED: Record<string, string> = {
  app: "opens a window",
  serve: "runs until stopped and prints one address",
  update: "calls the release server; describeUpdate is checked below",
};

function plans(spec: CommandSpec): { args: string[]; stdin?: string }[] {
  const words = spec.name.split(" ");
  if (spec.name === "analyze") return [{ args: ["analyze", join(dir, "missing-file")] }];
  if (spec.name === "analyses") return [{ args: ["analyses"] }, { args: ["analyses", "--where"] }, { args: ["analyses", join(dir, "nowhere")] }];
  if (spec.name === "hai score") return [{ args: [...words, "--dry-run", "--dir", join(dir, "hai")] }];
  if (spec.name === "hai freeze" || spec.name === "hai review") return [{ args: [...words, "--dir", join(dir, "hai")] }];
  if (spec.name === "search") return [{ args: ["search", "light"] }, { args: ["search", "zzzqqqxx"] }];
  if (spec.name === "canon show") return [{ args: ["canon", "show", "1"] }, { args: ["canon", "show", "999999999"] }];
  if (spec.name === "completion") return ["bash", "zsh", "fish"].map((shell) => ({ args: ["completion", shell] }));
  if (spec.name === "help") return [{ args: ["help"] }, ...CLI_COMMANDS.map((c) => ({ args: ["help", ...c.name.split(" ")] }))];
  if (spec.session && !spec.terminal) return [{ args: [...words, ...vault], stdin: "pw\n" }];
  return [{ args: words }];
}

describe("default command output", () => {
  test("every command without --json prints no JSON line and no block of quoted keys", () => {
    const one = join(env.BKT_ANALYSES, "Sales");
    mkdirSync(one, { recursive: true });
    writeFileSync(join(one, "report.md"), "# Sales\n");
    const ran: string[] = [];
    const order = [...CLI_COMMANDS].sort((a, b) => Number(b.name === "init") - Number(a.name === "init") || Number(b.name === "hai freeze") - Number(a.name === "hai freeze"));
    for (const spec of order) {
      if (spec.data) {
        expect(commandHelp(spec), spec.name).toContain("for scripts");
        continue;
      }
      if (NOT_SPAWNED[spec.name]) continue;
      for (const plan of plans(spec)) {
        const r = bkt(plan.args, plan.stdin);
        const label = `bkt ${plan.args.join(" ")}`;
        expect(r.out + r.err, label).not.toBe("");
        expect(structured(r.out), label).toEqual([]);
        expect(structured(r.err), label).toEqual([]);
      }
      ran.push(spec.name);
    }
    expect([...ran, ...Object.keys(NOT_SPAWNED), ...CLI_COMMANDS.filter((c) => c.data).map((c) => c.name)].sort()).toEqual(CLI_COMMANDS.map((c) => c.name).sort());
    expect(CLI_COMMANDS.filter((c) => c.data).map((c) => c.name)).toEqual(["hai export"]);
  }, 240_000);

  test("init, whoami, stats and hai report print labelled rows and sentences", () => {
    const init = bkt(["init", ...vault], "pw\n");
    expect(init.code).toBe(0);
    expect(init.out.split("\n").slice(0, 2).map((l) => l.replace(/\s{2,}.*/, ""))).toEqual(["Bucket is ready on this device.", "This device"]);
    const labels = (out: string) => out.trimEnd().split("\n").map((l) => l.split(/\s{2,}/)[0]);
    expect(labels(bkt(["whoami", ...vault], "pw\n").out)).toEqual(["This device", "Public key", "New device", "Key store", "Content version", "Items added", "Database mode"]);
    expect(labels(bkt(["stats", ...vault], "pw\n").out)).toEqual(["Items", "Cards seen", "Due now", "Attempts"]);
    expect(bkt(["hai", "report", ...vault], "pw\n")).toEqual({ code: 0, out: "No retested probes yet. Scores appear after the first retest.\nNo retest is waiting.\n", err: "" });
  }, 120_000);

  test("analyses rows align name and date, with the folder behind --where", () => {
    const at = new Date(2026, 9, 1, 9, 5).getTime();
    const rows = [
      { name: "Sales", dir: "/data/Sales", mtime: at },
      { name: "Rainfall", dir: "/data/Rainfall", mtime: at },
    ];
    expect(stamp(at)).toBe("2026-10-01 09:05");
    expect(analysisRows(rows, false)).toBe("Sales     2026-10-01 09:05\nRainfall  2026-10-01 09:05");
    expect(analysisRows(rows, true)).toBe("Sales     2026-10-01 09:05  /data/Sales\nRainfall  2026-10-01 09:05  /data/Rainfall");
  });

  test("update describes each result in sentences", () => {
    const texts = [
      describeUpdate({ status: "current", version: VERSION }),
      describeUpdate({ status: "error", error: "no network" }),
      describeUpdate({ status: "available", version: "9.9.9", tag: "bkt-v9.9.9", asset: "bkt-linux-x64", sha256: "ab".repeat(32), url: "https://example.test/bkt" }),
    ];
    for (const t of texts) expect(structured(t)).toEqual([]);
  });

  test("help says --json is for scripts on every command that takes it", () => {
    expect(generalHelp(VERSION)).toContain("--json");
    for (const c of CLI_COMMANDS) {
      const line = commandHelp(c).split("\n").find((l) => l.includes("--json"));
      if (c.json || c.options?.json) expect(line, c.name).toContain("for scripts");
      else expect(line, c.name).toBeUndefined();
    }
    expect(commandHelp(CLI_COMMANDS.find((c) => c.name === "hai report")!)).toContain("as sentences");
  });
});

class FakeOut extends EventEmitter {
  columns = 100;
  rows = 40;
  frames: string[] = [];
  write = (chunk: string) => {
    this.frames.push(chunk);
    return true;
  };
}

class FakeIn extends EventEmitter {
  isTTY = true;
  private pending: string | null = null;
  setEncoding() {}
  setRawMode() {}
  resume() {}
  pause() {}
  ref() {}
  unref() {}
  read = () => {
    const d = this.pending;
    this.pending = null;
    return d;
  };
  send(keys: string) {
    this.pending = keys;
    this.emit("readable");
  }
}

const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
const settle = () => Bun.sleep(40);

async function screen(node: React.ReactElement, keys: string[] = []) {
  const out = new FakeOut();
  const input = new FakeIn();
  const app = render(node, {
    stdout: out as unknown as NodeJS.WriteStream,
    stdin: input as unknown as NodeJS.ReadStream,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  await settle();
  for (const k of keys) {
    input.send(k);
    await settle();
  }
  app.unmount();
  const lines = out.frames.flatMap((f) => f.replace(ANSI, "").split("\n"));
  const shown = out.frames.map((f) => f.replace(ANSI, "")).filter((f) => f.trim());
  return { lines, last: shown.at(-1) ?? "" };
}

const words = ["heat", "light", "mass", "charge", "force", "field", "wave", "time"];
const items: Item[] = Array.from({ length: 120 }, (_, n) => ({
  id: `item ${n}`,
  atomId: `topic ${n}`,
  branch: `branch ${n % 3}`,
  title: `Topic ${n}`,
  level: n % 2 ? "recall" : "apply",
  prompt: `What is ${words[n % 8]} number ${n}?`,
  answer: `It is ${words[(n + 3) % 8]} number ${n}${"!".repeat(n % 5)}`,
}));

const quizItems: Item[] = Object.entries(SHORT_FIELDS.items)
  .slice(0, 12)
  .map(([id, f], n) => ({ id, atomId: `quiz ${n}`, branch: id.split("/")[0], title: `Quiz ${n}`, level: "recall", prompt: f.short_stem, answer: f.short_answer }));

async function session(): Promise<Session> {
  const s = await openSession(new MemoryKeyring(), join(dir, "data"));
  s.store.importPack("pack one", quizItems);
  return s;
}

describe("terminal app screens", () => {
  test("home, stats, help, palette, quiz and review use plain words", async () => {
    const s = await session();
    try {
      const el = React.createElement(App, { session: s });
      const stats = await screen(el, ["j", "j", "\r"]);
      expect(stats.last).toContain("Waiting to sync 0");
      expect(stats.last).toContain("bkt whoami shows this device and its key store.");
      expect(stats.last).not.toContain(s.device.id);
      for (const gone of ["outbox", "keyring"]) expect(stats.last).not.toContain(gone);
      const help = await screen(el, ["?"]);
      expect(help.last).toContain("command palette");
      const palette = await screen(el, [":"]);
      expect(palette.last).toContain("your counts");
      const quiz = await screen(el, ["\r", "1", "\r", "q"]);
      expect(quiz.lines.join("\n")).toContain("enter for next");
      const review = await screen(el, ["j", "\r", " ", "3"]);
      expect(review.lines.join("\n")).toMatch(/space to reveal|Nothing due/);
      for (const shot of [stats, help, palette, quiz, review]) expect(denied(shot.lines)).toEqual([]);
    } finally {
      s.store.close();
    }
  }, 30_000);

  test("search, graph, learn, research and jobs screens use plain words", async () => {
    const s = await session();
    const canon = packCanon({
      excerpts: [{ rowid: 3, branch: "02-physics", concept: "speed-of-light", slug: "one", title: "Light keeps one speed", text: "light travels at one speed", path: "sources/a.md", source: {} }],
      evidence: { "3": [{ score: 1, kind: "talk", source_path: "sources/talks/one.md", text: "the speed of light is constant", url: "https://www.youtube.com/watch?v=x", title: "Relativity lecture", author: "A. Speaker" }] },
    } as unknown as CanonPack);
    const copied: string[] = [];
    const opened: string[] = [];
    const sources = {
      canon,
      graph: null,
      research: () => ({ notes: [{ title: "Water notes", pinned: true, updatedAt: new Date(2026, 9, 1).getTime() }], saved: { results: 4, importedAt: new Date(2026, 9, 1).getTime() } }),
      jobs: () => [{ name: "Sales", mtime: new Date(2026, 9, 1).getTime() }],
      openRoute: (r: string) => opened.push(r),
      copy: (t: string) => copied.push(t),
    };
    try {
      const el = React.createElement(App, { session: s, sources });
      const learn = await screen(el);
      expect(learn.last).toContain("1 Search  2 Graph  3 Learn  4 Research  5 Jobs");
      const graph = await screen(el, ["2", "o"]);
      expect(graph.last).toContain("No graph in this pack yet.");
      const research = await screen(el, ["4"]);
      expect(research.last).toContain("* Water notes");
      expect(research.last).toContain("Saved results: 4");
      const jobs = await screen(el, ["\t", "\t"]);
      expect(jobs.last).toContain("Sales");
      const found = await screen(el, ["1", "l", "i", "g", "h", "t", "\r", "\r", "y", "o"]);
      expect(found.last).toContain("Evidence, 1 passage");
      expect(found.last).toContain("Relativity lecture, A. Speaker");
      expect(found.last).toContain("Copied excerpt number 3.");
      expect(copied).toEqual(["3"]);
      expect(opened).toEqual(["/atlases", "/canon"]);
      const empty = await screen(React.createElement(App, { session: s }), ["1", "x", "y", "z"]);
      expect(empty.last).toContain("This copy of bkt holds no canon.");
      for (const shot of [learn, graph, research, jobs, found, empty]) {
        expect(denied(shot.lines)).toEqual([]);
        expect(structured(shot.lines.join("\n"))).toEqual([]);
      }
    } finally {
      s.store.close();
    }
  }, 30_000);

  test("the probe's consent, home, blocked, question and results screens use plain words", async () => {
    const s = await session();
    try {
      const hai = new HaiStore(s.store, s.key);
      const none = { bank: null, review: null, scores: null };
      const consent = await screen(React.createElement(HaiApp, { hai, data: none }));
      expect(consent.last).toContain("bkt hai report");
      const blocked = await screen(React.createElement(HaiApp, { hai, data: none }), ["y", "p"]);
      expect(blocked.last).toContain("Run bkt hai freeze.");
      const results = await screen(React.createElement(HaiApp, { hai, data: none }), ["r"]);
      expect(results.last).toContain("No retested probes yet.");

      const bank = freezeBank(items, "pack one");
      const answers: AiScores["answers"] = {};
      bank.items.forEach((i, n) => (answers[i.id] = { choice: i.answerIndex, correct: n % 3 !== 0, rationale: `the ${words[n % 8]} rule` }));
      const data = { bank, review: reviewBank(bank, []), scores: { bankVersion: bank.version, model: MODEL, scoredAt: "2026-10-01", answers } };
      const run = await screen(React.createElement(HaiApp, { hai, data }), ["p", "1", "s"]);
      expect(run.lines.join("\n")).toContain("1-4 answer, s skip, q stop");
      for (const shot of [consent, blocked, results, run]) expect(denied(shot.lines)).toEqual([]);
    } finally {
      s.store.close();
    }
  }, 30_000);

  test("probe results name Gain with AI and Ratio with AI, each with a one-line meaning", () => {
    const e = { value: 0.1, lo: 0.02, hi: 0.18 };
    const full: Report = {
      summary: { pairs: 40, retested: 40, H: 0.5, J: 0.7, A: 0.6, D: e, m: { value: 1.17, lo: null, hi: null }, R: e, L: { value: null, lo: null, hi: null }, JminusH: e, dependence: false },
      retestedProbes: 2,
      trend: false,
      nextRetest: null,
    };
    const rows = reportRows(full, null);
    const gain = rows.find((r) => r.text.startsWith(GAIN_LABEL))!;
    const ratio = rows.find((r) => r.text.startsWith(RATIO_LABEL))!;
    expect(gain).toEqual({ text: "Gain with AI: 0.10 (95% range 0.02 to 0.18).", meaning: "Your score with AI minus the better of you alone and AI alone." });
    expect(ratio).toEqual({ text: "Ratio with AI: 1.17 (range unknown).", meaning: "Your score with AI divided by the better of you alone and AI alone." });
    const text = reportSentences(rows);
    expect(text).toContain("Learning: not enough data. A week later, your score on questions first seen with AI minus your score on questions first seen alone.");
    for (const line of text) expect(line).not.toMatch(/\b[DmHJARL] ?[=:]|max\(|\bCI\b/);
    expect(denied(text)).toEqual([]);
    expect(structured(text.join("\n"))).toEqual([]);
  });

  test("the analysis browser and a running analysis use plain words", async () => {
    const one = join(dir, "analyses", "Sales");
    mkdirSync(one, { recursive: true });
    writeFileSync(join(one, "report.md"), "# Sales\n\nTwelve rows.\n\n## Trend\n\nRising.\n");
    const empty = await screen(React.createElement(AnalysisBrowser, { root: join(dir, "nowhere") }));
    expect(empty.last).toContain("none yet");
    const browse = await screen(React.createElement(AnalysisBrowser, { root: join(dir, "analyses") }), ["l", "l"]);
    expect(browse.lines.join("\n")).not.toContain(dir);
    expect(browse.lines).toContain("Sales");

    const report = { dir: one, form: { ok: true, format: "csv", rows: 12, columns: [{}, {}, {}], errors: [], warnings: [] } } as unknown as AnalysisReport;
    const running = (r: AnalysisResult, wait = 0): RunningAnalysis => ({ done: Bun.sleep(wait).then(() => r), cancel() {} }) as RunningAnalysis;
    const noop = () => {};
    const busy = await screen(React.createElement(AnalyzeRun, { run: running({ code: 0, report, stderr: "", cancelled: false }, 5_000), file: "sales figures", onResult: noop }));
    expect(busy.last).toContain("analyzing sales figures");
    const done = await screen(React.createElement(AnalyzeRun, { run: running({ code: 0, report, stderr: "", cancelled: false }), file: "sales figures", onResult: noop }));
    expect(done.last).toContain("The data check passed: 12 rows, 3 columns");
    const failed = await screen(React.createElement(AnalyzeRun, { run: running({ code: 1, report: null, stderr: "", cancelled: false }), file: "sales figures", onResult: noop }));
    expect(failed.last).toContain("analyzer produced no report");
    for (const shot of [empty, browse, busy, done, failed]) expect(denied(shot.lines)).toEqual([]);
  }, 30_000);
});
