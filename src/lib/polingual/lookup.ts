import { parseDeckCard, type DeckCard } from "./deck";

export interface SimilarWord {
  surface: string;
  lang: string;
  meaning_en: string | null;
  ipa: string | null;
  score: number | null;
}

type Json = Record<string, unknown>;

export interface LookupDeps {
  fetchJson: (path: string, params: Record<string, string>) => Promise<Json | null>;
  userId: () => Promise<string | null>;
  addCard: (userId: string, card: DeckCard) => Promise<{ ok: boolean; duplicate?: boolean }>;
}

export type LookupResult = { status: number; body: Json };

export const SIMILAR_K = 6;

function similar(res: Json | null): SimilarWord[] {
  const rows = Array.isArray(res?.results) ? (res.results as Json[]) : [];
  return rows.slice(0, SIMILAR_K).map((r) => ({
    surface: String(r.surface ?? ""),
    lang: String(r.lang ?? ""),
    meaning_en: typeof r.meaning_en === "string" ? r.meaning_en : null,
    ipa: typeof r.ipa === "string" ? r.ipa : null,
    score: typeof r.score === "number" ? r.score : typeof r.similarity === "number" ? r.similarity : null,
  })).filter((r) => r.surface);
}

export interface LookupQuery {
  surface: string;
  from: string;
  to: string | null;
  deck: string | null;
  save: boolean;
}

export const LOOKUP_IP_LIMIT = 60;
export const LOOKUP_WINDOW_S = 60;
export const LOOKUP_MAX_INFLIGHT = 8;

export function createGate(maxInflight: number) {
  let inflight = 0;
  return async function run<T>(fn: () => Promise<T>, busy: () => T): Promise<T> {
    if (inflight >= maxInflight) return busy();
    inflight++;
    try {
      return await fn();
    } finally {
      inflight--;
    }
  };
}

export function createMemoryRate(now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return async function rateHit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((h) => t - h < windowSeconds * 1000);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 10000) hits.clear();
    return true;
  };
}

export async function handleLookup(deps: LookupDeps, q: LookupQuery): Promise<LookupResult> {
  const surface = q.surface.trim();
  if (!surface) return { status: 400, body: { error: "missing_surface" } };
  const params: Record<string, string> = { surface, from: q.from };
  if (q.to) params.to = q.to;
  const main = await deps.fetchJson("/translate/many", params);
  if (!main) return { status: 503, body: { error: "upstream_unavailable" } };
  if (main.found === false) return { status: 404, body: { ...main, similar: { meaning: [], phonetic: [] }, deck: { saved: false, reason: "not_found" } } };

  const [sem, pho] = await Promise.all([
    deps.fetchJson("/semantic", { surface, lang: q.from, k: String(SIMILAR_K) }),
    deps.fetchJson("/phonetic", { surface, lang: q.from, k: String(SIMILAR_K) }),
  ]);

  let deck: Json = { saved: false, reason: "not_requested" };
  const uid = q.save ? await deps.userId() : null;
  if (q.save && !uid) deck = { saved: false, reason: "signed_out" };
  if (uid) {
    const parsed = parseDeckCard({
      surface: typeof main.word === "string" ? main.word : surface,
      lang: q.from,
      meaning_en: main.meaning_en,
      ipa: main.ipa,
      deck: q.deck ?? undefined,
    });
    if (!parsed.ok) deck = { saved: false, reason: parsed.error };
    else {
      const r = await deps.addCard(uid, parsed.card);
      deck = r.ok ? { saved: !r.duplicate, already_in_deck: Boolean(r.duplicate), deck: parsed.card.deck } : { saved: false, reason: "save_failed" };
    }
  }
  return { status: 200, body: { ...main, similar: { meaning: similar(sem), phonetic: similar(pho) }, deck } };
}
