import { CARD_TTL_MS } from "./lobby-cards";
import { nameAllowed } from "./groups-names";

export const TRIVIA_TTL_MS = CARD_TTL_MS;
export const TRIVIA_MAX = 10;
export const TRIVIA_POINTS = 100;
const PROMPT_MAX = 140;
const CHOICE_MAX = 60;

export interface TriviaQuestion {
  prompt: string;
  choices: string[];
  answer: number;
}

export interface TriviaRow {
  lobby_id: string;
  questions: TriviaQuestion[];
  current: number;
  open: boolean;
  answers: Record<string, Record<string, number>>;
  created_at: string;
}

function clean(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(/\s+/g, " ");
  return s && s.length <= max && nameAllowed(s) ? s : null;
}

export function triviaQuestion(raw: unknown): TriviaQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const prompt = clean(r.prompt, PROMPT_MAX);
  if (!prompt || !Array.isArray(r.choices) || r.choices.length < 2 || r.choices.length > 4) return null;
  const choices = r.choices.map((c) => clean(c, CHOICE_MAX));
  if (choices.some((c) => c === null)) return null;
  const list = choices as string[];
  if (new Set(list.map((c) => c.toLowerCase())).size !== list.length) return null;
  const answer = r.answer;
  if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 0 || answer >= list.length) return null;
  return { prompt, choices: list, answer };
}

export function triviaSet(raw: unknown): TriviaQuestion[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > TRIVIA_MAX) return null;
  const out = raw.map(triviaQuestion);
  return out.every((q): q is TriviaQuestion => q !== null) ? out : null;
}

export function triviaScores(row: Pick<TriviaRow, "questions" | "answers">): Record<string, number> {
  const out: Record<string, number> = {};
  row.questions.forEach((q, i) => {
    for (const [uid, pick] of Object.entries(row.answers[String(i)] ?? {})) out[uid] = (out[uid] ?? 0) + (pick === q.answer ? TRIVIA_POINTS : 0);
  });
  return out;
}

export interface TriviaView {
  count: number;
  current: number;
  open: boolean;
  prompt: string | null;
  choices: string[];
  answer: number | null;
  myPick: number | null;
  picked: number;
  questions: TriviaQuestion[] | null;
  scores: Record<string, number>;
}

export function triviaView(row: TriviaRow, uid: string, hostId: string): TriviaView {
  const q = row.current >= 0 ? row.questions[row.current] : undefined;
  const picks = row.answers[String(row.current)] ?? {};
  const closed = !!q && !row.open;
  const scored = { ...row.answers };
  if (row.open) delete scored[String(row.current)];
  return {
    count: row.questions.length,
    current: row.current,
    open: row.open,
    prompt: q?.prompt ?? null,
    choices: q?.choices ?? [],
    answer: closed ? q.answer : null,
    myPick: picks[uid] ?? null,
    picked: Object.keys(picks).length,
    questions: uid === hostId && row.current < 0 ? row.questions : null,
    scores: triviaScores({ questions: row.questions, answers: scored }),
  };
}

export type TriviaAction = "save" | "open" | "answer" | "reveal";

export function triviaAllowed(action: TriviaAction, row: Pick<TriviaRow, "current" | "open" | "questions"> | null, uid: string, hostId: string, index?: number): boolean {
  if (action === "save") return uid === hostId && (!row || row.current < 0);
  if (!row) return false;
  if (action === "open") return uid === hostId && !row.open && index === row.current + 1 && index < row.questions.length;
  if (action === "reveal") return uid === hostId && row.open;
  return uid !== hostId && row.open;
}

export function triviaFresh(createdAt: string, now: number): boolean {
  return now - Date.parse(createdAt) < TRIVIA_TTL_MS;
}
