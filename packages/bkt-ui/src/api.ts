import { createBktServeStore, type BktServeStore } from "@academy/bkt-serve-store";
import type { Atom } from "@academy/engine";
import type { AdvisorRow, PrimeDirections } from "@ros/advisor-review";
import { parseRos, ROS_PATHS, type RosPayloads, type RosResource } from "@ros/contract";
import type { ProductionsSnapshot } from "@ros/productions-snapshot";

export interface HistoryData {
  snapshot: (ProductionsSnapshot & { importedAt: number }) | null;
  activity: { day: string; learn: number; work: number; notes: number }[];
}

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkStatus {
  beads: number;
  prs: number;
  repo: string | null;
  repoError: string | null;
  chat?: { claude: boolean; codex: boolean };
  ready: boolean;
  answered: number;
  correct: number;
}

export interface WorkQuestion {
  id: string;
  type: string;
  prompt: string;
  lines: string[];
  choices: string[] | null;
  limitSec: number;
}

export interface WorkAnswer {
  correct: boolean;
  timedOut: boolean;
  answer: string;
  explain: string;
}

export interface DailyQuiz {
  day: string;
  questions: WorkQuestion[];
  answered: string[];
}

export interface DailyAnswer extends WorkAnswer {
  log10Distance: number | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const requestFailed = (status: number) => `Bucket ran into a problem (${status}). Try again.`;

export interface JobKind {
  kind: string;
  label: string;
  inputs: { name: string; label: string; exts: string[] }[];
}

export interface JobView {
  id: string;
  kind: string;
  state: "running" | "done" | "failed" | "cancelled" | "timeout";
  startedAt: number;
  endedAt: number | null;
  code: number | null;
  log: string;
  logTruncated: boolean;
  result: unknown;
  error: string | null;
}

export interface StoredReview {
  key: string;
  prime_axes: string[];
  our_axes: string[];
  star_query_prime: number[];
  star_query_ours: number[];
  summary: string;
  imported_at: number;
  rows: AdvisorRow[];
}

declare global {
  interface Window {
    __BKT__?: { nonce?: string };
  }
}

export interface DeckRow {
  id: string;
  title: string;
  atoms: number;
  introduced: number;
  due: number;
  xp: number;
}

export interface QuizQuestion {
  itemId: string;
  prompt: string;
  choices: string[];
  limitSec: number;
}

export interface QuizResult {
  correct: boolean;
  timedOut: boolean;
  rating: number;
  answer: string;
}

export interface ReviewItem {
  id: string;
  title: string;
  prompt: string;
  answer: string;
}

export class Api {
  readonly progress: BktServeStore;

  constructor(private token: string, onError: (e: Error) => void) {
    this.progress = createBktServeStore({ token, onError });
  }

  static async connect(onError: (e: Error) => void): Promise<Api> {
    const nonce = window.__BKT__?.nonce;
    delete window.__BKT__;
    if (!nonce) throw new Error("This window has no launch code. Run bkt app to open Bucket.");
    const r = await fetch("/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
    if (!r.ok) throw new Error(`Bucket refused the launch code (${r.status}). Run bkt app to open Bucket again.`);
    const { token } = (await r.json()) as { token: string };
    return new Api(token, onError);
  }

  private async call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const r = await fetch(path, {
      method: init.method ?? "GET",
      headers: { authorization: `Bucket ${this.token}`, ...(init.body === undefined ? {} : { "content-type": "application/json" }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const data = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) throw new ApiError(data.error ?? requestFailed(r.status), r.status);
    return data;
  }

  decks() {
    return this.call<{ decks: DeckRow[] }>("/local/decks").then((r) => r.decks);
  }

  atoms(deck: string) {
    return this.call<{ atoms: Atom[] }>(`/local/atoms?deck=${encodeURIComponent(deck)}`).then((r) => r.atoms);
  }

  quiz(n = 10) {
    return this.call<{ questions: QuizQuestion[] }>(`/local/quiz?n=${n}`).then((r) => r.questions);
  }

  answer(itemId: string, choice: number | null, elapsedMs: number) {
    return this.call<QuizResult>("/local/quiz", { method: "POST", body: { itemId, choice, elapsedMs } });
  }

  due(n = 20) {
    return this.call<{ items: ReviewItem[] }>(`/local/review?n=${n}`).then((r) => r.items);
  }

  rate(itemId: string, rating: 1 | 2 | 3 | 4, elapsedMs: number) {
    return this.call<{ ok: boolean; due: number | null }>("/local/review", { method: "POST", body: { itemId, rating, elapsedMs } });
  }

  importWeb(payload: unknown, force = false) {
    return this.call<{ imported: string[] }>(`/local/import${force ? "?force=1" : ""}`, { method: "POST", body: payload });
  }

  advisor() {
    return this.call<{ review: StoredReview | null; forgotten: number }>("/local/advisor");
  }

  importAdvisor(file: unknown, force = false) {
    return this.call<{ imported: number; forgotten: number }>(`/local/advisor/import${force ? "?force=1" : ""}`, { method: "POST", body: file });
  }

  forgetAdvisor() {
    return this.call<{ forgotten: number }>("/local/advisor/forget", { method: "POST", body: {} });
  }

  primeDirections() {
    return this.call<{ sets: (PrimeDirections & { imported_at: number })[] }>("/local/prime-directions").then((r) => r.sets);
  }

  importPrimeDirections(file: unknown) {
    return this.call<{ corpus: string; components: number }>("/local/prime-directions/import", { method: "POST", body: file });
  }

  jobs() {
    return this.call<{ kinds: JobKind[]; jobs: JobView[] }>("/local/jobs");
  }

  startJob(kind: string, files: Record<string, { text: string; ext: string }>, options: Record<string, number> = {}) {
    return this.call<JobView>("/local/jobs", { method: "POST", body: { kind, files, options } });
  }

  cancelJob(id: string) {
    return this.call<JobView>("/local/jobs/cancel", { method: "POST", body: { id } });
  }

  deleteJob(id: string) {
    return this.call<{ deleted: string }>("/local/jobs/delete", { method: "POST", body: { id } });
  }

  workStatus() {
    return this.call<WorkStatus>("/local/work-quiz/status");
  }

  workBeads(text: string) {
    return this.call<{ beads: number }>("/local/work-quiz/beads", { method: "POST", body: { text } });
  }

  workRepo(path: string | null) {
    return this.call<{ repo: string | null }>("/local/work-quiz/repo", { method: "POST", body: { path } });
  }

  workChat(chat: { claude: boolean; codex: boolean }) {
    return this.call<{ chat: { claude: boolean; codex: boolean } }>("/local/work-quiz/chat", { method: "POST", body: chat });
  }

  workForget() {
    return this.call<{ cleared: boolean }>("/local/work-quiz/forget", { method: "POST", body: {} });
  }

  workNext() {
    return this.call<WorkQuestion>("/local/work-quiz/next");
  }

  dailyQuiz(day: string) {
    return this.call<DailyQuiz>(`/local/work-quiz/daily?day=${encodeURIComponent(day)}`);
  }

  dailyAnswer(day: string, id: string, response: string, elapsedMs: number) {
    return this.call<DailyAnswer>("/local/work-quiz/answer", { method: "POST", body: { day, id, response, elapsedMs } });
  }

  workAnswer(id: string, response: string, elapsedMs: number) {
    return this.call<WorkAnswer>("/local/work-quiz/answer", { method: "POST", body: { id, response, elapsedMs } });
  }

  async ros<K extends RosResource>(resource: K): Promise<RosPayloads[K] | null> {
    const r = await fetch(ROS_PATHS[resource].local, { headers: { authorization: `Bucket ${this.token}` } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${resource} ${r.status}`);
    return parseRos(resource, await r.json());
  }

  notes() {
    return this.call<{ notes: Note[] }>("/local/notes").then((r) => r.notes);
  }

  saveNote(note: { id?: string; title: string; body: string; pinned: boolean }) {
    return this.call<Note>("/local/notes", { method: "POST", body: note });
  }

  deleteNote(id: string) {
    return this.call<{ deleted: string }>("/local/notes/delete", { method: "POST", body: { id } });
  }

  history() {
    return this.call<HistoryData>("/local/history");
  }

  importHistory(file: unknown) {
    return this.call<{ productions: number }>("/local/history/import", { method: "POST", body: file });
  }

  forgetHistory() {
    return this.call<{ cleared: boolean }>("/local/history/forget", { method: "POST", body: {} });
  }
}
