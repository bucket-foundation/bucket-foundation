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

export async function handleLookup(deps: LookupDeps, q: { surface: string; from: string; to: string | null; deck: string | null }): Promise<LookupResult> {
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

  let deck: Json = { saved: false, reason: "signed_out" };
  const uid = await deps.userId();
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
