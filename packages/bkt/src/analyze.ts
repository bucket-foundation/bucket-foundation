import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

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
}

export function analysesRoot(env = process.env): string {
  return env.BKT_ANALYSES ?? join(env.XDG_DATA_HOME ?? join(homedir(), ".local/share"), "bucket/analyses");
}

export function analyzerScript(env = process.env): string {
  return env.BKT_ANALYZE_PY ?? resolve(import.meta.dir, "../analyze/bkt_analyze.py");
}

export function parseAnalyzeArgs(argv: string[]): AnalyzeOptions {
  const o: Partial<AnalyzeOptions> = { force: false, noHelix: false, json: false, tui: false };
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
  if (!o.file) throw new Error("usage: bkt analyze <file> [--force] [--no-helix] [--name N] [--horizon N] [--out DIR] [--json] [--tui]");
  return o as AnalyzeOptions;
}

export function runAnalysis(o: AnalyzeOptions, env = process.env): { code: number; report: AnalysisReport | null; stderr: string } {
  const script = analyzerScript(env);
  if (!existsSync(script)) return { code: 1, report: null, stderr: `analyzer not found at ${script}; set BKT_ANALYZE_PY` };
  const args = [script, resolve(o.file), "--out", o.out ?? analysesRoot(env)];
  if (o.force) args.push("--force");
  if (o.noHelix) args.push("--no-helix");
  if (o.name) args.push("--name", o.name);
  if (o.horizon !== undefined) args.push("--horizon", String(o.horizon));
  const p = Bun.spawnSync([env.BKT_PYTHON ?? "python3", ...args], { env, stdout: "pipe", stderr: "pipe" });
  const stdout = p.stdout.toString().trim();
  const stderr = p.stderr.toString();
  const last = stdout.split("\n").pop() ?? "";
  let report: AnalysisReport | null = null;
  try {
    report = last ? (JSON.parse(last) as AnalysisReport) : null;
  } catch {
    report = null;
  }
  return { code: p.exitCode ?? 1, report, stderr };
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
