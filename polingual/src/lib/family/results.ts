import type { AgeBand } from "./card";

export const ROOM_BRANCH = "polingual-rooms";
const LOCAL_KEY = "polingual/rooms/v1";
const KEEP = 200;

export interface MissedWord {
  lang: string;
  word: string;
  meaning: string;
}

export interface RoomRecord {
  key: string;
  code: string;
  day: string;
  xp: number;
  rank: number;
  players: number;
  missed: MissedWord[];
  savedAt: number;
}

export type RoomBook = Record<string, RoomRecord>;
export type SaveState = "account" | "device" | "skipped" | "failed";
export type SyncDeps = { fetch: typeof fetch; token: () => Promise<string | null>; user: () => Promise<string | null> };

export function dayOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function mergeRooms(a: RoomBook, b: RoomBook): RoomBook {
  const all: RoomBook = { ...b };
  for (const [k, v] of Object.entries(a)) if (!all[k] || v.savedAt < all[k].savedAt) all[k] = v;
  const keys = Object.keys(all).sort((x, y) => all[y].savedAt - all[x].savedAt).slice(0, KEEP);
  return Object.fromEntries(keys.map((k) => [k, all[k]]));
}

function same(a: RoomBook, b: RoomBook): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => b[k]?.savedAt === a[k].savedAt);
}

export function roomDays(book: RoomBook | null | undefined): string[] {
  return Array.from(new Set(Object.values(book ?? {}).map((r) => r.day))).sort();
}

export function roomXp(book: RoomBook): number {
  return Object.values(book).reduce((s, r) => s + r.xp, 0);
}

export function bookFromBranch(data: unknown): RoomBook {
  const rooms = (data as { rooms?: RoomBook } | null)?.rooms;
  return rooms && typeof rooms === "object" ? rooms : {};
}

const ownedKey = (owner: string | null) => (owner ? `${LOCAL_KEY}@${owner}` : LOCAL_KEY);
type Store = Pick<Storage, "getItem" | "setItem">;

export function readRooms(store: Store | null, owner: string | null = null): RoomBook {
  try {
    const raw = store?.getItem(ownedKey(owner));
    return raw ? (JSON.parse(raw) as RoomBook) : {};
  } catch {
    return {};
  }
}

function writeRooms(store: Store | null, book: RoomBook, owner: string | null = null): void {
  try {
    store?.setItem(ownedKey(owner), JSON.stringify(book));
  } catch {
    return;
  }
}

async function call(deps: SyncDeps, init?: RequestInit): Promise<Response | null> {
  const t = await deps.token();
  if (!t) return null;
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${t}`);
  return deps.fetch("/api/academy/progress", { ...init, headers, cache: "no-store" });
}

async function pull(deps: SyncDeps): Promise<RoomBook | null> {
  try {
    const r = await call(deps);
    if (!r?.ok) return null;
    const body = (await r.json()) as { branches?: Record<string, { data?: unknown }> };
    return bookFromBranch(body.branches?.[ROOM_BRANCH]?.data);
  } catch {
    return null;
  }
}

async function push(deps: SyncDeps, book: RoomBook): Promise<boolean> {
  try {
    const r = await call(deps, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch: ROOM_BRANCH, data: { rooms: book, days: roomDays(book) } }) });
    return !!r?.ok;
  } catch {
    return false;
  }
}

async function sync(deps: SyncDeps, local: RoomBook): Promise<RoomBook | null> {
  for (let n = 0; n < 3; n++) {
    const remote = await pull(deps);
    if (!remote) return null;
    const book = mergeRooms(local, remote);
    if (same(book, remote)) return book;
    if (await push(deps, book)) return book;
  }
  return null;
}

async function owner(deps: SyncDeps | null): Promise<string | null> {
  if (!deps || !(await deps.token())) return null;
  return deps.user();
}

export async function recordRoom(rec: RoomRecord, band: AgeBand, store: Store | null, deps: SyncDeps | null): Promise<{ book: RoomBook; saved: SaveState }> {
  if (band === "under13") return { book: {}, saved: "skipped" };
  const who = await owner(deps);
  const book = mergeRooms(readRooms(store, who), { [rec.key]: rec });
  writeRooms(store, book, who);
  if (!deps || !who) return { book, saved: "device" };
  const synced = await sync(deps, mergeRooms(book, readRooms(store)));
  if (!synced) return { book, saved: "failed" };
  writeRooms(store, synced, who);
  writeRooms(store, {});
  return { book: synced, saved: "account" };
}

export async function adoptGuestRooms(store: Store | null, deps: SyncDeps): Promise<"empty" | "account" | "device"> {
  const guest = readRooms(store);
  if (Object.keys(guest).length === 0) return "empty";
  const who = await owner(deps);
  if (!who) return "device";
  const synced = await sync(deps, mergeRooms(readRooms(store, who), guest));
  if (!synced) return "device";
  writeRooms(store, synced, who);
  writeRooms(store, {});
  return "account";
}
