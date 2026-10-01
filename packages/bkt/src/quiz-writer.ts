import { createHash } from "node:crypto";
import { LIMITS, shortTitle, withinLimits } from "../../../src/lib/research-os/work-quiz/limits";
import type { QuizQuestion, SourceRef } from "../../../src/lib/research-os/work-quiz/types";
import type { FactStub } from "./chat-sources";
import { fermi, parseDailyQuiz, type DailyQuiz } from "./daily-quiz";
import { secretLine } from "./secret-scan";

export const DAILY_COUNT = 5;
export const LLM_URL = "http://127.0.0.1:11435";
export const LLM_MODEL = "qwen2.5-coder-7b";
export const LLM_TIMEOUT_MS = 30_000;
export const LLM_MAX_STUBS = 24;
export const LLM_MAX_REPLY = 64 * 1024;
export const SESSION_TITLE_TOKENS = 6;

const TOOL: Record<FactStub["root"], string> = { claude: "Claude", codex: "Codex" };

export class WriterError extends Error {}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface WriterOptions {
  fetch?: Fetcher;
  url?: string;
  model?: string;
  timeoutMs?: number;
  count?: number;
}

export interface Written {
  quiz: DailyQuiz | null;
  writer: "model" | "templates" | "none";
  modelError: string | null;
}

export function loopbackUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new WriterError("the model address is not a URL");
  }
  if (u.protocol !== "http:" || (u.hostname !== "127.0.0.1" && u.hostname !== "[::1]") || u.username || u.password) throw new WriterError("the model address must be http on 127.0.0.1 or [::1]");
  return u;
}

const ref = (s: FactStub): SourceRef => ({ kind: "chat", ref: s.id, label: `${TOOL[s.root]} session, ${s.date}`, href: null });

const rank = (day: string, id: string) => createHash("sha256").update(`${day}:${id}`).digest("hex");

export function safeStubs(stubs: FactStub[]): FactStub[] {
  return stubs.filter((s) => !secretLine(s.label));
}

export function templateQuestions(day: string, stubs: FactStub[], count = DAILY_COUNT): QuizQuestion[] {
  const safe = safeStubs(stubs).sort((a, b) => rank(day, a.id).localeCompare(rank(day, b.id)));
  if (!safe.length) return [];
  const out: QuizQuestion[] = [
    fermi({ id: "chat-sessions", prompt: "How many chat sessions in two days?", answer: safe.length, explain: `${safe.length} sessions held a message from you.` }),
  ];
  const turns = safe.reduce((n, s) => n + s.turns, 0);
  out.push(fermi({ id: "chat-messages", prompt: "How many messages did you send in two days?", answer: turns, explain: `${turns} messages across ${safe.length} sessions.` }));
  const tools = new Set(safe.map((s) => s.root));
  const days = new Set(safe.map((s) => s.date));
  for (const [i, s] of safe.entries()) {
    const per: QuizQuestion[] = [];
    const short = shortTitle(s.label.replace(/…$/, ""), SESSION_TITLE_TOKENS);
    if (!short) continue;
    if (tools.size > 1)
      per.push({
        id: `chat-tool-${s.id}`,
        type: "recall",
        prompt: `Which tool ran "${short}"?`,
        lines: [],
        choices: Object.values(TOOL),
        answer: TOOL[s.root],
        tolerance: 0,
        limitSec: 30,
        explain: `It ran in ${TOOL[s.root]} on ${s.date}.`,
        sources: [ref(s)],
      });
    if (days.size > 1 && days.size <= LIMITS.maxOptions)
      per.push({
        id: `chat-day-${s.id}`,
        type: "recall",
        prompt: `Which day did "${short}" start?`,
        lines: [],
        choices: [...days].sort(),
        answer: s.date,
        tolerance: 0,
        limitSec: 30,
        explain: `It started on ${s.date}.`,
        sources: [ref(s)],
      });
    per.push(fermi({ id: `chat-turns-${s.id}`, prompt: `How many messages in "${short}"?`, answer: s.turns, explain: `You sent ${s.turns}.`, sources: [ref(s)] }));
    out.push(per[i % per.length]);
  }
  return out.filter(withinLimits).slice(0, count);
}

export function modelPrompt(stubs: FactStub[], count: number): string {
  const rows = safeStubs(stubs)
    .slice(0, LLM_MAX_STUBS)
    .map((s) => `${s.id} | ${s.date} | ${TOOL[s.root]} | ${s.turns} messages | ${s.label}`);
  return [
    `Write ${count} multiple-choice recall questions about the work sessions listed below.`,
    "Each row is: id | day | tool | message count | first line of the session.",
    "Use the rows alone. Each question has four distinct choices and one answer copied from its choices.",
    `Keep it short: the prompt at most ${LIMITS.stem} words, each choice at most ${LIMITS.option} words and all choices about the same length, the explain line at most ${LIMITS.why} words.`,
    'Reply with JSON alone: {"questions":[{"stub":"<id>","prompt":"...","choices":["..."],"answer":"...","explain":"..."}]}',
    "",
    ...rows,
  ].join("\n");
}

function modelQuestions(reply: string, stubs: FactStub[], count: number): QuizQuestion[] {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) throw new WriterError("the model reply holds no JSON");
  const doc = JSON.parse(reply.slice(start, end + 1)) as { questions?: unknown };
  if (!Array.isArray(doc.questions)) throw new WriterError("the model reply holds no questions");
  const byId = new Map(stubs.map((s) => [s.id, s]));
  const out: QuizQuestion[] = [];
  for (const [i, raw] of doc.questions.entries()) {
    if (out.length >= count) break;
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const stub = byId.get(String(r.stub));
    const strings = [r.prompt, r.answer, r.explain ?? "", ...(Array.isArray(r.choices) ? r.choices : [])];
    if (!stub || strings.some((s) => typeof s !== "string" || secretLine(s))) continue;
    try {
      out.push(
        parseDailyQuiz({
          day: "2000-01-01",
          questions: [{ id: `chat-model-${i}`, type: "recall", prompt: r.prompt, choices: r.choices, answer: r.answer, explain: r.explain ?? "", limitSec: 60, sources: [ref(stub)] }],
        }).questions[0],
      );
    } catch {
      continue;
    }
  }
  return out;
}

export async function askModel(stubs: FactStub[], o: WriterOptions = {}): Promise<QuizQuestion[]> {
  const count = o.count ?? DAILY_COUNT;
  const base = loopbackUrl(o.url ?? LLM_URL);
  const res = await (o.fetch ?? fetch)(new URL("/v1/chat/completions", base).href, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(o.timeoutMs ?? LLM_TIMEOUT_MS),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: o.model ?? LLM_MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: modelPrompt(stubs, count) }],
    }),
  });
  if (!res.ok) throw new WriterError(`the model answered ${res.status}`);
  const text = await res.text();
  if (text.length > LLM_MAX_REPLY) throw new WriterError("the model reply is too large");
  const content = (JSON.parse(text) as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new WriterError("the model reply holds no text");
  const questions = modelQuestions(content, safeStubs(stubs), count);
  if (!questions.length) throw new WriterError("the model wrote no usable question");
  return questions;
}

export async function writeDailyQuiz(day: string, stubs: FactStub[], o: WriterOptions = {}): Promise<Written> {
  const count = o.count ?? DAILY_COUNT;
  const templates = templateQuestions(day, stubs, count);
  if (!templates.length) return { quiz: null, writer: "none", modelError: null };
  let questions = templates;
  let writer: Written["writer"] = "templates";
  let modelError: string | null = null;
  try {
    const written = await askModel(stubs, o);
    questions = [...written, ...templates].slice(0, count);
    writer = "model";
  } catch (e) {
    modelError = e instanceof WriterError ? e.message : e instanceof SyntaxError ? "the model reply is not JSON" : "the model did not answer";
  }
  return { quiz: parseDailyQuiz({ day, questions }), writer, modelError };
}
