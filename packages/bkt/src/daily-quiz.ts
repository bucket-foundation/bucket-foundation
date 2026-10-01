import { FERMI_LOG10_TOLERANCE } from "../../../src/lib/research-os/work-quiz/grade";
import { QUIZ_TYPES, type QuizQuestion, type QuizType, type SourceRef } from "../../../src/lib/research-os/work-quiz/types";
import { open, seal } from "./crypto";
import type { Store } from "./store";

export const MAX_DAILY_QUESTIONS = 20;
export const MAX_DAILY_BYTES = 256 * 1024;
export const MAX_TEXT = 600;
export const MAX_LIMIT_SEC = 600;
export const MAX_CHOICES = 8;
export const MAX_LINES = 12;
export const MAX_SOURCES = 8;

export interface DailyQuiz {
  day: string;
  questions: QuizQuestion[];
}

export class DailyQuizError extends Error {}

export function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

export function attemptId(day: string, questionId: string): string {
  return `daily:${day}:${questionId}`;
}

const text = (v: unknown, what: string, max = MAX_TEXT): string => {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new DailyQuizError(`${what} must be text of at most ${max} characters`);
  return v;
};

const KINDS: readonly SourceRef["kind"][] = ["bead", "pr", "note", "chat"];

function source(v: unknown): SourceRef {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  if (!KINDS.includes(r.kind as SourceRef["kind"])) throw new DailyQuizError("a source needs kind bead, pr, note or chat");
  const href = r.href === null || r.href === undefined ? null : text(r.href, "a source href");
  if (href !== null && !href.startsWith("https://")) throw new DailyQuizError("a source href must start with https://");
  return { kind: r.kind as SourceRef["kind"], ref: text(r.ref, "a source ref", 120), label: text(r.label, "a source label", 120), href };
}

function question(v: unknown): QuizQuestion {
  const r = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const id = text(r.id, "a question id", 120);
  if (!/^[\w.-]+$/.test(id)) throw new DailyQuizError("a question id holds letters, digits, dot, dash and underscore");
  if (!QUIZ_TYPES.includes(r.type as QuizType)) throw new DailyQuizError(`question ${id} has an unknown type`);
  const limitSec = r.limitSec;
  if (typeof limitSec !== "number" || !Number.isInteger(limitSec) || limitSec < 5 || limitSec > MAX_LIMIT_SEC) throw new DailyQuizError(`question ${id} needs a limit between 5 and ${MAX_LIMIT_SEC} seconds`);
  const lines = r.lines === undefined ? [] : r.lines;
  if (!Array.isArray(lines) || lines.length > MAX_LINES) throw new DailyQuizError(`question ${id} has too many lines`);
  const answer = text(r.answer, `the answer of question ${id}`);
  const explain = r.explain === undefined ? "" : r.explain;
  if (typeof explain !== "string" || explain.length > MAX_TEXT) throw new DailyQuizError(`the explanation of question ${id} must be text of at most ${MAX_TEXT} characters`);
  const sources = r.sources === undefined ? [] : r.sources;
  if (!Array.isArray(sources) || sources.length > MAX_SOURCES) throw new DailyQuizError(`question ${id} takes at most ${MAX_SOURCES} sources`);
  const base = {
    id,
    type: r.type as QuizType,
    prompt: text(r.prompt, `the prompt of question ${id}`),
    lines: lines.map((l) => text(l, `a line of question ${id}`)),
    answer,
    limitSec,
    explain,
    sources: sources.map(source),
  };
  if (r.choices !== null && r.choices !== undefined) {
    if (!Array.isArray(r.choices) || r.choices.length < 2 || r.choices.length > MAX_CHOICES) throw new DailyQuizError(`question ${id} needs between 2 and ${MAX_CHOICES} choices`);
    const choices = r.choices.map((c) => text(c, `a choice of question ${id}`));
    if (new Set(choices).size !== choices.length) throw new DailyQuizError(`question ${id} repeats a choice`);
    if (!choices.includes(answer)) throw new DailyQuizError(`the answer of question ${id} is missing from its choices`);
    return { ...base, choices, tolerance: 0 };
  }
  const want = Number(answer);
  if (!Number.isFinite(want)) throw new DailyQuizError(`question ${id} needs a numeric answer or choices`);
  if (r.log10Tolerance !== undefined) {
    const tol = r.log10Tolerance;
    if (typeof tol !== "number" || !(tol > 0) || tol > 3) throw new DailyQuizError(`question ${id} needs a log10 tolerance between 0 and 3`);
    if (want <= 0) throw new DailyQuizError(`question ${id} is graded on log10 and needs a positive answer`);
    return { ...base, choices: null, tolerance: 0, log10Tolerance: tol };
  }
  const tolerance = r.tolerance;
  if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance < 0) throw new DailyQuizError(`question ${id} needs a tolerance of zero or more`);
  return { ...base, choices: null, tolerance };
}

export function parseDailyQuiz(raw: unknown): DailyQuiz {
  const r = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  if (!validDay(r.day)) throw new DailyQuizError("the quiz needs a day written as YYYY-MM-DD");
  if (!Array.isArray(r.questions) || r.questions.length === 0 || r.questions.length > MAX_DAILY_QUESTIONS)
    throw new DailyQuizError(`the quiz needs between 1 and ${MAX_DAILY_QUESTIONS} questions`);
  const questions = r.questions.map(question);
  if (new Set(questions.map((q) => q.id)).size !== questions.length) throw new DailyQuizError("the quiz repeats a question id");
  return { day: r.day, questions };
}

export function fermi(q: { id: string; prompt: string; answer: number; explain: string; limitSec?: number; lines?: string[]; sources?: SourceRef[] }): QuizQuestion {
  return question({ ...q, type: "estimate", answer: String(q.answer), limitSec: q.limitSec ?? 90, log10Tolerance: FERMI_LOG10_TOLERANCE });
}

export class DailyQuizStore {
  constructor(
    private store: Store,
    private key: Buffer,
  ) {}

  put(raw: unknown, now: number): DailyQuiz {
    const quiz = parseDailyQuiz(raw);
    const body = JSON.stringify(quiz);
    if (Buffer.byteLength(body) > MAX_DAILY_BYTES) throw new DailyQuizError(`the quiz is larger than ${MAX_DAILY_BYTES / 1024} KB`);
    this.store.db
      .query("insert into daily_quiz (day, body, created_at) values (?, ?, ?) on conflict(day) do update set body = excluded.body, created_at = excluded.created_at")
      .run(quiz.day, seal(this.key, body, `daily_quiz:${quiz.day}`), now);
    return quiz;
  }

  get(day: string): DailyQuiz | null {
    if (!validDay(day)) return null;
    const r = this.store.db.query<{ body: string }, [string]>("select body from daily_quiz where day = ?").get(day);
    return r ? parseDailyQuiz(JSON.parse(open(this.key, r.body, `daily_quiz:${day}`))) : null;
  }

  days(): string[] {
    return this.store.db
      .query<{ day: string }, []>("select day from daily_quiz order by day desc")
      .all()
      .map((r) => r.day);
  }

  answered(day: string): Set<string> {
    const prefix = attemptId(day, "");
    return new Set(
      this.store.db
        .query<{ question_id: string }, [string, number]>("select question_id from work_quiz_attempts where substr(question_id, 1, ?2) = ?1")
        .all(prefix, prefix.length)
        .map((r) => r.question_id.slice(prefix.length)),
    );
  }

  clear() {
    this.store.db.run("delete from daily_quiz");
  }
}
