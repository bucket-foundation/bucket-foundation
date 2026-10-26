export interface DeckCard {
  surface: string;
  lang: string;
  meaning_en: string | null;
  ipa: string | null;
  source_surface: string | null;
  source_lang: string | null;
  deck: string;
}

export type DeckParse = { ok: true; card: DeckCard } | { ok: false; error: string };

const LANG_RE = /^[a-z]{2,3}$/;
const DECK_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,47}$/;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

export function parseDeckCard(body: unknown): DeckParse {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const surface = text(b.surface, 120);
  if (!surface) return { ok: false, error: "missing_surface" };
  const lang = typeof b.lang === "string" ? b.lang.trim().toLowerCase() : "";
  if (!LANG_RE.test(lang)) return { ok: false, error: "bad_lang" };
  const sourceLang = typeof b.source_lang === "string" ? b.source_lang.trim().toLowerCase() : "";
  if (sourceLang && !LANG_RE.test(sourceLang)) return { ok: false, error: "bad_source_lang" };
  const deck = text(b.deck, 48) ?? "default";
  if (!DECK_RE.test(deck)) return { ok: false, error: "bad_deck" };
  return {
    ok: true,
    card: {
      surface,
      lang,
      meaning_en: text(b.meaning_en, 240),
      ipa: text(b.ipa, 80),
      source_surface: text(b.source_surface, 120),
      source_lang: sourceLang || null,
      deck,
    },
  };
}

export interface DeckDeps {
  configured: () => boolean;
  verifyUser: () => Promise<string | null>;
  rateHit: (key: string, limit: number, windowSeconds: number) => Promise<boolean>;
  save: (userId: string, card: DeckCard) => Promise<{ ok: boolean; duplicate?: boolean }>;
  list: (userId: string, deck: string | null) => Promise<DeckCard[] | null>;
}

export type DeckResult = { status: number; body: Record<string, unknown> };

export const DECK_SAVE_LIMIT = 120;

export function createDeckHandler(deps: DeckDeps) {
  async function user(): Promise<string | DeckResult> {
    if (!deps.configured()) return { status: 503, body: { error: "sync_unavailable" } };
    const uid = await deps.verifyUser();
    return uid ?? { status: 401, body: { error: "unauthorized" } };
  }

  return {
    async save(body: unknown): Promise<DeckResult> {
      const uid = await user();
      if (typeof uid !== "string") return uid;
      const parsed = parseDeckCard(body);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      if (!(await deps.rateHit(`deck:${uid}`, DECK_SAVE_LIMIT, 600))) return { status: 429, body: { error: "too_many_requests" } };
      const r = await deps.save(uid, parsed.card);
      if (!r.ok) return { status: 500, body: { error: "save_failed" } };
      return { status: r.duplicate ? 200 : 201, body: { ok: true, duplicate: Boolean(r.duplicate), card: parsed.card } };
    },
    async list(deck: string | null): Promise<DeckResult> {
      const uid = await user();
      if (typeof uid !== "string") return uid;
      if (deck !== null && !DECK_RE.test(deck)) return { status: 400, body: { error: "bad_deck" } };
      const cards = await deps.list(uid, deck);
      if (!cards) return { status: 500, body: { error: "read_failed" } };
      return { status: 200, body: { cards } };
    },
  };
}
