import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAdvisorReview } from "../../../src/lib/research-os/advisor-review";
import type { PySource } from "./pack/pysrc";
import type { JobDirs, JobSpec } from "./jobs";
import type { PeopleStore } from "./people";
import { platformFor } from "./platform";
import { extractPy } from "./pyruntime";

const MB = 1024 * 1024;

export const JOB_THREADS = 4;
export const JOB_ADDRESS_BYTES = 8 * 1024 * MB;
export const JOB_NICE = 10;
export const THREAD_VARS = ["OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS"] as const;

export type Which = (bin: string) => string | null;

export function capJob(argv: string[], env: Record<string, string> = {}, which: Which = (b) => Bun.which(b)): { argv: string[]; env: Record<string, string> } {
  const prlimit = which("prlimit");
  const nice = which("nice");
  return {
    argv: [...(prlimit ? [prlimit, `--as=${JOB_ADDRESS_BYTES}`] : []), ...(nice ? [nice, "-n", String(JOB_NICE)] : []), ...argv],
    env: { ...env, ...Object.fromEntries(THREAD_VARS.map((v) => [v, String(JOB_THREADS)])) },
  };
}

export type PyCheck = (python: string, modules: string[]) => string | null;

export const checkModules: PyCheck = (python, modules) => {
  let code: number | null;
  try {
    code = Bun.spawnSync([python, "-c", modules.map((m) => `import ${m}`).join("; ")], { stdout: "ignore", stderr: "ignore" }).exitCode;
  } catch {
    code = null;
  }
  if (code === 0) return null;
  const pkgs = modules.map((m) => (m === "sklearn" ? "scikit-learn" : m)).join(" ");
  if (code === null) return `${python} not found; install Python 3, then ${python} -m pip install --user ${pkgs}`;
  return `this job needs ${pkgs}: ${python} -m pip install --user ${pkgs}`;
};

export function installLine(python: string, modules: string[]): string {
  return `${python} -m pip install --user ${modules.map((m) => (m === "sklearn" ? "scikit-learn" : m)).join(" ")}`;
}

export interface AnalysisNote {
  code: string;
  where: string;
  message: string;
}

export interface AnalysisCard {
  rows: number;
  truncated: boolean;
  time: string | null;
  columns: { name: string; kind: string; unit: string | null; missing: number; low: number | null; high: number | null }[];
  warnings: AnalysisNote[];
  problems: AnalysisNote[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const notes = (v: unknown): AnalysisNote[] =>
  (Array.isArray(v) ? v : []).filter((n): n is Record<string, unknown> => !!n && typeof n === "object").map((n) => ({ code: String(n.code ?? ""), where: String(n.where ?? ""), message: String(n.message ?? "") }));

export function analysisCard(report: unknown): AnalysisCard | null {
  const form = (report as { form?: Record<string, unknown> } | null)?.form;
  if (!form || typeof form !== "object" || !Array.isArray(form.columns)) return null;
  const summary = ((report as { analysis?: { summary?: Record<string, Record<string, unknown>> } }).analysis?.summary ?? {}) as Record<string, Record<string, unknown>>;
  const time = (form.time_index as { column?: unknown } | null)?.column;
  return {
    rows: num(form.rows) ?? 0,
    truncated: form.truncated === true,
    time: typeof time === "string" ? time : null,
    columns: (form.columns as Record<string, unknown>[]).map((c) => {
      const name = String(c.name ?? "");
      const s = Object.hasOwn(summary, name) ? summary[name] : undefined;
      return { name: String(c.base ?? name), kind: String(c.type ?? ""), unit: typeof c.unit === "string" ? c.unit : null, missing: num(c.missing) ?? 0, low: num(s?.min), high: num(s?.max) };
    }),
    warnings: notes(form.warnings),
    problems: notes(form.errors),
  };
}

function readCard(out: string): AnalysisCard | null {
  for (const name of existsSync(out) ? readdirSync(out).sort() : []) {
    const file = join(out, name, "report.json");
    if (existsSync(file)) return analysisCard(JSON.parse(readFileSync(file, "utf8")));
  }
  return null;
}

export interface SpecDeps {
  src: PySource;
  cacheRoot: string;
  dataRoot: string;
  people: PeopleStore;
  python?: string;
  check?: PyCheck;
  which?: Which;
  now?: () => number;
}

export function jobSpecs(d: SpecDeps): Record<string, JobSpec> {
  const python = d.python ?? platformFor().python();
  const check = d.check ?? checkModules;
  const now = d.now ?? Date.now;
  const cap = (argv: string[], env: Record<string, string>) => capJob(argv, env, d.which);
  return {
    analyze: {
      label: "Analyze a data file",
      inputs: { data: { label: "Data file", maxBytes: 16 * MB, exts: [".csv", ".tsv", ".json", ".jsonl", ".txt"] } },
      plan: (dirs: JobDirs) => {
        const missing = check(python, ["numpy"]);
        if (missing) return { error: missing, install: installLine(python, ["numpy"]) };
        const py = extractPy(d.src, d.cacheRoot);
        return cap([python, join(py, "bkt_analyze.py"), dirs.inputs.data, "--out", dirs.out], { BKT_HELIX_DIR: join(py, "helix"), BKT_PRIME_DIR: join(py, "helix") });
      },
      after: (dirs: JobDirs) => ({ out: dirs.out, card: readCard(dirs.out) }),
      failed: (dirs: JobDirs) => ({ out: dirs.out, card: readCard(dirs.out) }),
    },
    "fit-me": {
      label: "Fit me to a people file",
      inputs: {
        statement: { label: "Research statement", maxBytes: 2 * MB, exts: [".md", ".txt"] },
        people: { label: "People file", maxBytes: 64 * MB, exts: [".jsonl"] },
      },
      options: {
        k: { min: 2, max: 256, integer: true },
        min_df: { min: 1, max: 1000, integer: true },
        max_df: { min: 0.05, max: 1, integer: false },
        min_chars: { min: 0, max: 100_000, integer: true },
      },
      plan: (dirs: JobDirs, o: Record<string, number>) => {
        const missing = check(python, ["numpy", "scipy", "sklearn", "matplotlib"]);
        if (missing) return { error: missing, install: installLine(python, ["numpy", "scipy", "sklearn", "matplotlib"]) };
        const py = extractPy(d.src, d.cacheRoot);
        return cap(
          [
            python, "-m", "prime_directions", "fit-me", "--statement", dirs.inputs.statement, "--people", dirs.inputs.people, "--out", join(dirs.out, "fit"),
            ...Object.entries(o).flatMap(([k, v]) => [`--${k.replace(/_/g, "-")}`, String(v)]),
          ],
          { PYTHONPATH: py, PRIME_DATA_ROOT: d.dataRoot, MPLBACKEND: "Agg" },
        );
      },
      after: (dirs: JobDirs) => {
        const file = join(dirs.out, "fit", "review.json");
        if (!existsSync(file)) throw new Error("fit-me wrote no review.json");
        return d.people.importReview(parseAdvisorReview(JSON.parse(readFileSync(file, "utf8"))), now());
      },
    },
  };
}
