import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAdvisorReview } from "../../../src/lib/research-os/advisor-review";
import type { PySource } from "./pack/pysrc";
import type { JobDirs, JobSpec } from "./jobs";
import type { PeopleStore } from "./people";
import { platformFor } from "./platform";
import { extractPy } from "./pyruntime";

const MB = 1024 * 1024;

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

export interface SpecDeps {
  src: PySource;
  cacheRoot: string;
  dataRoot: string;
  people: PeopleStore;
  python?: string;
  check?: PyCheck;
  now?: () => number;
}

export function jobSpecs(d: SpecDeps): Record<string, JobSpec> {
  const python = d.python ?? platformFor().python();
  const check = d.check ?? checkModules;
  const now = d.now ?? Date.now;
  return {
    analyze: {
      label: "Analyze a data file",
      inputs: { data: { label: "Data file", maxBytes: 16 * MB, exts: [".csv", ".tsv", ".json", ".jsonl", ".txt"] } },
      plan: (dirs: JobDirs) => {
        const missing = check(python, ["numpy"]);
        if (missing) return { error: missing };
        const py = extractPy(d.src, d.cacheRoot);
        return {
          argv: [python, join(py, "bkt_analyze.py"), dirs.inputs.data, "--out", dirs.out],
          env: { BKT_HELIX_DIR: join(py, "helix"), BKT_PRIME_DIR: join(py, "helix") },
        };
      },
      after: (dirs: JobDirs) => ({ out: dirs.out }),
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
        if (missing) return { error: missing };
        const py = extractPy(d.src, d.cacheRoot);
        return {
          argv: [
            python, "-m", "prime_directions", "fit-me", "--statement", dirs.inputs.statement, "--people", dirs.inputs.people, "--out", join(dirs.out, "fit"),
            ...Object.entries(o).flatMap(([k, v]) => [`--${k.replace(/_/g, "-")}`, String(v)]),
          ],
          env: { PYTHONPATH: py, PRIME_DATA_ROOT: d.dataRoot, MPLBACKEND: "Agg" },
        };
      },
      after: (dirs: JobDirs) => {
        const file = join(dirs.out, "fit", "review.json");
        if (!existsSync(file)) throw new Error("fit-me wrote no review.json");
        return d.people.importReview(parseAdvisorReview(JSON.parse(readFileSync(file, "utf8"))), now());
      },
    },
  };
}
