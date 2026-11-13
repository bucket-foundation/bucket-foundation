export type DailyGame = "daily-set" | "mini" | "word-groups" | "speed-match" | "which-voice" | "letter-sprint";

export interface DailyResult {
  game: DailyGame;
  day: string;
  score: number;
  total: number;
  pattern: string;
  words: { lang: string; itemId: string; form: string; gloss: string; right: boolean }[];
}

export type DailyBook = Record<string, DailyResult>;

export const DAILY_BRANCH = "polingual-daily";
const LOCAL_KEY = "polingual/daily/v1";
const KEEP = 120;

export const bookKey = (game: DailyGame, day: string) => `${game}|${day}`;

export function mergeBooks(a: DailyBook, b: DailyBook): DailyBook {
  const all = { ...b, ...a };
  const keys = Object.keys(all).sort((x, y) => (all[y].day > all[x].day ? 1 : -1)).slice(0, KEEP);
  return Object.fromEntries(keys.map((k) => [k, all[k]]));
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

export async function recordResult(result: DailyResult, storage: Storage | null, deps: SyncDeps | null): Promise<DailyBook> {
  let book = mergeBooks({ [bookKey(result.game, result.day)]: result }, readLocal(storage));
  writeLocal(storage, book);
  if (deps) {
    const remote = await pullBook(deps);
    if (remote) {
      book = mergeBooks(book, remote);
      writeLocal(storage, book);
      await pushBook(deps, book);
    }
  }
  return book;
}

export function shareText(title: string, r: DailyResult, url: string): string {
  const row = [...r.pattern].map((c) => (c === "1" ? "🟩" : "🟥")).join("");
  return `Polingual ${title} ${r.day}: ${r.score} of ${r.total}\n${row}\n${url}`;
}
