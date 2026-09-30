import { randomBytes } from "node:crypto";
import { buildEncompassingMap, mergeState, normalizeState, withLeverage, type Atom, type EncEdge } from "../../../src/lib/academy/engine";
import { answerQuiz, answerReview, pickSession, quizQuestions } from "./deck";
import type { Question, Rating } from "./grade";
import type { Route } from "./serve";
import type { Pack, PackDeck } from "./pack/export";
import { deckOf, type Store } from "./store";

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

export function localRoutes(store: Store, opts: LocalOptions = {}): Record<string, Route> {
  const now = opts.now ?? Date.now;
  const seed = opts.seed ?? (() => randomBytes(8).toString("hex"));
  const open = new Map<string, Question>();
  const decks: PackDeck[] = opts.content?.decks ?? [];
  const atoms = new Map<string, Atom[]>(Object.entries(opts.content?.atoms ?? {}).map(([d, a]) => [d, withLeverage(a)]));
  const enc = new Map<string, Record<string, EncEdge[]>>();
  const encFor = (deck: string) => {
    if (!enc.has(deck)) enc.set(deck, buildEncompassingMap(atoms.get(deck) ?? []));
    return enc.get(deck)!;
  };
  const itemDeck = (itemId: string) => {
    const it = store.items().find((i) => i.id === itemId);
    return it ? deckOf(it.branch) : "";
  };

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
      const r = answerQuiz(store, q, choice as number | null, ms, now(), encFor(itemDeck(q.itemId)));
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
      answerReview(store, b.itemId, b.rating as Rating, ms, now(), encFor(itemDeck(b.itemId)));
      return json({ ok: true, due: store.card(b.itemId)?.due ?? null });
    },
    "GET /local/decks": () => {
      const s = now();
      return json({
        decks: decks.map((d) => {
          const state = store.learnState(d.id);
          const cards = Object.values(state.cards);
          return { ...d, introduced: cards.length, due: cards.filter((c) => c.due != null && c.due <= s).length, xp: state.stats.xp };
        }),
      });
    },
    "GET /local/atoms": (_req, url) => {
      const deck = url.searchParams.get("deck") ?? "";
      const list = atoms.get(deck);
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
    "POST /local/import": async (req) => {
      if (store.meta("web_import_at")) return json({ error: "already imported" }, 409);
      const b = await body(req);
      const incoming = b ? webBranches(b) : null;
      if (!incoming) return json({ error: "expected { branches: { <deck>: EngineState } }" }, 400);
      const at = now();
      const imported: string[] = [];
      store.db.transaction(() => {
        for (const [deck, state] of Object.entries(incoming)) {
          store.putLearnState(deck, mergeState(store.learnState(deck), state), at);
          imported.push(deck);
        }
        store.setMeta("web_import_at", String(at));
      })();
      return json({ imported: imported.sort() });
    },
  };
}

const DECK_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
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
