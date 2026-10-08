import { randomBytes, timingSafeEqual } from "node:crypto";
import { proveServer } from "../serve";
import { chmodSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PublicQuestion as DailyQuestion } from "../../../../src/lib/research-os/work-quiz/types";
import { packLearnAtoms } from "../../../../src/lib/research-os/work-quiz/resources";
import type { DailyQuizStore } from "../daily-quiz";
import type { Pack, PackDeck } from "../pack/export";
import type { Store } from "../store";
import type { Question } from "../grade";
import {
  answerDaily,
  dailyQuestions,
  deckProgress,
  dueCards,
  Encompassing,
  gradeQuiz,
  LearnError,
  publicQuestion,
  quizSession,
  rateCard,
  type DailyOutcome,
  type DeckProgress,
  type PublicQuestion,
  type QuizOutcome,
  type Recorder,
  type ReviewCard,
} from "./learn";

export interface LearnBackend {
  readonly kind: "direct" | "server";
  quiz(size: number): Promise<PublicQuestion[]>;
  answerQuiz(itemId: string, choice: number | null, elapsedMs: number): Promise<QuizOutcome>;
  review(size: number): Promise<ReviewCard[]>;
  rate(itemId: string, rating: number, elapsedMs: number): Promise<{ due: number | null }>;
  decks(): Promise<DeckProgress[]>;
  daily(day: string): Promise<{ questions: DailyQuestion[]; answered: string[] } | null>;
  answerDaily(day: string, id: string, response: unknown, elapsedMs: number): Promise<DailyOutcome>;
}

export interface DirectParts {
  store: Store;
  content: Pick<Pack, "atoms" | "decks">;
  daily: DailyQuizStore;
  record: Recorder;
  now?: () => number;
  seed?: () => string;
}

export function directBackend(p: DirectParts): LearnBackend {
  const now = p.now ?? Date.now;
  const seed = p.seed ?? (() => randomBytes(8).toString("hex"));
  const enc = new Encompassing(p.store, p.content);
  const open = new Map<string, Question>();
  return {
    kind: "direct",
    async quiz(size) {
      const qs = quizSession(p.store, now(), size, seed());
      open.clear();
      for (const q of qs) open.set(q.itemId, q);
      return qs.map(publicQuestion);
    },
    async answerQuiz(itemId, choice, elapsedMs) {
      const q = open.get(itemId);
      if (!q) throw new LearnError("no open question", 404);
      const r = gradeQuiz(p.store, enc, q, choice, elapsedMs, now());
      open.delete(itemId);
      return r;
    },
    async review(size) {
      return dueCards(p.store, now(), size);
    },
    async rate(itemId, rating, elapsedMs) {
      return rateCard(p.store, enc, itemId, rating, elapsedMs, now());
    },
    async decks() {
      return deckProgress(p.store, (p.content.decks ?? []) as PackDeck[], now());
    },
    async daily(day) {
      return dailyQuestions(p.daily, day, { fit: true });
    },
    async answerDaily(day, id, response, elapsedMs) {
      return answerDaily(p.daily, p.record, day, id, response, Math.min(elapsedMs, 3_600_000), now(), packLearnAtoms(p.content.atoms));
    },
  };
}

export interface ServerRecord {
  pid: number;
  port: number;
  token: string;
  secret: string;
}

export const SERVER_CALL_MS = 10_000;

export const SERVER_FILE = "serve.json";

export function writeServerRecord(dir: string, rec: ServerRecord): () => void {
  const file = join(dir, SERVER_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(rec), { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, file);
  return () => {
    try {
      if ((JSON.parse(readFileSync(file, "utf8")) as ServerRecord).pid === rec.pid) rmSync(file, { force: true });
    } catch {
      return;
    }
  };
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export function readServerRecord(dir: string, isAlive: (pid: number) => boolean = alive): ServerRecord | null {
  let rec: Partial<ServerRecord>;
  try {
    rec = JSON.parse(readFileSync(join(dir, SERVER_FILE), "utf8")) as Partial<ServerRecord>;
  } catch {
    return null;
  }
  if (!Number.isInteger(rec.pid) || !Number.isInteger(rec.port) || typeof rec.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rec.token) || typeof rec.secret !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rec.secret)) return null;
  return isAlive(rec.pid!) ? (rec as ServerRecord) : null;
}

export async function proven(rec: ServerRecord): Promise<boolean> {
  const challenge = randomBytes(32).toString("base64url");
  try {
    const r = await fetch(`http://127.0.0.1:${rec.port}/cli/prove?challenge=${challenge}`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return false;
    const proof = ((await r.json()) as { proof?: unknown }).proof;
    if (typeof proof !== "string") return false;
    const want = Buffer.from(proveServer(rec.secret, challenge));
    const got = Buffer.from(proof);
    return want.length === got.length && timingSafeEqual(want, got);
  } catch {
    return false;
  }
}

export async function findServer(dir: string, isAlive?: (pid: number) => boolean): Promise<LearnBackend | null> {
  const rec = readServerRecord(dir, isAlive);
  if (!rec || !(await proven(rec))) return null;
  return serverBackend(rec);
}

export function serverBackend(rec: ServerRecord): LearnBackend {
  const base = `http://127.0.0.1:${rec.port}`;
  const call = async <T>(path: string, body?: unknown): Promise<T> => {
    const text = body === undefined ? undefined : JSON.stringify(body);
    const r = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { authorization: `Bucket ${rec.token}`, ...(text ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(text)) } : {}) },
      body: text,
      signal: AbortSignal.timeout(SERVER_CALL_MS),
    });
    const out = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) throw new LearnError(out.error ?? `the running Bucket answered ${r.status}`, r.status);
    return out;
  };
  return {
    kind: "server",
    quiz: async (size) => (await call<{ questions: PublicQuestion[] }>(`/local/quiz?n=${size}`)).questions,
    answerQuiz: (itemId, choice, elapsedMs) => call<QuizOutcome>("/local/quiz", { itemId, choice, elapsedMs }),
    review: async (size) => (await call<{ items: ReviewCard[] }>(`/local/review?n=${size}`)).items,
    rate: (itemId, rating, elapsedMs) => call<{ due: number | null }>("/local/review", { itemId, rating, elapsedMs }),
    decks: async () => (await call<{ decks: DeckProgress[] }>("/local/decks")).decks,
    daily: async (day) => {
      try {
        return await call<{ questions: DailyQuestion[]; answered: string[] }>(`/local/work-quiz/daily?fit=1&day=${day}`);
      } catch (e) {
        if (e instanceof LearnError && e.status === 404) return null;
        throw e;
      }
    },
    answerDaily: (day, id, response, elapsedMs) => call<DailyOutcome>("/local/work-quiz/answer", { day, id, response, elapsedMs }),
  };
}
