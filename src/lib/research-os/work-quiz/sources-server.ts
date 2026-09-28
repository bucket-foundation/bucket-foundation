import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BeadFact, NoteFact, PrFact, WorkSources } from "./types";

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

export function parseBeads(jsonl: string): BeadFact[] {
  const out: BeadFact[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.status !== "string") continue;
      out.push({
        id: r.id,
        title: r.title.slice(0, 200),
        status: r.status,
        priority: typeof r.priority === "number" ? r.priority : 2,
        createdAt: typeof r.created_at === "string" ? r.created_at.slice(0, 10) : "",
      });
    } catch {
      continue;
    }
  }
  return out;
}

export function parsePrLog(log: string): PrFact[] {
  const rows: Omit<PrFact, "order">[] = [];
  for (const line of log.split("\n")) {
    const [date, ...rest] = line.split("|");
    const subject = rest.join("|");
    const m = subject.match(/\(#(\d+)\)\s*$/);
    if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({ number: Number(m[1]), title: subject.slice(0, 200), date });
  }
  return rows.reverse().map((r, order) => ({ ...r, order }));
}

export function parseNotes(file: string, text: string): NoteFact[] {
  const date = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
  const out: NoteFact[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m && m[1].length <= 120) out.push({ file, heading: m[1], date });
  }
  return out;
}

export function githubUrl(remote: string): string | null {
  const m = remote.trim().match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(\.git)?$/);
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
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
