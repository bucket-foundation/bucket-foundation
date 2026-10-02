import { randomBytes } from "node:crypto";
import { ALREADY_IMPORTED, importProgress } from "./core/importer";
import { mergeState, normalizeState } from "../../../src/lib/academy/engine";
import { dueCards, deckProgress, Encompassing, gradeQuiz, LearnError, publicQuestion, quizSession, rateCard } from "./core/learn";
import type { Question } from "./grade";
import type { Route } from "./serve";
import type { Pack, PackDeck } from "./pack/export";
import type { Store } from "./store";

export interface LocalOptions {
  now?: () => number;
  seed?: () => string;
  content?: Pick<Pack, "decks" | "atoms">;
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

function guarded(fn: () => unknown): Response {
  try {
    return json(fn());
  } catch (e) {
    if (e instanceof LearnError) return json({ error: e.message }, e.status);
    throw e;
  }
}

export function localRoutes(store: Store, opts: LocalOptions = {}): Record<string, Route> {
  const now = opts.now ?? Date.now;
  const seed = opts.seed ?? (() => randomBytes(8).toString("hex"));
  const open = new Map<string, Question>();
  const decks: PackDeck[] = opts.content?.decks ?? [];
  const enc = new Encompassing(store, opts.content);

  return {
    "GET /local/quiz": (_req, url) => {
      const qs = quizSession(store, now(), count(url, 10, 50), seed());
      open.clear();
      for (const q of qs) open.set(q.itemId, q);
      return json({ questions: qs.map(publicQuestion) });
    },
    "POST /local/quiz": async (req) => {
      const b = await body(req);
      if (!b || typeof b.itemId !== "string") return json({ error: "itemId required" }, 400);
      const q = open.get(b.itemId);
      if (!q) return json({ error: "no open question" }, 404);
      const ms = elapsed(b.elapsedMs);
      if (ms === null) return json({ error: "bad elapsedMs" }, 400);
      return guarded(() => {
        const r = gradeQuiz(store, enc, q, b.choice, ms, now());
        open.delete(q.itemId);
        return r;
      });
    },
    "GET /local/review": (_req, url) => json({ items: dueCards(store, now(), count(url, 20, 100)) }),
    "POST /local/review": async (req) => {
      const b = await body(req);
      if (!b) return json({ error: "unknown item" }, 404);
      const ms = elapsed(b.elapsedMs);
      if (typeof b.itemId === "string" && store.items().some((i) => i.id === b.itemId) && (b.rating === 1 || b.rating === 2 || b.rating === 3 || b.rating === 4) && ms === null)
        return json({ error: "bad elapsedMs" }, 400);
      return guarded(() => ({ ok: true, ...rateCard(store, enc, b.itemId, b.rating, ms ?? 0, now()) }));
    },
    "GET /local/decks": () => json({ decks: deckProgress(store, decks, now()) }),
    "GET /local/atoms": (_req, url) => {
      const deck = url.searchParams.get("deck") ?? "";
      const list = enc.deckAtoms(deck);
      return list ? json({ deck, atoms: list }) : json({ error: "unknown deck" }, 404);
    },
    "GET /local/progress": () => {
      const branches: Record<string, { data: unknown; updated_at: string }> = {};
      for (const deck of store.learnDecks()) branches[deck] = { data: store.learnState(deck), updated_at: new Date(store.learnUpdatedAt(deck)).toISOString() };
      return json({ branches });
    },
    "POST /local/progress": async (req) => {
      const b = await body(req);
      if (!b || typeof b.branch !== "string" || !DECK_ID.test(b.branch) || !b.data || typeof b.data !== "object") return json({ error: "branch and data required" }, 400);
      const merged = mergeState(store.learnState(b.branch), normalizeState(b.data));
      store.putLearnState(b.branch, merged, now());
      return json({ data: merged });
    },
    "POST /local/import": async (req, url) => {
      const force = url.searchParams.get("force") === "1";
      if (store.meta("web_import_at") && !force) return json({ error: ALREADY_IMPORTED }, 409);
      const r = importProgress(store, decks, await body(req), force, now());
      return r.ok ? json({ imported: r.imported }) : json({ error: r.error }, r.status);
    },
  };
}

const DECK_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const IMPORT_BODY_BYTES = 8 * 1024 * 1024;
const LS_PREFIX = "bucket-academy/v1/";

export function webBranches(b: Record<string, unknown>): Record<string, ReturnType<typeof normalizeState>> | null {
  const source = b.branches && typeof b.branches === "object" && !Array.isArray(b.branches) ? (b.branches as Record<string, unknown>) : b;
  const out: Record<string, ReturnType<typeof normalizeState>> = {};
  for (const [k, v] of Object.entries(source)) {
    const deck = k.startsWith(LS_PREFIX) ? k.slice(LS_PREFIX.length) : k;
    if (!DECK_ID.test(deck)) return null;
    let raw: unknown = v;
    if (typeof v === "string") {
      try {
        raw = JSON.parse(v);
      } catch {
        return null;
      }
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    out[deck] = normalizeState(raw);
  }
  return Object.keys(out).length ? out : null;
}
