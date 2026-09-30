import { createBktServeStore, type BktServeStore } from "@academy/bkt-serve-store";
import type { Atom } from "@academy/engine";

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
    if (!r.ok) throw new Error(data.error ?? `${path} ${r.status}`);
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
}
