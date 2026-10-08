import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { generateQuestion, sourcesEmpty } from "../../../src/lib/research-os/work-quiz/generate";
import { resourceForQuestion } from "../../../src/lib/research-os/work-quiz/resources";
import { cardFields } from "../../../src/lib/research-os/work-quiz/fact";
import { dueFrom, sampleQuiz, splitFactId, usedOn, type CoverageRow, type DueCard, type SamplePick } from "../../../src/lib/research-os/work-quiz/sampler";
import { gradeAnswer, nextCard, normalizeResponse } from "../../../src/lib/research-os/work-quiz/grade";
import type { Card, Rating } from "../../../src/lib/academy/fsrs";
import { githubUrl, parseBeads, parsePrLog } from "../../../src/lib/research-os/work-quiz/sources-parse";
import { toPublic, type BeadFact, type QuizQuestion, type WorkSources } from "../../../src/lib/research-os/work-quiz/types";
import { CHAT_OFF, CHAT_ROOT_NAMES, localDay, readChatSources, type ChatScan, type ChatToggles } from "./chat-sources";
import { open, seal } from "./crypto";
import { checkLimits } from "../../../src/lib/research-os/work-quiz/limits";
import { LANGUAGES_ERROR, languagesByName, parseLanguages } from "../../../src/lib/research-os/work-quiz/languages";
import { answerDaily, LearnError } from "./core/learn";
import { DAILY_MAX, DAILY_MIN, DailyQuizStore, overLength, TOO_FEW, validDay, type DailyQuiz } from "./daily-quiz";
import { writeDailyQuiz, type WriterOptions } from "./quiz-writer";
import type { Route } from "./serve";
import type { Store } from "./store";

export const GIT_TIMEOUT_MS = 3000;
export const NO_QUIZ = "no quiz for that day";
export const MAX_PRS = 400;
export const BEADS_BODY_BYTES = 32 * 1024 * 1024;
export const MAX_BEAD_BYTES = 24 * 1024 * 1024;
export const MAX_BEAD_LINES = 100_000;
export const CHAT_META = "work_quiz_chat";

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

  chat(): ChatToggles {
    const raw = this.store.meta(CHAT_META);
    const saved = (raw ? JSON.parse(raw) : {}) as Partial<ChatToggles>;
    return { claude: saved.claude === true, codex: saved.codex === true };
  }

  setChat(on: ChatToggles) {
    this.store.setMeta(CHAT_META, JSON.stringify({ claude: on.claude, codex: on.codex }));
  }

  languages(): string[] {
    return this.store.db
      .query<{ code: string }, []>("select code from work_quiz_languages order by rowid")
      .all()
      .map((r) => r.code);
  }

  setLanguages(codes: readonly string[], now: number) {
    const ins = this.store.db.query("insert into work_quiz_languages (code, added_at) values (?, ?)");
    this.store.db.transaction(() => {
      this.store.db.run("delete from work_quiz_languages");
      for (const c of codes) ins.run(c, now);
    })();
  }

  get daily(): DailyQuizStore {
    return new DailyQuizStore(this.store, this.key);
  }

  clear() {
    this.store.db.run("delete from work_quiz_source");
    this.setChat(CHAT_OFF);
    this.daily.clear();
    this.store.db.run("delete from work_quiz_coverage");
    this.store.db.run("delete from work_quiz_cards");
    this.store.db.run("delete from work_quiz_languages");
  }

  record(q: QuizQuestion, correct: boolean, rating: number, elapsedMs: number, at: number, extra: { questionId?: string; log10Distance?: number | null } = {}) {
    this.store.db
      .query("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at, log10_distance) values (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), extra.questionId ?? q.id, q.type, correct ? 1 : 0, rating, Math.round(elapsedMs), at, extra.log10Distance ?? null);
    if (!correct) this.recordMiss(q, localDay(at));
    this.review(q, rating as Rating, at);
  }

  coverage(): CoverageRow[] {
    return this.store.db
      .query<{ cell: string; fact_id: string; picks: number; misses: number; last_day: string }, []>("select cell, fact_id, picks, misses, last_day from work_quiz_coverage")
      .all()
      .map((r) => ({ cell: r.cell, factId: r.fact_id, picks: r.picks, misses: r.misses, lastDay: r.last_day }));
  }

  review(q: QuizQuestion, rating: Rating, at: number) {
    const { fact_id, form, card_key } = cardFields(q);
    const prev = this.store.db.query<{ state: string }, [string]>("select state from work_quiz_cards where card_key = ?").get(card_key);
    const card = nextCard(prev ? (JSON.parse(prev.state) as Card) : null, rating, at);
    if (!card) return;
    this.store.db
      .query(
        `insert into work_quiz_cards (card_key, fact_id, form, state, due, updated_at, question) values (?, ?, ?, ?, ?, ?, ?)
         on conflict (card_key) do update set state = excluded.state, due = excluded.due, updated_at = excluded.updated_at, question = excluded.question`,
      )
      .run(card_key, fact_id, form, JSON.stringify(card), card.due ?? at, at, seal(this.key, JSON.stringify(q), `work_quiz_card:${card_key}`));
  }

  dueCards(at: number): DueCard[] {
    return this.store.db
      .query<{ card_key: string; due: number; question: string }, [number]>("select card_key, due, question from work_quiz_cards where question is not null and due <= ? order by due")
      .all(at)
      .map((r) => dueFrom(JSON.parse(open(this.key, r.question, `work_quiz_card:${r.card_key}`)) as QuizQuestion, r.due));
  }

  recordPicks(picks: readonly SamplePick[], day: string) {
    const q = this.store.db.query(
      `insert into work_quiz_coverage (cell, fact_id, picks, misses, last_day) values (?, ?, 1, 0, ?)
       on conflict (cell, fact_id) do update set picks = picks + 1, last_day = max(last_day, excluded.last_day)`,
    );
    this.store.db.transaction(() => {
      for (const p of picks) q.run(p.cell, p.factIds.join("+"), day);
    })();
  }

  recordMiss(q: QuizQuestion, day: string) {
    const { fact_id } = cardFields(q);
    const cell = "miss";
    const ins = this.store.db.query(
      `insert into work_quiz_coverage (cell, fact_id, picks, misses, last_day) values (?, ?, 0, 1, ?)
       on conflict (cell, fact_id) do update set misses = misses + 1`,
    );
    this.store.db.transaction(() => {
      for (const id of splitFactId(fact_id)) ins.run(cell, id, day);
    })();
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
  readChats?: (on: ChatToggles, o: { home?: string; now: number }) => ChatScan;
  writer?: WriterOptions;
  log?: (line: string) => void;
  onChat?: (on: ChatToggles) => void;
}

export function workQuizRoutes(wq: WorkQuizStore, o: WorkQuizOptions = {}): Record<string, Route> {
  const git = o.git ?? runGit;
  const now = o.now ?? Date.now;
  const seed = o.seed ?? (() => randomUUID());
  const issued = new Map<string, { q: QuizQuestion; at: number }>();
  const readChats = o.readChats ?? readChatSources;
  const log = o.log ?? ((line: string) => console.error(line));
  const building = new Map<string, Promise<DailyQuiz | null>>();
  const empty = new Map<string, string>();

  const askable = (s: WorkSources) => !sourcesEmpty(s) || wq.languages().length > 0;

  async function build(day: string): Promise<DailyQuiz | null> {
    const { sources: src } = await sources();
    const languages = wq.languages();
    const sampled = askable(src) ? sampleQuiz({ day, sources: src, coverage: wq.coverage(), due: wq.dueCards(now()), now: now(), exclude: usedOn(wq.coverage(), day), languages }) : null;
    const on = wq.chat();
    let chat: QuizQuestion[] = [];
    if (CHAT_ROOT_NAMES.some((r) => on[r])) {
      const { stubs, counts } = readChats(on, { home: o.home, now: now() });
      const written = await writeDailyQuiz(day, stubs, { url: process.env.BKT_LLM_URL, model: process.env.BKT_LLM_MODEL, ...o.writer });
      const still = wq.chat();
      if (CHAT_ROOT_NAMES.some((r) => still[r] !== on[r])) return null;
      chat = written.quiz?.questions ?? [];
      log(
        `daily quiz ${day}: ${counts.files} files, ${counts.bytes} bytes, ${stubs.length} sessions, ${counts.dropped} lines dropped, ${counts.skipped} skipped${counts.timedOut ? ", time cap reached" : ""}, ${chat.length} questions, writer ${written.writer}${written.modelError ? ` (${written.modelError})` : ""}`,
      );
    }
    const seen = new Set<string>();
    const questions = [...(sampled?.questions ?? []), ...chat].filter((q) => !seen.has(q.id) && seen.add(q.id)).slice(0, DAILY_MAX);
    if (questions.length < DAILY_MIN) {
      empty.set(day, questions.length === 0 ? NO_QUIZ : TOO_FEW);
      return null;
    }
    const quiz = wq.daily.put({ day, questions }, now());
    if (sampled) wq.recordPicks(sampled.picks, day);
    return quiz;
  }

  function daily(day: string): Promise<DailyQuiz | null> {
    const stored = wq.daily.get(day);
    const today = day === localDay(now());
    const rebuild = today && stored !== null && overLength(stored) && wq.daily.answered(day).size === 0;
    if ((stored && !rebuild) || !today || empty.has(day)) return Promise.resolve(stored);
    const running =
      building.get(day) ??
      build(day)
        .then((built) => built ?? stored)
        .finally(() => building.delete(day));
    building.set(day, running);
    return running;
  }

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
      return json({ beads: s.beads.length, prs: s.prs.length, repo: wq.repo(), repoError, chat: wq.chat(), languages: wq.languages(), ready: askable(s), ...wq.tally() });
    },
    "GET /local/work-quiz/languages": () => json({ languages: wq.languages(), available: languagesByName() }),
    "POST /local/work-quiz/languages": async (req) => {
      const b = await body(req);
      const languages = b ? parseLanguages(b.languages) : null;
      if (!languages) return json({ error: LANGUAGES_ERROR }, 400);
      wq.setLanguages(languages, now());
      empty.clear();
      return json({ languages: wq.languages() });
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
    "POST /local/work-quiz/chat": async (req) => {
      const b = await body(req);
      if (!b || !CHAT_ROOT_NAMES.every((r) => typeof b[r] === "boolean")) return json({ error: "send claude and codex as true or false" }, 400);
      wq.setChat({ claude: b.claude === true, codex: b.codex === true });
      o.onChat?.(wq.chat());
      empty.clear();
      return json({ chat: wq.chat() });
    },
    "POST /local/work-quiz/forget": () => {
      wq.clear();
      issued.clear();
      o.onChat?.(wq.chat());
      empty.clear();
      return json({ cleared: true });
    },
    "GET /local/work-quiz/next": async () => {
      const { sources: s } = await sources();
      if (!askable(s)) return json({ error: "no sources: pick a beads file, a repository or a language" }, 404);
      const at = now();
      const today = localDay(at);
      const coverage = wq.coverage();
      const picked = sampleQuiz({ day: today, sources: s, coverage, due: wq.dueCards(at), slots: 1, reviewSlots: 1, now: at, exclude: usedOn(coverage, today), languages: wq.languages() });
      const q = picked.questions[0] ?? generateQuestion(s, seed());
      if (!q) return json({ error: "the sources are too small for a question yet" }, 404);
      if (picked.picks.length > 0) wq.recordPicks(picked.picks, today);
      else if (picked.reviewed > 0) wq.recordPicks([{ cell: "review", factIds: dueFrom(picked.questions[0], at).factIds }], today);
      for (const [id, v] of issued) if (at - v.at > 10 * 60_000) issued.delete(id);
      issued.set(q.id, { q, at });
      return json(toPublic(q));
    },
    "GET /local/work-quiz/daily": async (_req, url) => {
      const day = url.searchParams.get("day");
      if (!validDay(day)) return json({ error: "give a day written as YYYY-MM-DD" }, 400);
      const quiz = await daily(day);
      if (!quiz) return json({ error: empty.get(day) ?? NO_QUIZ }, 404);
      const fit = url.searchParams.get("fit") === "1";
      return json({ day, questions: quiz.questions.filter((q) => !fit || checkLimits(q).length === 0).map(toPublic), answered: [...wq.daily.answered(day)] });
    },
    "POST /local/work-quiz/answer": async (req) => {
      const b = await body(req);
      if (!b || typeof b.id !== "string") return json({ error: "id required" }, 400);
      if (b.day !== undefined) {
        if (!validDay(b.day)) return json({ error: "give a day written as YYYY-MM-DD" }, 400);
        if (typeof b.elapsedMs !== "number" || !Number.isFinite(b.elapsedMs) || b.elapsedMs < 0) {
          if (!wq.daily.get(b.day)?.questions.some((x) => x.id === b.id)) return json({ error: "no such question" }, 404);
          if (wq.daily.answered(b.day).has(b.id)) return json({ error: "already answered" }, 409);
          return json({ error: "elapsedMs required" }, 400);
        }
        try {
          return json(answerDaily(wq.daily, (...a) => wq.record(...a), b.day, b.id, b.response, Math.min(b.elapsedMs, 3_600_000), now()));
        } catch (e) {
          if (e instanceof LearnError) return json({ error: e.message }, e.status);
          throw e;
        }
      }
      const open = issued.get(b.id);
      if (!open) return json({ error: "no open question" }, 404);
      issued.delete(b.id);
      const elapsed = typeof b.elapsedMs === "number" && Number.isFinite(b.elapsedMs) && b.elapsedMs >= 0 ? Math.min(b.elapsedMs, 3_600_000) : now() - open.at;
      const response = normalizeResponse(open.q, b.response);
      const g = gradeAnswer(open.q, response, elapsed);
      wq.record(open.q, g.correct, g.rating, elapsed, now());
      return json({ ...g, answer: open.q.answer, explain: open.q.explain, sources: open.q.sources, resource: resourceForQuestion(open.q) });
    },
  };
}
