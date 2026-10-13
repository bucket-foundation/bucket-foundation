import { spawn } from "node:child_process";
import { join } from "node:path";

export const ANALYSIS_TIMEOUT_MS = 50_000;
export const MAX_STDOUT_BYTES = 32 * 1024 * 1024;

export type RunFailure = "analysis_local_only" | "analysis_timeout" | "analysis_failed" | "analysis_output";

export type RunResult = { ok: true; report: Record<string, unknown> } | { ok: false; error: RunFailure };

export type Env = Record<string, string | undefined>;

export interface RunInput {
  files: string[];
  outDir: string;
  names: string[];
}

export function analyzerScript(env: Env = process.env): string {
  return env.BKT_ANALYZE_SCRIPT || join(process.cwd(), "packages/bkt/analyze/marketing/bounded.py");
}

const childEnv = (env: Env): NodeJS.ProcessEnv => ({ NODE_ENV: "production", PATH: env.PATH ?? "/usr/bin:/bin", HOME: env.HOME ?? "/nonexistent", LANG: "C.UTF-8", MPLBACKEND: "Agg", PYTHONDONTWRITEBYTECODE: "1" });

export function runAnalyzer(input: RunInput, env: Env = process.env, timeoutMs = ANALYSIS_TIMEOUT_MS): Promise<RunResult> {
  const python = env.BKT_ANALYZE_PYTHON;
  if (!python) return Promise.resolve({ ok: false, error: "analysis_local_only" });
  const args = [analyzerScript(env), ...input.files, "--no-helix", "--marketing", "on", "--name", "marketing", "--out", input.outDir];
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };
    const child = spawn(python, args, { env: childEnv(env), stdio: ["ignore", "pipe", "pipe"], detached: true });
    const chunks: Buffer[] = [];
    let size = 0;
    const kill = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      kill();
      finish({ ok: false, error: "analysis_timeout" });
    }, timeoutMs);
    child.stdout.on("data", (b: Buffer) => {
      size += b.length;
      if (size > MAX_STDOUT_BYTES) {
        kill();
        finish({ ok: false, error: "analysis_output" });
        return;
      }
      chunks.push(b);
    });
    child.stderr.resume();
    child.on("error", () => finish({ ok: false, error: "analysis_failed" }));
    child.on("close", (code) => {
      const last = Buffer.concat(chunks).toString("utf8").trim().split("\n").pop() ?? "";
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = last ? (JSON.parse(last) as Record<string, unknown>) : null;
      } catch {
        parsed = null;
      }
      if (!parsed || "error" in parsed || (code !== 0 && code !== 2)) {
        finish({ ok: false, error: "analysis_failed" });
        return;
      }
      finish({ ok: true, report: scrubReport(parsed, input) });
    });
  });
}

export function scrubReport(report: Record<string, unknown>, input: Pick<RunInput, "files" | "names">): Record<string, unknown> {
  const rename = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const i = input.files.findIndex((f) => value === f || value.endsWith(`/${f.split("/").pop()}`) || value === f.split("/").pop());
    return i >= 0 ? input.names[i] : value;
  };
  const dirs = Array.from(new Set(input.files.map((f) => f.slice(0, f.lastIndexOf("/") + 1)).filter((d) => d.length > 1)));
  const scrubbed = dirs.reduce((text, d) => text.split(JSON.stringify(d).slice(1, -1)).join(""), JSON.stringify(report));
  const out: Record<string, unknown> = JSON.parse(scrubbed) as Record<string, unknown>;
  delete out.dir;
  delete out.helix;
  const form = out.form as Record<string, unknown> | undefined;
  if (form) out.form = { ...form, file: rename(form.file) };
  const m = out.marketing as { sources?: Record<string, unknown>[]; files?: Record<string, unknown>[]; warnings?: Record<string, unknown>[] } | undefined;
  if (m) {
    const fix = (rows?: Record<string, unknown>[]) => rows?.map((r) => ({ ...r, file: rename(r.file) }));
    const where = (rows?: Record<string, unknown>[]) =>
      rows?.map((w) => {
        const text = String(w.where ?? "");
        const idx = text.indexOf(": ");
        return idx > 0 ? { ...w, where: `${rename(text.slice(0, idx))}${text.slice(idx)}` } : w;
      });
    out.marketing = { ...m, sources: fix(m.sources), files: fix(m.files), warnings: where(m.warnings) };
  }
  return out;
}
