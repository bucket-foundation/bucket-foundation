import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { githubUrl, parseBeads, parseNotes, parsePrLog } from "./sources-parse";
import type { BeadFact, NoteFact, PrFact, WorkSources } from "./types";

export { githubUrl, parseBeads, parseNotes, parsePrLog };

export const GIT_TIMEOUT_MS = 3000;
export const MAX_PRS = 400;
export const NOTE_DIRS = ["_intake/ideas", "learning/research/_synthesis"];

export interface SourceStatus {
  beads: "ok" | "missing" | "error";
  prs: "ok" | "missing" | "error";
  notes: "ok" | "missing" | "error";
}

function repoRoot(): string {
  return process.env.WORK_QUIZ_ROOT || process.cwd();
}

function git(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, timeout: GIT_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

async function loadBeads(root: string): Promise<{ beads: BeadFact[]; status: SourceStatus["beads"] }> {
  try {
    return { beads: parseBeads(await fs.readFile(path.join(root, ".beads/issues.jsonl"), "utf8")), status: "ok" };
  } catch (e) {
    return { beads: [], status: (e as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "error" };
  }
}

async function loadPrs(root: string): Promise<{ prs: PrFact[]; repoUrl: string | null; status: SourceStatus["prs"] }> {
  try {
    const [log, remote] = await Promise.all([
      git(["log", "--first-parent", `-n${MAX_PRS}`, "--format=%cs|%s", "origin/dev"], root),
      git(["remote", "get-url", "origin"], root).catch(() => ""),
    ]);
    return { prs: parsePrLog(log), repoUrl: githubUrl(remote), status: "ok" };
  } catch (e) {
    return { prs: [], repoUrl: null, status: (e as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "error" };
  }
}

async function loadNotes(root: string): Promise<{ notes: NoteFact[]; status: SourceStatus["notes"] }> {
  const notes: NoteFact[] = [];
  let found = false;
  let failed = false;
  for (const dir of NOTE_DIRS) {
    let names: string[];
    try {
      names = await fs.readdir(path.join(root, dir));
      found = true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") failed = true;
      continue;
    }
    for (const name of names.filter((n) => n.endsWith(".md")).sort()) {
      try {
        notes.push(...parseNotes(`${dir}/${name}`, await fs.readFile(path.join(root, dir, name), "utf8")));
      } catch {
        failed = true;
      }
    }
  }
  return { notes, status: failed ? "error" : found ? "ok" : "missing" };
}

export async function loadWorkSources(): Promise<{ sources: WorkSources; status: SourceStatus }> {
  const root = repoRoot();
  const [b, p, n] = await Promise.all([loadBeads(root), loadPrs(root), loadNotes(root)]);
  if (b.status === "error" || p.status === "error" || n.status === "error") {
    console.warn("work-quiz: source read failed", { beads: b.status, prs: p.status, notes: n.status });
  }
  return {
    sources: { beads: b.beads, prs: p.prs, notes: n.notes, repoUrl: p.repoUrl },
    status: { beads: b.status, prs: p.status, notes: n.status },
  };
}
