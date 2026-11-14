export type DailyGame = "daily-set" | "mini" | "word-groups" | "speed-match" | "which-voice" | "letter-sprint";

export interface DailyResult {
  game: DailyGame;
  day: string;
  score: number;
  total: number;
  pattern: string;
  savedAt: number;
  words: { lang: string; itemId: string; form: string; gloss: string; right: boolean }[];
}

export type DailyBook = Record<string, DailyResult>;

export const DAILY_BRANCH = "polingual-daily";
const LOCAL_KEY = "polingual/daily/v1";
const KEEP = 120;

export const bookKey = (game: DailyGame, day: string) => `${game}|${day}`;

function earlier(x: DailyResult | undefined, y: DailyResult | undefined): DailyResult | undefined {
  if (!x) return y;
  if (!y) return x;
  return (y.savedAt ?? Infinity) < (x.savedAt ?? Infinity) ? y : x;
}

export function mergeBooks(a: DailyBook, b: DailyBook): DailyBook {
  const all: DailyBook = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) all[k] = earlier(a[k], b[k])!;
  const keys = Object.keys(all).sort((x, y) => (all[y].savedAt ?? 0) - (all[x].savedAt ?? 0)).slice(0, KEEP);
  return Object.fromEntries(keys.map((k) => [k, all[k]]));
}

export function sameBook(a: DailyBook, b: DailyBook): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => b[k] && b[k].savedAt === a[k].savedAt && b[k].pattern === a[k].pattern);
}

export function readLocal(storage: Storage | null): DailyBook {
  try {
    const raw = storage?.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as DailyBook) : {};
  } catch {
    return {};
  }
}

export function writeLocal(storage: Storage | null, book: DailyBook): void {
  try {
    storage?.setItem(LOCAL_KEY, JSON.stringify(book));
  } catch {
    return;
  }
}

export type SyncDeps = { fetch: typeof fetch; token: () => Promise<string | null> };

async function call(deps: SyncDeps, init?: RequestInit): Promise<Response | null> {
  const t = await deps.token();
  if (!t) return null;
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${t}`);
  return deps.fetch("/api/academy/progress", { ...init, headers, cache: "no-store" });
}

export async function pullBook(deps: SyncDeps): Promise<DailyBook | null> {
  try {
    const r = await call(deps);
    if (!r?.ok) return null;
    const body = (await r.json()) as { branches?: Record<string, { data?: { results?: DailyBook } }> };
    return body.branches?.[DAILY_BRANCH]?.data?.results ?? {};
  } catch {
    return null;
  }
}

export async function pushBook(deps: SyncDeps, book: DailyBook): Promise<boolean> {
  try {
    const r = await call(deps, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch: DAILY_BRANCH, data: { results: book } }) });
    return !!r?.ok;
  } catch {
    return false;
  }
}

export type SaveState = "account" | "device" | "failed";

export async function syncBook(deps: SyncDeps, local: DailyBook, tries = 3): Promise<DailyBook | null> {
  let book = local;
  for (let n = 0; n < tries; n++) {
    const remote = await pullBook(deps);
    if (!remote) return null;
    book = mergeBooks(book, remote);
    if (sameBook(book, remote)) return book;
    if (!(await pushBook(deps, book))) continue;
    const check = await pullBook(deps);
    if (check && sameBook(mergeBooks(book, check), check)) return mergeBooks(book, check);
    if (check) book = mergeBooks(book, check);
  }
  return null;
}

export async function recordResult(result: DailyResult, storage: Storage | null, deps: SyncDeps | null): Promise<{ book: DailyBook; saved: SaveState }> {
  let book = mergeBooks(readLocal(storage), { [bookKey(result.game, result.day)]: result });
  writeLocal(storage, book);
  if (!deps || !(await deps.token())) return { book, saved: "device" };
  const synced = await syncBook(deps, book);
  if (!synced) return { book, saved: "failed" };
  book = synced;
  writeLocal(storage, book);
  return { book, saved: "account" };
}

export type LoadedBook = { book: DailyBook; source: "account" | "device" };

export async function loadBook(storage: Storage | null, deps: SyncDeps | null): Promise<LoadedBook> {
  const local = readLocal(storage);
  if (!deps || !(await deps.token())) return { book: local, source: "device" };
  const remote = await pullBook(deps);
  if (!remote) return { book: local, source: "device" };
  let book = mergeBooks(local, remote);
  if (!sameBook(book, remote)) book = (await syncBook(deps, book)) ?? book;
  writeLocal(storage, book);
  return { book, source: "account" };
}

export function shareText(title: string, r: DailyResult, url: string): string {
  const row = [...r.pattern].map((c) => (c === "1" ? "🟩" : "🟥")).join("");
  return `Polingual ${title} ${r.day}: ${r.score} of ${r.total}\n${row}\n${url}`;
}
