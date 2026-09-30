import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { generateQuestion, sourcesEmpty } from "../../../src/lib/research-os/work-quiz/generate";
import { gradeAnswer, normalizeResponse } from "../../../src/lib/research-os/work-quiz/grade";
import { githubUrl, parseBeads, parsePrLog } from "../../../src/lib/research-os/work-quiz/sources-parse";
import { toPublic, type BeadFact, type QuizQuestion, type WorkSources } from "../../../src/lib/research-os/work-quiz/types";
import { open, seal } from "./crypto";
import type { Route } from "./serve";
import type { Store } from "./store";

export const GIT_TIMEOUT_MS = 3000;
export const MAX_PRS = 400;
export const BEADS_BODY_BYTES = 32 * 1024 * 1024;
export const MAX_BEAD_BYTES = 24 * 1024 * 1024;
export const MAX_BEAD_LINES = 100_000;

export const SAFE_GIT_CONFIG = [
  "-c", "core.fsmonitor=false",
  "-c", "core.hooksPath=/dev/null",
  "-c", "core.pager=cat",
  "-c", "core.untrackedCache=false",
  "-c", "diff.external=",
  "-c", "log.showSignature=false",
  "-c", "gpg.program=/bin/false",
  "-c", "protocol.allow=never",
];

export type GitRunner = (args: string[], cwd: string) => Promise<string>;

export const runGit: GitRunner = (args, cwd) =>
  new Promise((done, fail) => {
    execFile(
      "git",
      [...SAFE_GIT_CONFIG, "--no-optional-locks", ...args],
      {
        cwd,
        timeout: GIT_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin", GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_OPTIONAL_LOCKS: "0" },
      },
      (err, stdout) => (err ? fail(err) : done(stdout)),
    );
  });

export class RepoPathError extends Error {}

export function checkRepoPath(raw: string, home = homedir()): string {
  if (typeof raw !== "string" || !raw.trim()) throw new RepoPathError("give the folder of a git repository");
  const expanded = raw.trim().replace(/^~(?=$|\/)/, home);
  if (!isAbsolute(expanded)) throw new RepoPathError("use a full path, such as ~/code/project");
  const abs = resolve(expanded);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) throw new RepoPathError("that folder does not exist");
  const real = realpathSync(abs);
  const rel = relative(realpathSync(home), real);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new RepoPathError("pick a repository inside your home folder");
  if (!existsSync(join(real, ".git"))) throw new RepoPathError("that folder is not a git repository");
  return real;
}

export class WorkQuizStore {
  constructor(
    private store: Store,
    private key: Buffer,
  ) {}

  private row() {
    return this.store.db.query<{ beads: string | null; repo: string | null; updated_at: number }, []>("select beads, repo, updated_at from work_quiz_source where id = 1").get() ?? null;
  }

  beads(): BeadFact[] {
    const r = this.row();
    return r?.beads ? (JSON.parse(open(this.key, r.beads, "work_quiz_beads")) as BeadFact[]) : [];
  }

  repo(): string | null {
    const r = this.row();
    return r?.repo ? open(this.key, r.repo, "work_quiz_repo") : null;
  }

  setBeads(beads: BeadFact[], now: number) {
    this.store.db
      .query("insert into work_quiz_source (id, beads, updated_at) values (1, ?, ?) on conflict(id) do update set beads = excluded.beads, updated_at = excluded.updated_at")
      .run(seal(this.key, JSON.stringify(beads), "work_quiz_beads"), now);
  }

  setRepo(repo: string | null, now: number) {
    this.store.db
      .query("insert into work_quiz_source (id, repo, updated_at) values (1, ?, ?) on conflict(id) do update set repo = excluded.repo, updated_at = excluded.updated_at")
      .run(repo === null ? null : seal(this.key, repo, "work_quiz_repo"), now);
  }

  clear() {
    this.store.db.run("delete from work_quiz_source");
  }

  record(q: QuizQuestion, correct: boolean, rating: number, elapsedMs: number, at: number) {
    this.store.db
      .query("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at) values (?, ?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), q.id, q.type, correct ? 1 : 0, rating, Math.round(elapsedMs), at);
  }

  tally(): { answered: number; correct: number } {
    const r = this.store.db.query<{ n: number; c: number | null }, []>("select count(*) n, sum(correct) c from work_quiz_attempts").get()!;
    return { answered: r.n, correct: r.c ?? 0 };
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function body(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export interface WorkQuizOptions {
  git?: GitRunner;
  now?: () => number;
  home?: string;
  seed?: () => string;
}

export function workQuizRoutes(wq: WorkQuizStore, o: WorkQuizOptions = {}): Record<string, Route> {
  const git = o.git ?? runGit;
  const now = o.now ?? Date.now;
  const seed = o.seed ?? (() => randomUUID());
  const issued = new Map<string, { q: QuizQuestion; at: number }>();

  async function sources(): Promise<{ sources: WorkSources; repoError: string | null }> {
    const repo = wq.repo();
    let prs: WorkSources["prs"] = [];
    let repoUrl: string | null = null;
    let repoError: string | null = null;
    if (repo) {
      try {
        const [log, remote] = await Promise.all([
          git(["log", "--first-parent", `-n${MAX_PRS}`, "--format=%cs|%s", "HEAD"], repo),
          git(["remote", "get-url", "origin"], repo).catch(() => ""),
        ]);
        prs = parsePrLog(log);
        repoUrl = githubUrl(remote);
      } catch {
        repoError = "git log did not run in that folder";
      }
    }
    return { sources: { beads: wq.beads(), prs, notes: [], repoUrl }, repoError };
  }

  return {
    "GET /local/work-quiz/status": async () => {
      const { sources: s, repoError } = await sources();
      return json({ beads: s.beads.length, prs: s.prs.length, repo: wq.repo(), repoError, ready: !sourcesEmpty(s), ...wq.tally() });
    },
    "POST /local/work-quiz/beads": async (req) => {
      const b = await body(req);
      if (!b || typeof b.text !== "string") return json({ error: "send the text of .beads/issues.jsonl" }, 400);
      if (Buffer.byteLength(b.text) > MAX_BEAD_BYTES) return json({ error: `the beads file is larger than ${MAX_BEAD_BYTES / 1048576} MB` }, 413);
      let lines = 0;
      for (let i = b.text.indexOf("\n"); i !== -1 && lines <= MAX_BEAD_LINES; i = b.text.indexOf("\n", i + 1)) lines++;
      if (lines > MAX_BEAD_LINES) return json({ error: `the beads file has more than ${MAX_BEAD_LINES} lines` }, 413);
      const beads = parseBeads(b.text);
      if (!beads.length) return json({ error: "no beads found; pick a .beads/issues.jsonl file" }, 400);
      wq.setBeads(beads, now());
      return json({ beads: beads.length });
    },
    "POST /local/work-quiz/repo": async (req) => {
      const b = await body(req);
      if (!b) return json({ error: "bad body" }, 400);
      if (b.path === null) {
        wq.setRepo(null, now());
        return json({ repo: null });
      }
      try {
        const repo = checkRepoPath(String(b.path ?? ""), o.home);
        await git(["rev-parse", "--is-inside-work-tree"], repo);
        wq.setRepo(repo, now());
        return json({ repo });
      } catch (e) {
        return json({ error: e instanceof RepoPathError ? e.message : "git could not read that folder" }, 400);
      }
    },
    "POST /local/work-quiz/forget": () => {
      wq.clear();
      issued.clear();
      return json({ cleared: true });
    },
    "GET /local/work-quiz/next": async () => {
      const { sources: s } = await sources();
      if (sourcesEmpty(s)) return json({ error: "no sources: pick a beads file or a repository" }, 404);
      const q = generateQuestion(s, seed());
      if (!q) return json({ error: "the sources are too small for a question yet" }, 404);
      const at = now();
      for (const [id, v] of issued) if (at - v.at > 10 * 60_000) issued.delete(id);
      issued.set(q.id, { q, at });
      return json(toPublic(q));
    },
    "POST /local/work-quiz/answer": async (req) => {
      const b = await body(req);
      if (!b || typeof b.id !== "string") return json({ error: "id required" }, 400);
      const open = issued.get(b.id);
      if (!open) return json({ error: "no open question" }, 404);
      issued.delete(b.id);
      const elapsed = typeof b.elapsedMs === "number" && Number.isFinite(b.elapsedMs) && b.elapsedMs >= 0 ? Math.min(b.elapsedMs, 3_600_000) : now() - open.at;
      const response = normalizeResponse(open.q, b.response);
      const g = gradeAnswer(open.q, response, elapsed);
      wq.record(open.q, g.correct, g.rating, elapsed, now());
      return json({ ...g, answer: open.q.answer, explain: open.q.explain, sources: open.q.sources });
    },
  };
}
