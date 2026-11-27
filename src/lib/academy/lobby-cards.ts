export const CARD_TTL_MS = 24 * 60 * 60 * 1000;
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const BANDS = ["under13", "teen", "adult"] as const;

export interface RoomCard {
  band: (typeof BANDS)[number];
  speaks: { lang: string; level: 1 | 2 | 3 | 4; reads?: boolean }[];
  learn: string[];
  surprise: boolean;
}

export function roomCard(raw: unknown): RoomCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!BANDS.includes(r.band as RoomCard["band"])) return null;
  const seen = new Set<string>();
  const speaks: RoomCard["speaks"] = [];
  for (const s of Array.isArray(r.speaks) ? r.speaks.slice(0, 6) : []) {
    const lang = (s as { lang?: unknown })?.lang;
    const level = (s as { level?: unknown })?.level;
    if (typeof lang !== "string" || !LANG_RE.test(lang) || seen.has(lang) || ![1, 2, 3, 4].includes(level as number)) continue;
    seen.add(lang);
    speaks.push(level === 4 ? { lang, level: 4, reads: (s as { reads?: unknown }).reads !== false } : { lang, level: level as 1 | 2 | 3 });
  }
  const learn = (Array.isArray(r.learn) ? r.learn : []).filter((l): l is string => typeof l === "string" && LANG_RE.test(l) && !seen.has(l)).slice(0, 3);
  if (!speaks.length) return null;
  return { band: r.band as RoomCard["band"], speaks, learn: Array.from(new Set(learn)), surprise: r.surprise === true && learn.length === 0 };
}

export function cardReadAllowed(uid: string, players: readonly string[], screens: readonly string[], hostId: string): boolean {
  return uid === hostId || players.includes(uid) || screens.includes(uid);
}

export function freshCard(createdAt: string, now: number): boolean {
  return now - Date.parse(createdAt) < CARD_TTL_MS;
}

export function cardStorable(card: RoomCard): boolean {
  return card.band !== "under13";
}

export function sharedCards<T>(cards: readonly T[], share: boolean): T[] {
  return share ? cards.slice() : [];
}

export function cardEditable(lobbyStatus: string): boolean {
  return lobbyStatus === "lobby";
}

export function seatBandOf(raw: unknown): RoomCard["band"] | null {
  return BANDS.includes(raw as RoomCard["band"]) ? (raw as RoomCard["band"]) : null;
}
