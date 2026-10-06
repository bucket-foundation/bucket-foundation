import type { Card } from "@/lib/academy/fsrs";
import { graphService } from "../db";
import type { QuizQuestion } from "./types";
import { cardFields } from "./fact";
import { splitFactId, type CoverageRow, type SamplePick } from "./sampler";

function cardColumns(q: QuizQuestion): { fact_id: string; form: string } {
  const { fact_id, form } = cardFields(q);
  return { fact_id, form };
}
import { OPEN_WINDOW_MS, stillOpen } from "./open";

export type QuizMode = "surprise" | "review" | "manual";

export interface AttemptRow {
  id: string;
  learner_id: string;
  question_id: string;
  question: QuizQuestion;
  mode: QuizMode;
  issued_at: string;
  answered_at: string | null;
  response: string | null;
  correct: boolean | null;
  timed_out: boolean | null;
  skipped: boolean | null;
  elapsed_ms: number | null;
  rating: number | null;
}

export interface CardRow {
  learner_id: string;
  question_id: string;
  question: QuizQuestion;
  card: Card;
  due_at: string;
  reps: number;
}

export interface AnswerFields {
  response: string | null;
  correct: boolean;
  timed_out: boolean;
  skipped: boolean;
  elapsed_ms: number;
  rating: number | null;
}

type DbError = { message: string } | null;

function must<T>(data: T, error: DbError): T {
  if (error) throw new Error(error.message);
  return data;
}

export async function issueAttempt(learnerId: string, question: QuizQuestion, mode: QuizMode): Promise<AttemptRow> {
  const { data, error } = await graphService()
    .from("work_quiz_attempts")
    .insert({ learner_id: learnerId, question_id: question.id, question, mode })
    .select("*")
    .single();
  return must(data as AttemptRow, error);
}

export async function openAttempt(learnerId: string, mode: QuizMode, now: Date): Promise<AttemptRow | null> {
  const since = new Date(now.getTime() - OPEN_WINDOW_MS).toISOString();
  const { data, error } = await graphService()
    .from("work_quiz_attempts")
    .select("*")
    .eq("learner_id", learnerId)
    .eq("mode", mode)
    .is("answered_at", null)
    .gte("issued_at", since)
    .order("issued_at", { ascending: false })
    .limit(1);
  const row = (must(data as AttemptRow[] | null, error) ?? [])[0] ?? null;
  return row && stillOpen(row, now) ? row : null;
}

export async function loadAttempt(learnerId: string, id: string): Promise<AttemptRow | null> {
  const { data, error } = await graphService().from("work_quiz_attempts").select("*").eq("id", id).eq("learner_id", learnerId).maybeSingle();
  return must((data as AttemptRow | null) ?? null, error);
}

export async function answerAttempt(learnerId: string, id: string, fields: AnswerFields, answeredAt: string): Promise<AttemptRow | null> {
  const { data, error } = await graphService()
    .from("work_quiz_attempts")
    .update({ ...fields, answered_at: answeredAt })
    .eq("id", id)
    .eq("learner_id", learnerId)
    .is("answered_at", null)
    .select("*")
    .maybeSingle();
  return must((data as AttemptRow | null) ?? null, error);
}

export async function loadCard(learnerId: string, questionId: string): Promise<CardRow | null> {
  const { data, error } = await graphService().from("work_quiz_cards").select("*").eq("learner_id", learnerId).eq("question_id", questionId).maybeSingle();
  return must((data as CardRow | null) ?? null, error);
}

export async function writeCard(learnerId: string, question: QuizQuestion, card: Card, previous: CardRow | null): Promise<boolean> {
  const row = {
    learner_id: learnerId,
    question_id: question.id,
    ...cardColumns(previous?.question ?? question),
    question: previous?.question ?? question,
    card,
    due_at: new Date(card.due ?? Date.now()).toISOString(),
    reps: card.reps ?? 0,
    updated_at: new Date().toISOString(),
  };
  const svc = graphService();
  if (!previous) {
    const { data, error } = await svc.from("work_quiz_cards").upsert(row, { onConflict: "learner_id,question_id", ignoreDuplicates: true }).select("question_id");
    return must(((data as unknown[] | null) ?? []).length > 0, error);
  }
  const { data, error } = await svc
    .from("work_quiz_cards")
    .update(row)
    .eq("learner_id", learnerId)
    .eq("question_id", question.id)
    .eq("reps", previous.reps)
    .select("question_id");
  return must(((data as unknown[] | null) ?? []).length > 0, error);
}

async function moveQuestion(learnerId: string, previous: CardRow, question: QuizQuestion): Promise<boolean> {
  const { data, error } = await graphService()
    .from("work_quiz_cards")
    .update({ question, ...cardColumns(question), updated_at: new Date().toISOString() })
    .eq("learner_id", learnerId)
    .eq("question_id", previous.question_id)
    .eq("reps", previous.reps)
    .select("question_id");
  return must(((data as unknown[] | null) ?? []).length > 0, error);
}

async function copyCard(learnerId: string, previous: CardRow, question: QuizQuestion): Promise<boolean> {
  const row = { learner_id: learnerId, question_id: question.id, ...cardColumns(question), question, card: previous.card, due_at: previous.due_at, reps: previous.reps, updated_at: new Date().toISOString() };
  const { data, error } = await graphService().from("work_quiz_cards").upsert(row, { onConflict: "learner_id,question_id", ignoreDuplicates: true }).select("question_id");
  return must(((data as unknown[] | null) ?? []).length > 0, error);
}

export async function rekeyCard(learnerId: string, previous: CardRow, question: QuizQuestion): Promise<boolean> {
  if (question.id === previous.question_id) return moveQuestion(learnerId, previous, question);
  if (!(await copyCard(learnerId, previous, question))) return false;
  await retireCard(learnerId, previous.question_id);
  return true;
}

export async function retireCard(learnerId: string, questionId: string): Promise<void> {
  const { error } = await graphService().from("work_quiz_cards").delete().eq("learner_id", learnerId).eq("question_id", questionId);
  must(null, error);
}

export async function dueCards(learnerId: string, now: Date, limit: number): Promise<CardRow[]> {
  const { data, error } = await graphService()
    .from("work_quiz_cards")
    .select("*")
    .eq("learner_id", learnerId)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);
  return must((data as CardRow[] | null) ?? [], error);
}

export interface QuizStats {
  answered: number;
  correct: number;
  skipped: number;
  timedOut: number;
  cards: number;
  due: number;
  nextDueAt: string | null;
  recent: Pick<AttemptRow, "id" | "question" | "answered_at" | "correct" | "timed_out" | "skipped" | "mode">[];
}

export async function loadStats(learnerId: string, now: Date): Promise<QuizStats> {
  const svc = graphService();
  const [attempts, cards] = await Promise.all([
    svc.from("work_quiz_attempts").select("id,question,answered_at,correct,timed_out,skipped,mode").eq("learner_id", learnerId).not("answered_at", "is", null).order("answered_at", { ascending: false }).limit(500),
    svc.from("work_quiz_cards").select("due_at").eq("learner_id", learnerId).order("due_at", { ascending: true }).limit(1000),
  ]);
  const rows = must((attempts.data as QuizStats["recent"] | null) ?? [], attempts.error);
  const cardRows = must((cards.data as { due_at: string }[] | null) ?? [], cards.error);
  const due = cardRows.filter((c) => c.due_at <= now.toISOString()).length;
  const later = cardRows.find((c) => c.due_at > now.toISOString());
  return {
    answered: rows.filter((r) => !r.skipped).length,
    correct: rows.filter((r) => r.correct).length,
    skipped: rows.filter((r) => r.skipped).length,
    timedOut: rows.filter((r) => r.timed_out).length,
    cards: cardRows.length,
    due,
    nextDueAt: later?.due_at ?? null,
    recent: rows.slice(0, 12),
  };
}

export async function loadCoverage(learnerId: string): Promise<CoverageRow[]> {
  const { data, error } = await graphService().from("work_quiz_coverage").select("cell, fact_id, picks, misses, last_day").eq("learner_id", learnerId);
  const rows = must((data as { cell: string; fact_id: string; picks: number; misses: number; last_day: string }[] | null) ?? [], error);
  return rows.map((r) => ({ cell: r.cell, factId: r.fact_id, picks: r.picks, misses: r.misses, lastDay: r.last_day }));
}

export async function recordPicks(learnerId: string, picks: SamplePick[], day: string): Promise<void> {
  const { error } = await graphService().rpc("work_quiz_record_picks", {
    p_learner_id: learnerId,
    p_picks: picks.map((p) => ({ cell: p.cell, fact_id: p.factIds.join("+") })),
    p_day: day,
  });
  must(null, error);
}

export async function recordMiss(learnerId: string, question: QuizQuestion, day: string): Promise<void> {
  const { error } = await graphService().rpc("work_quiz_record_miss", { p_learner_id: learnerId, p_fact_ids: splitFactId(cardFields(question).fact_id), p_day: day });
  must(null, error);
}

export async function loadLanguages(learnerId: string): Promise<string[]> {
  const { data, error } = await graphService().from("work_quiz_languages").select("languages").eq("learner_id", learnerId).maybeSingle();
  return must((data as { languages: string[] } | null)?.languages ?? [], error);
}

export async function saveLanguages(learnerId: string, languages: string[]): Promise<string[]> {
  const { data, error } = await graphService()
    .from("work_quiz_languages")
    .upsert({ learner_id: learnerId, languages, updated_at: new Date().toISOString() }, { onConflict: "learner_id" })
    .select("languages")
    .single();
  return must((data as { languages: string[] }).languages, error);
}
