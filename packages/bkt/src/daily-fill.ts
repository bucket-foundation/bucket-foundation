import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { factId } from "../../../src/lib/research-os/work-quiz/fact";
import { checkLimits } from "../../../src/lib/research-os/work-quiz/limits";
import { daySeed, splitFactId, type CoverageRow, type SamplePick } from "../../../src/lib/research-os/work-quiz/sampler";
import type { QuestionOrigin, QuizQuestion } from "../../../src/lib/research-os/work-quiz/types";
import { DAILY_MAX, DailyQuizError, MAX_DAILY_BYTES, parseQuestion, validDay } from "./daily-quiz";
import { deckOf, type Item } from "./grade";
import { buildShortQuestion, hasShort } from "./short-fields";

export const CRITIC_DIR_ENV = "BKT_DAILY_DIR";
export const CRITIC_FILE = "quiz.json";
export const LESSON_CELL = "recall/pick/1";
export const MAX_LABEL = 120;

export function criticDir(env: Record<string, string | undefined> = process.env, home = homedir()): string {
  return env[CRITIC_DIR_ENV] || join(home, ".local", "share", "bucket-daily");
}

export function criticPath(day: string, dir: string): string {
  return join(dir, day, CRITIC_FILE);
}

function readSmall(path: string): string | null | "large" {
  let fd: number;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    return null;
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) return null;
    if (st.size > MAX_DAILY_BYTES) return "large";
    const buf = Buffer.alloc(st.size);
    let got = 0;
    while (got < st.size) {
      const n = readSync(fd, buf, got, st.size - got, got);
      if (n === 0) break;
      got += n;
    }
    return buf.subarray(0, got).toString("utf8");
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

export interface CriticRead {
  questions: QuizQuestion[];
  skipped: string[];
}

export function readCriticQuiz(day: string, dir: string): CriticRead {
  const none = (why?: string): CriticRead => ({ questions: [], skipped: why ? [why] : [] });
  if (!validDay(day)) return none();
  const text = readSmall(criticPath(day, dir));
  if (text === null) return none();
  if (text === "large") return none(`${CRITIC_FILE} is larger than ${MAX_DAILY_BYTES / 1024} KB`);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return none(`${CRITIC_FILE} is not JSON`);
  }
  const r = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  if (r.day !== day) return none(`${CRITIC_FILE} is for another day`);
  if (!Array.isArray(r.questions) || r.questions.length === 0) return none(`${CRITIC_FILE} holds no questions`);
  const questions: QuizQuestion[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const q of r.questions.slice(0, DAILY_MAX * 2)) {
    try {
      const parsed = parseQuestion(q);
      if (seen.has(parsed.id)) throw new DailyQuizError(`question ${parsed.id} repeats an id`);
      seen.add(parsed.id);
      if (questions.length < DAILY_MAX) questions.push({ ...parsed, origin: "critic" });
    } catch (e) {
      skipped.push(e instanceof DailyQuizError ? e.message : "a question could not be read");
    }
  }
  return { questions, skipped };
}

export const REPEAT_DAYS = 30;
export const REPEAT_OVERLAP = 0.5;
const STOP = new Set(["a", "an", "the", "of", "in", "for", "as", "at", "to", "on", "by", "and", "or", "is", "are", "how", "many", "much", "what", "which", "across", "with"]);

export function promptWords(prompt: string): Set<string> {
  return new Set(
    prompt
      .toLowerCase()
      .replace(/(\d),(?=\d)/g, "$1")
      .split(/[^a-z0-9.-]+/)
      .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
      .filter((w) => w && !STOP.has(w)),
  );
}

export function repeats(q: Pick<QuizQuestion, "type" | "prompt">, asked: readonly Pick<QuizQuestion, "type" | "prompt">[]): boolean {
  const mine = promptWords(q.prompt);
  return asked.some((a) => {
    if (a.type !== q.type) return false;
    const theirs = promptWords(a.prompt);
    const shared = [...mine].filter((w) => theirs.has(w)).length;
    const union = new Set([...mine, ...theirs]).size;
    return union > 0 && shared / union >= REPEAT_OVERLAP;
  });
}

export function recentDays(day: string, days = REPEAT_DAYS): string[] {
  const t = Date.parse(`${day}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => new Date(t - (i + 1) * 86_400_000).toISOString().slice(0, 10));
}

export function lessonFactId(item: Pick<Item, "branch" | "atomId">): string {
  return factId("atom", `${encodeURIComponent(deckOf(item.branch))}/${encodeURIComponent(item.atomId)}`);
}

export function lessonQuestionId(itemId: string): string {
  return `lesson.${createHash("sha256").update(itemId).digest("hex").slice(0, 12)}`;
}

function lessonQuestion(item: Item, pool: Item[], seed: string): QuizQuestion | null {
  const built = buildShortQuestion(item, pool, seed);
  if (!built) return null;
  const ref = lessonFactId(item).slice("atom:".length);
  if (ref.length > MAX_LABEL || ref.includes("|")) return null;
  const label = item.title.trim().slice(0, MAX_LABEL) || item.atomId.slice(0, MAX_LABEL);
  const q: QuizQuestion = {
    id: lessonQuestionId(item.id),
    type: "recall",
    prompt: built.prompt,
    lines: [],
    choices: built.choices,
    answer: built.choices[built.answerIndex],
    tolerance: 0,
    limitSec: built.limitSec,
    explain: "",
    sources: [{ kind: "atom", ref, label, href: null }],
    origin: "lesson",
  };
  return checkLimits(q).length === 0 ? q : null;
}

export interface LessonFillInput {
  day: string;
  items: readonly Item[];
  count: number;
  coverage?: readonly CoverageRow[];
  exclude?: readonly string[];
}

export interface LessonFill {
  questions: QuizQuestion[];
  picks: SamplePick[];
}

export function lessonFill(input: LessonFillInput): LessonFill {
  const out: LessonFill = { questions: [], picks: [] };
  if (input.count <= 0) return out;
  const seed = daySeed(input.day);
  const pool = input.items.filter(hasShort);
  const seen = new Map<string, { picks: number; lastDay: string }>();
  for (const r of input.coverage ?? []) {
    if (r.cell === "miss") continue;
    for (const id of splitFactId(r.factId)) {
      const prev = seen.get(id) ?? { picks: 0, lastDay: "" };
      seen.set(id, { picks: prev.picks + r.picks, lastDay: r.lastDay > prev.lastDay ? r.lastDay : prev.lastDay });
    }
  }
  const used = new Set<string>(input.exclude ?? []);
  const ranked = pool
    .map((item) => {
      const fact = lessonFactId(item);
      return { item, fact, tie: createHash("sha256").update(`${seed}|${item.id}`).digest("hex"), ...(seen.get(fact) ?? { picks: 0, lastDay: "" }) };
    })
    .sort((a, b) => a.picks - b.picks || a.lastDay.localeCompare(b.lastDay) || a.tie.localeCompare(b.tie));
  for (const r of ranked) {
    if (out.questions.length >= input.count) break;
    if (used.has(r.fact)) continue;
    const q = lessonQuestion(r.item, pool, seed);
    if (!q) continue;
    used.add(r.fact);
    out.questions.push(q);
    out.picks.push({ cell: LESSON_CELL, factIds: [r.fact] });
  }
  return out;
}

export function originOf(q: QuizQuestion): QuestionOrigin {
  if (q.origin) return q.origin;
  const kind = q.sources[0]?.kind;
  if (kind === "chat") return "chat";
  if (kind === "word" || q.word) return "word";
  if (kind === "atom") return "lesson";
  return "work";
}
