import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import pysrc from "../content/pysrc.json" with { type: "json" };
import type { PySource } from "./pack/pysrc";
import { checkPython, pyPaths } from "./pyruntime";

export interface Issue {
  code: string;
  where: string;
  message: string;
}

export interface AnalysisReport {
  schema: string;
  name: string;
  created: string;
  dir: string;
  forced: boolean;
  form: { ok: boolean; format: string | null; rows: number; errors: Issue[]; warnings: Issue[]; columns: { name: string; type: string; unit: string | null }[] };
  analysis?: Record<string, unknown>;
  helix?: { status: string; reason?: string; run_dir?: string };
}

export interface AnalyzeOptions {
  file: string;
  force: boolean;
  noHelix: boolean;
  name?: string;
  horizon?: number;
  out?: string;
  json: boolean;
  tui: boolean;
  dev: boolean;
  maxRows?: number;
}

export interface AnalysisResult {
  code: number;
  report: AnalysisReport | null;
  stderr: string;
  cancelled: boolean;
}

export interface RunningAnalysis {
  done: Promise<AnalysisResult>;
  cancel: () => void;
}

export function analysesRoot(env = process.env): string {
  return env.BKT_ANALYSES ?? join(env.XDG_DATA_HOME ?? join(homedir(), ".local/share"), "bucket/analyses");
}

export function parseAnalyzeArgs(argv: string[]): AnalyzeOptions {
  const o: Partial<AnalyzeOptions> = { force: false, noHelix: false, json: false, tui: false, dev: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=", 2);
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === "--force") o.force = true;
    else if (flag === "--no-helix") o.noHelix = true;
    else if (flag === "--json") o.json = true;
    else if (flag === "--tui") o.tui = true;
    else if (flag === "--dev") o.dev = true;
    else if (flag === "--max-rows") {
      const m = Number(value());
      if (!Number.isInteger(m) || m < 1) throw new Error("--max-rows needs a positive whole number");
      o.maxRows = m;
    }
    else if (flag === "--name") o.name = value();
    else if (flag === "--out") o.out = value();
    else if (flag === "--horizon") {
      const h = Number(value());
      if (!Number.isInteger(h) || h < 0) throw new Error("--horizon needs a whole number");
      o.horizon = h;
    } else if (flag.startsWith("--")) throw new Error(`unknown flag ${flag}`);
    else if (o.file) throw new Error(`unexpected argument ${flag}`);
    else o.file = flag;
  }
  if (!o.file) throw new Error("usage: bkt analyze <file> [--force] [--no-helix] [--name N] [--horizon N] [--max-rows N] [--out DIR] [--json] [--tui] [--dev]");
  return o as AnalyzeOptions;
}

function fail(stderr: string): RunningAnalysis {
  return { done: Promise.resolve({ code: 1, report: null, stderr, cancelled: false }), cancel: () => {} };
}

export function startAnalysis(o: AnalyzeOptions, env = process.env, src: PySource = pysrc as PySource): RunningAnalysis {
  const python = (o.dev && env.BKT_PYTHON) || "python3";
  const missing = checkPython(python);
  if (missing) return fail(missing);
  let paths;
  try {
    paths = pyPaths(src, o.dev, env);
  } catch (e) {
    return fail(`could not unpack the analyzer: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!existsSync(paths.script)) return fail(`analyzer not found at ${paths.script}`);
  const args = [paths.script, resolve(o.file), "--out", o.out ?? analysesRoot(env)];
  if (o.force) args.push("--force");
  if (o.noHelix) args.push("--no-helix");
  if (o.name) args.push("--name", o.name);
  if (o.horizon !== undefined) args.push("--horizon", String(o.horizon));
  if (o.maxRows !== undefined) args.push("--max-rows", String(o.maxRows));
  const childEnv: Record<string, string | undefined> = { ...env };
  if (paths.helixDir) {
    childEnv.BKT_HELIX_DIR = paths.helixDir;
    childEnv.BKT_PRIME_DIR = paths.helixDir;
  }
  const proc = Bun.spawn([python, ...args], { env: childEnv, stdout: "pipe", stderr: "pipe" });
  let cancelled = false;
  const done = (async () => {
    const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    const code = await proc.exited;
    const last = stdout.trim().split("\n").pop() ?? "";
    let report: AnalysisReport | null = null;
    try {
      report = last ? (JSON.parse(last) as AnalysisReport) : null;
    } catch {
      report = null;
    }
    return { code, report, stderr, cancelled };
  })();
  return {
    done,
    cancel: () => {
      cancelled = true;
      proc.kill("SIGTERM");
    },
  };
}

export function runAnalysis(o: AnalyzeOptions, env = process.env): Promise<AnalysisResult> {
  return startAnalysis(o, env).done;
}

export function formLines(r: AnalysisReport): string[] {
  const f = r.form;
  const lines = [`form ${f.ok ? "PASS" : "FAIL"}: ${f.format ?? "unknown"}, ${f.rows} rows, ${f.columns.length} columns`];
  for (const e of f.errors) lines.push(`  error ${e.code} ${e.where}: ${e.message}`);
  for (const w of f.warnings) lines.push(`  warn  ${w.code} ${w.where}: ${w.message}`);
  return lines;
}

export interface Section {
  title: string;
  body: string[];
}

export function sections(markdown: string): Section[] {
  const out: Section[] = [];
  let cur: Section = { title: "Overview", body: [] };
  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ")) {
      if (cur.body.some((l) => l.trim()) || out.length === 0) out.push(cur);
      cur = { title: line.slice(3).trim(), body: [] };
    } else if (!line.startsWith("# ")) cur.body.push(line);
  }
  out.push(cur);
  return out.map((s) => ({ ...s, body: trimBlank(s.body) }));
}

function trimBlank(lines: string[]): string[] {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].trim()) a++;
  while (b > a && !lines[b - 1].trim()) b--;
  return lines.slice(a, b);
}

export interface SavedAnalysis {
  name: string;
  dir: string;
  mtime: number;
}

export function listAnalyses(root = analysesRoot()): SavedAnalysis[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((name) => ({ name, dir: join(root, name) }))
    .filter((a) => existsSync(join(a.dir, "report.md")))
    .map((a) => ({ ...a, mtime: statSync(join(a.dir, "report.md")).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

export function loadSections(dir: string): Section[] {
  return sections(readFileSync(join(dir, "report.md"), "utf8"));
}
