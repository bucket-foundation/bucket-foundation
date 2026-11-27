export interface SavedFamily {
  id: string;
  name: string;
  code: string;
}

export interface Quest {
  quest: { goal: number; done: number; weekStart: string };
  board: { name: string; xp: number; me: boolean }[];
  group: { id: string; name: string; kind: string };
}

const KEY = "polingual-web/family/v1";
type Store = Pick<Storage, "getItem" | "setItem">;
type Fetch = typeof fetch;

export function familyHref(code: string, origin = ""): string {
  return `${origin}/play/family/${encodeURIComponent(code)}`;
}

export function readFamily(store: Store | null): SavedFamily | null {
  try {
    const f = JSON.parse(store?.getItem(KEY) ?? "null") as SavedFamily | null;
    return f && typeof f.id === "string" && typeof f.code === "string" && typeof f.name === "string" ? f : null;
  } catch {
    return null;
  }
}

export function rememberFamily(store: Store | null, f: SavedFamily): void {
  try {
    store?.setItem(KEY, JSON.stringify(f));
  } catch {
    return;
  }
}

export function familyName(nickname: string): string {
  return `${nickname.split(" ")[0] || "Our"} family`.slice(0, 40);
}

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

type GroupBody = { group?: { id?: string; name?: string; code?: string } };

function saved(body: GroupBody): SavedFamily | null {
  const g = body.group;
  return g?.id && g.name && g.code ? { id: g.id, name: g.name, code: g.code } : null;
}

export async function createFamily(f: Fetch, token: string, name: string, displayName: string): Promise<SavedFamily | null> {
  try {
    const r = await f("/api/academy/groups", { method: "POST", headers: headers(token), body: JSON.stringify({ name, kind: "family", displayName }) });
    return r.ok ? saved((await r.json()) as GroupBody) : null;
  } catch {
    return null;
  }
}

export async function joinFamily(f: Fetch, token: string, code: string, displayName: string): Promise<{ family: SavedFamily | null; error: string | null }> {
  try {
    const r = await f("/api/academy/groups/join", { method: "POST", headers: headers(token), body: JSON.stringify({ code, displayName }) });
    const body = (await r.json().catch(() => ({}))) as GroupBody & { error?: string };
    return r.ok ? { family: saved(body), error: null } : { family: null, error: body.error ?? "failed" };
  } catch {
    return { family: null, error: "offline" };
  }
}

export async function fetchQuest(f: Fetch, token: string, groupId: string): Promise<Quest | null> {
  try {
    const r = await f(`/api/academy/groups/quest?groupId=${encodeURIComponent(groupId)}`, { headers: headers(token), cache: "no-store" });
    return r.ok ? ((await r.json()) as Quest) : null;
  } catch {
    return null;
  }
}
