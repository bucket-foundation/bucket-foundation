import { randomBytes } from "node:crypto";
import { answerQuiz, answerReview, pickSession, quizQuestions } from "./deck";
import type { Question, Rating } from "./grade";
import type { Route } from "./serve";
import type { Store } from "./store";

export interface LocalOptions {
  now?: () => number;
  seed?: () => string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function count(url: URL, fallback: number, max: number): number {
  const n = Number(url.searchParams.get("n") ?? fallback);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

async function body(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const elapsed = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, 86_400_000) : null);

export function localRoutes(store: Store, opts: LocalOptions = {}): Record<string, Route> {
  const now = opts.now ?? Date.now;
  const seed = opts.seed ?? (() => randomBytes(8).toString("hex"));
  const open = new Map<string, Question>();

  return {
    "GET /local/quiz": (_req, url) => {
      const s = seed();
      const qs = quizQuestions(store, pickSession(store, now(), count(url, 10, 50), s), s);
      open.clear();
      for (const q of qs) open.set(q.itemId, q);
      return json({ questions: qs.map(({ itemId, prompt, choices, limitSec }) => ({ itemId, prompt, choices, limitSec })) });
    },
    "POST /local/quiz": async (req) => {
      const b = await body(req);
      if (!b || typeof b.itemId !== "string") return json({ error: "itemId required" }, 400);
      const q = open.get(b.itemId);
      if (!q) return json({ error: "no open question" }, 404);
      const choice = b.choice === null ? null : b.choice;
      if (choice !== null && (typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice >= q.choices.length))
        return json({ error: "bad choice" }, 400);
      const ms = elapsed(b.elapsedMs);
      if (ms === null) return json({ error: "bad elapsedMs" }, 400);
      open.delete(q.itemId);
      const r = answerQuiz(store, q, choice as number | null, ms, now());
      return json({ ...r, answer: q.choices[q.answerIndex] });
    },
    "GET /local/review": (_req, url) => {
      const byId = new Map(store.items().map((i) => [i.id, i]));
      const items = store
        .dueItemIds(now(), count(url, 20, 100))
        .map((id) => byId.get(id))
        .filter((i) => !!i)
        .map((i) => ({ id: i!.id, title: i!.title, prompt: i!.prompt, answer: i!.answer }));
      return json({ items });
    },
    "POST /local/review": async (req) => {
      const b = await body(req);
      if (!b || typeof b.itemId !== "string" || !store.items().some((i) => i.id === b.itemId)) return json({ error: "unknown item" }, 404);
      if (b.rating !== 1 && b.rating !== 2 && b.rating !== 3 && b.rating !== 4) return json({ error: "rating must be 1..4" }, 400);
      const ms = elapsed(b.elapsedMs);
      if (ms === null) return json({ error: "bad elapsedMs" }, 400);
      answerReview(store, b.itemId, b.rating as Rating, ms, now());
      return json({ ok: true, due: store.card(b.itemId)?.due ?? null });
    },
  };
}
