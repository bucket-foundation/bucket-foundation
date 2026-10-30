import { LANG_CODES } from "../academy/lang-systems";

export const MEETUP_TERMS_VERSION = 1;
export const NEAR_KM = 60;
export const REPORTS_TO_HIDE = 3;
export const REPORT_REASONS = ["unsafe", "offensive", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface MeetupRow {
  id: string;
  host_id: string | null;
  host_name: string;
  title: string;
  about: string;
  langs: string[];
  starts_at: string;
  duration_min: number;
  mode: "in_person" | "online";
  city: string;
  area: string;
  place_name: string;
  lat: number | string | null;
  lon: number | string | null;
  online_url: string | null;
  capacity: number | null;
  created_at: string;
  cancelled_at: string | null;
  taken_down_at: string | null;
}

export interface MeetupDraft {
  hostName: string;
  title: string;
  about: string;
  langs: string[];
  startsAt: string;
  durationMin: number;
  mode: "in_person" | "online";
  city: string;
  area: string;
  placeName: string;
  lat: number | null;
  lon: number | null;
  onlineUrl: string | null;
  capacity: number | null;
}

export interface Meetup {
  id: string;
  hostName: string;
  isHost: boolean;
  title: string;
  about: string;
  langs: string[];
  startsAt: string;
  durationMin: number;
  mode: "in_person" | "online";
  city: string;
  area: string;
  placeName: string | null;
  lat: number | null;
  lon: number | null;
  onlineUrl: string | null;
  capacity: number | null;
  going: number;
  isGoing: boolean;
  status: "open" | "cancelled" | "under_review" | "full";
}

const BLOCKED_TERMS = ["nigger", "niggers", "faggot", "faggots", "retard", "retards", "kike", "kikes", "chink", "chinks", "tranny", "escort", "escorts", "onlyfans", "nudes", "porn", "hookup", "hookups", "crypto giveaway", "bitcoin", "forex", "viagra", "cashapp", "venmo me", "telegram me", "whatsapp me"];

export function foldForFilter(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g, "")
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

export function rejectedContent(...fields: string[]): boolean {
  return fields.some((f) => {
    const folded = foldForFilter(f).replace(/\b([a-z])[\s._-](?=[a-z]\b)/g, "$1");
    if (/https?:\/\/|www\.|\.(com|net|org|io|ly|me)\b/.test(folded)) return true;
    return BLOCKED_TERMS.some((t) => (t.includes(" ") ? folded.includes(t) : new RegExp(`\\b${t}\\b`).test(folded)));
  });
}

function text(v: unknown, max: number, min = 0): string | null {
  if (typeof v !== "string") return min === 0 && v == null ? "" : null;
  const t = v.replace(/\s+/g, " ").trim();
  return t.length >= min && t.length <= max ? t : null;
}

export function roundCoord(v: unknown, limit: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return Math.round(n * 100) / 100;
}

export function validLangs(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = Array.from(new Set(v.filter((x): x is string => typeof x === "string" && LANG_CODES.includes(x))));
  return out.length >= 1 && out.length <= 6 && out.length === v.length ? out : null;
}

export function validOnlineUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" && u.hostname.includes(".") && v.length <= 300 && !/\s/.test(v) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseDraft(body: Record<string, unknown> | null, now = Date.now()): MeetupDraft | "bad_request" | "bad_time" | "content_rejected" {
  if (!body) return "bad_request";
  const hostName = text(body.hostName, 40, 1);
  const title = text(body.title, 80, 1);
  const about = text(body.about ?? "", 500);
  const langs = validLangs(body.langs);
  const mode = body.mode === "online" || body.mode === "in_person" ? body.mode : null;
  const duration = typeof body.durationMin === "number" && Number.isInteger(body.durationMin) ? body.durationMin : NaN;
  const starts = typeof body.startsAt === "string" ? Date.parse(body.startsAt) : NaN;
  const capacity = body.capacity == null ? null : typeof body.capacity === "number" && Number.isInteger(body.capacity) && body.capacity >= 2 && body.capacity <= 200 ? body.capacity : undefined;
  if (!hostName || !title || about === null || !langs || !mode || !(duration >= 15 && duration <= 480) || !Number.isFinite(starts) || capacity === undefined) return "bad_request";
  if (starts < now + 30 * 60_000 || starts > now + 120 * 86_400_000) return "bad_time";
  const city = text(body.city ?? "", 80) ?? null;
  const area = text(body.area ?? "", 60) ?? null;
  const placeName = text(body.placeName ?? "", 120) ?? null;
  if (city === null || area === null || placeName === null) return "bad_request";
  let lat: number | null = null;
  let lon: number | null = null;
  let onlineUrl: string | null = null;
  if (mode === "in_person") {
    lat = roundCoord(body.lat, 90);
    lon = roundCoord(body.lon, 180);
    if (lat === null || lon === null || !city || !placeName) return "bad_request";
  } else {
    onlineUrl = validOnlineUrl(body.onlineUrl);
    if (!onlineUrl) return "bad_request";
  }
  if (rejectedContent(hostName, title, about, city, area, placeName)) return "content_rejected";
  return { hostName, title, about, langs, startsAt: new Date(starts).toISOString(), durationMin: duration, mode, city, area, placeName, lat, lon, onlineUrl, capacity };
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLon - aLon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function box(lat: number, lon: number, km = NEAR_KM): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const dLat = km / 111;
  const dLon = km / (111 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
}

export function toMeetup(row: MeetupRow, viewer: string | null, going: { count: number; viewerGoing: boolean }, countingReports: number, admin = false): Meetup {
  const isHost = viewer !== null && row.host_id === viewer;
  const closed = Boolean(row.cancelled_at || row.taken_down_at);
  const insider = admin || (!closed && (isHost || going.viewerGoing));
  const hidden = countingReports >= REPORTS_TO_HIDE || Boolean(row.taken_down_at);
  const status: Meetup["status"] = row.cancelled_at || row.taken_down_at ? "cancelled" : hidden ? "under_review" : row.capacity !== null && going.count >= row.capacity ? "full" : "open";
  const num = (v: number | string | null) => (v === null ? null : Number(v));
  return {
    id: row.id,
    hostName: row.host_name,
    isHost,
    title: row.title,
    about: row.about,
    langs: row.langs,
    startsAt: row.starts_at,
    durationMin: row.duration_min,
    mode: row.mode,
    city: row.city,
    area: row.area,
    placeName: insider ? row.place_name : null,
    lat: insider ? num(row.lat) : null,
    lon: insider ? num(row.lon) : null,
    onlineUrl: insider ? row.online_url : null,
    capacity: row.capacity,
    going: going.count,
    isGoing: going.viewerGoing,
    status,
  };
}

export function visibleInList(row: MeetupRow, viewer: string | null, blocked: Set<string>, countingReports: number, now = Date.now()): boolean {
  if (row.host_id === null || row.cancelled_at || row.taken_down_at) return false;
  if (blocked.has(row.host_id)) return false;
  if (Date.parse(row.starts_at) + row.duration_min * 60_000 < now) return false;
  return countingReports < REPORTS_TO_HIDE || row.host_id === viewer;
}

export function matchesLangs(row: MeetupRow, langs: string[]): boolean {
  return langs.length === 0 || row.langs.some((l) => langs.includes(l));
}
