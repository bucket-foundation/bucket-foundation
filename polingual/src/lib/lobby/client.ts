import type { LobbyPrompt, LobbyState, LobbySummary } from "@academy/lobbies";

export type { LobbyPrompt, LobbyState, LobbySummary };
export type WebLobbyState = LobbyState;
export type AnswerResult = { correct: boolean; points: number; ms: number; lobby: WebLobbyState };

export const GUEST_KEY = "polingual-web/guest/v1";
export const NICK_MAX = 24;
export const POLL_MS = 1000;
const BASE = "/api/academy/lobbies";

export interface Guest {
  guestId: string;
  nickname: string;
  token?: string;
  userId?: string;
  expiresAt?: string;
}

export interface GuestStore {
  read(): Guest | null;
  write(g: Guest): void;
  clear(): void;
}

export function browserGuestStore(storage: () => Storage | null): GuestStore {
  return {
    read() {
      try {
        const raw = storage()?.getItem(GUEST_KEY);
        const g = raw ? (JSON.parse(raw) as Guest) : null;
        return g && typeof g.guestId === "string" && typeof g.nickname === "string" ? g : null;
      } catch {
        return null;
      }
    },
    write(g) {
      try {
        storage()?.setItem(GUEST_KEY, JSON.stringify(g));
      } catch {
      }
    },
    clear() {
      try {
        storage()?.removeItem(GUEST_KEY);
      } catch {
      }
    },
  };
}

export function newGuestId(random: () => Uint8Array = () => crypto.getRandomValues(new Uint8Array(16))): string {
  return Array.from(random(), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function cleanNickname(raw: string): string | null {
  const s = raw.replace(/\s+/g, " ").trim();
  return s.length >= 2 && s.length <= NICK_MAX ? s : null;
}

export function tokenFresh(g: Guest | null, now: number): boolean {
  if (!g?.token) return false;
  if (!g.expiresAt) return true;
  return Date.parse(g.expiresAt) - now > 60_000;
}

const ERRORS: Record<string, string> = {
  not_found: "No lobby with that code.",
  lobby_full: "That lobby is full.",
  lobby_started: "That game already started.",
  need_ready: "Two players need to be ready.",
  not_host: "Only the host can start.",
  already_answered: "You already answered this round.",
  wrong_round: "That round is over.",
  not_playing: "The game is not running.",
  bad_choice: "Pick one of the choices.",
  out_of_lives: "Out of lives. Watch the rest and go again.",
  no_words: "Those languages have no shared words yet. Pick another set.",
  bad_guest: "Pick a nickname of 2 to 24 characters.",
  hosted_limit: "You already host three lobbies.",
  rate_limited: "Slow down a moment and try again.",
  name_not_allowed: "Pick a different name.",
  text_not_allowed: "That message was blocked.",
  unauthorized: "Your session ended. Rejoin with your nickname.",
  bad_request: "Check the details and try again.",
  sync_unavailable: "Lobbies are offline right now. Try again soon.",
  offline: "No connection. Check your network.",
};

export function lobbyError(code: string | undefined): string {
  return ERRORS[code ?? ""] ?? "Something went wrong. Try again.";
}

export class LobbyError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

export interface LobbyApiDeps {
  fetch: typeof fetch;
  auth: () => Promise<string | null>;
}

export class LobbyApi {
  constructor(private readonly deps: LobbyApiDeps) {}

  private async call<T>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
    const q = init.query ? `?${new URLSearchParams(init.query)}` : "";
    const headers: Record<string, string> = { accept: "application/json" };
    const token = await this.deps.auth();
    if (token) headers.authorization = `Bearer ${token}`;
    if (init.body !== undefined) headers["content-type"] = "application/json";
    let res: Response;
    try {
      res = await this.deps.fetch(`${BASE}${path}${q}`, { method: init.method ?? (init.body === undefined ? "GET" : "POST"), headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), cache: "no-store" });
    } catch {
      throw new LobbyError("offline", 0);
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new LobbyError(typeof data.error === "string" ? data.error : "sync_unavailable", res.status);
    return data as T;
  }

  async list(): Promise<LobbySummary[]> {
    return (await this.listing()).lobbies;
  }

  async listing(): Promise<{ lobbies: LobbySummary[]; bots: boolean }> {
    const res = await this.call<{ lobbies: LobbySummary[]; bots?: boolean }>("", { query: { client: "web" } });
    return { lobbies: res.lobbies, bots: res.bots === true };
  }

  async fillBots(lobbyId: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/bots", { body: { lobbyId } })).lobby;
  }

  async create(input: { name: string; root: string; targets: string[]; rounds: number; roundSeconds: number; listed: boolean; displayName: string; game: string; fillBots?: boolean }): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("", { body: { ...input, reveal: true } })).lobby;
  }

  async join(input: { code?: string; lobbyId?: string; displayName: string }): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/join", { body: input })).lobby;
  }

  async leave(lobbyId: string): Promise<void> {
    await this.call("/leave", { body: { lobbyId } });
  }

  async ready(lobbyId: string, ready: boolean): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/ready", { body: { lobbyId, ready } })).lobby;
  }

  async start(lobbyId: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/start", { body: { lobbyId } })).lobby;
  }

  async chat(lobbyId: string, body: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/chat", { body: { lobbyId, body } })).lobby;
  }

  async answer(lobbyId: string, round: number, choice: string): Promise<AnswerResult> {
    return this.call<AnswerResult>("/answer", { body: { lobbyId, round, choice } });
  }

  async state(lobbyId: string, since?: number): Promise<{ changed: boolean; lobby?: WebLobbyState; now?: string }> {
    const query: Record<string, string> = { lobbyId };
    if (since !== undefined) query.since = String(since);
    return this.call("/state", { query });
  }

  async guest(guestId: string, nickname: string): Promise<{ token: string; userId: string; expiresAt?: string }> {
    return this.call("/guest", { body: { guestId, nickname } });
  }

  async merge(guestToken: string): Promise<void> {
    await this.call("/guest/merge", { body: { guestToken } });
  }
}

export type Phase =
  | { kind: "waiting" }
  | { kind: "countdown"; seconds: number }
  | { kind: "round"; index: number; remaining: number }
  | { kind: "reveal"; index: number; remaining: number }
  | { kind: "finished" };

type Clock = Pick<LobbyState, "startedAt" | "rounds" | "roundSeconds"> & { revealSeconds?: number };

export function gameSeconds(lobby: Omit<Clock, "startedAt">): number {
  return lobby.rounds * lobby.roundSeconds + Math.max(0, lobby.rounds - 1) * (lobby.revealSeconds ?? 0);
}

export function phaseAt(lobby: Clock & Pick<LobbyState, "status">, now: number): Phase {
  if (lobby.status === "lobby") return { kind: "waiting" };
  if (lobby.status === "done" || !lobby.startedAt) return lobby.status === "done" ? { kind: "finished" } : { kind: "waiting" };
  const elapsed = (now - Date.parse(lobby.startedAt)) / 1000;
  if (elapsed < 0) return { kind: "countdown", seconds: -elapsed };
  if (elapsed >= gameSeconds(lobby)) return { kind: "finished" };
  const slot = lobby.roundSeconds + (lobby.revealSeconds ?? 0);
  const index = Math.floor(elapsed / slot);
  const into = elapsed - index * slot;
  if (into < lobby.roundSeconds) return { kind: "round", index, remaining: lobby.roundSeconds - into };
  return { kind: "reveal", index, remaining: slot - into };
}

export const TALLY_WAIT_MS = 5000;

export function tallyLate(lobby: Clock, now: number): boolean {
  if (!lobby.startedAt) return false;
  return now - (Date.parse(lobby.startedAt) + gameSeconds(lobby) * 1000) > TALLY_WAIT_MS;
}

export function serverOffset(serverNow: string, sentAt: number, receivedAt: number): number {
  return Date.parse(serverNow) - (sentAt + receivedAt) / 2;
}

export function joinHref(code: string): string {
  return `/play/${code}`;
}

export function shareUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}${joinHref(code)}`;
}

export interface Identity {
  token: string;
  kind: "account" | "guest";
}

export interface IdentityDeps {
  api: Pick<LobbyApi, "guest" | "merge">;
  store: GuestStore;
  account: () => Promise<string | null>;
  now: () => number;
}

export async function resolveIdentity(deps: IdentityDeps, nickname?: string): Promise<Identity | null> {
  const account = await deps.account();
  const saved = deps.store.read();
  if (account) {
    if (saved) {
      try {
        const token = tokenFresh(saved, deps.now()) ? (saved.token as string) : (await deps.api.guest(saved.guestId, saved.nickname)).token;
        await deps.api.merge(token);
        deps.store.clear();
      } catch {
      }
    }
    return { token: account, kind: "account" };
  }
  const name = nickname ? cleanNickname(nickname) : saved?.nickname ?? null;
  if (!name) return null;
  if (saved && saved.nickname === name && tokenFresh(saved, deps.now())) return { token: saved.token as string, kind: "guest" };
  const guestId = saved?.guestId ?? newGuestId();
  const got = await deps.api.guest(guestId, name);
  deps.store.write({ guestId, nickname: name, token: got.token, userId: got.userId, expiresAt: got.expiresAt });
  return { token: got.token, kind: "guest" };
}

export function memoryGuestStore(initial: Guest | null = null): GuestStore & { value: Guest | null } {
  const box = { value: initial } as GuestStore & { value: Guest | null };
  box.read = () => box.value;
  box.write = (g) => {
    box.value = g;
  };
  box.clear = () => {
    box.value = null;
  };
  return box;
}

export function nicknameOf(store: GuestStore): string | null {
  return store.read()?.nickname ?? null;
}

export function flagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...Array.from(code, (c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const LANG_FLAGS: Record<string, string> = {
  en: "GB", es: "ES", fr: "FR", it: "IT", pt: "PT", de: "DE", nl: "NL", sv: "SE", da: "DK", no: "NO", nb: "NO", fi: "FI", pl: "PL", cs: "CZ",
  ru: "RU", uk: "UA", el: "GR", tr: "TR", ar: "SA", he: "IL", fa: "IR", hi: "IN", bn: "BD", ur: "PK", ja: "JP", zh: "CN", ko: "KR",
  vi: "VN", th: "TH", id: "ID", ms: "MY", tl: "PH", sw: "KE", ro: "RO", hu: "HU", ca: "AD", la: "VA", ga: "IE", cy: "GB", eu: "ES",
};

export function langFlag(lang: string | null | undefined): string | null {
  return lang ? LANG_FLAGS[lang.split("-")[0]] ?? null : null;
}

export function streakOf(lobby: Pick<LobbyState, "results" | "players">): number {
  const me = lobby.players.find((p) => p.isMe)?.userId;
  if (!me) return 0;
  const mine = lobby.results.filter((r) => r.userId === me).sort((a, b) => b.round - a.round);
  let n = 0;
  let expect = mine[0]?.round;
  for (const r of mine) {
    if (r.round !== expect || !r.correct) break;
    n++;
    expect = r.round - 1;
  }
  return n;
}

export function livesLeft(lobby: Pick<LobbyState, "results" | "players">, round: number, lives = 3): number {
  const me = lobby.players.find((p) => p.isMe)?.userId;
  const mine = lobby.results.filter((r) => r.userId === me && r.round < round).sort((a, b) => a.round - b.round);
  if (!mine.length) return lives;
  const by = new Map(mine.map((r) => [r.round, r.correct]));
  let left = lives;
  for (let r = mine[0].round; r < round; r++) if (by.get(r) !== true) left--;
  return Math.max(0, left);
}

export const LEARN_HREF = "/app?from=play";

export function botLabel(p: { bot: boolean; skill: string | null }): string | null {
  return p.bot ? (p.skill ? `bot · ${p.skill}` : "bot") : null;
}

export function myScore(lobby: Pick<LobbyState, "players">): number {
  return lobby.players.find((p) => p.isMe)?.score ?? 0;
}

export function standings(lobby: Pick<LobbyState, "players">): LobbyState["players"] {
  return [...lobby.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function missedWords(lobby: Pick<LobbyState, "prompts" | "results" | "players">): string[] {
  const me = lobby.players.find((p) => p.isMe)?.userId;
  if (!me) return [];
  const right = new Set(lobby.results.filter((r) => r.userId === me && r.correct).map((r) => r.round));
  return lobby.prompts.filter((p) => !right.has(p.round) && p.answer).map((p) => p.answer as string);
}

export function promptFor(lobby: Pick<LobbyState, "prompts">, round: number): LobbyState["prompts"][number] | null {
  return lobby.prompts.find((p) => p.round === round) ?? null;
}

export function answeredRound(lobby: Pick<LobbyState, "results" | "players">, round: number): boolean {
  const me = lobby.players.find((p) => p.isMe)?.userId;
  return !!me && lobby.results.some((r) => r.userId === me && r.round === round);
}

export type RankedPlayer = LobbyState["players"][number] & { rank: number };

export function ranked(players: LobbyState["players"]): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return sorted.map((p, i) => ({ ...p, rank: i > 0 && sorted[i - 1].score === p.score ? sorted.findIndex((q) => q.score === p.score) + 1 : i + 1 }));
}

export function gameProgress(phase: Phase, rounds: number): number {
  if (phase.kind === "finished") return 1;
  if (phase.kind === "round") return Math.min(1, phase.index / rounds);
  if (phase.kind === "reveal") return Math.min(1, (phase.index + 1) / rounds);
  return 0;
}

export function revealOrder<T extends { correct: boolean }>(entries: readonly T[]): T[] {
  return [...entries.filter((e) => e.correct), ...entries.filter((e) => !e.correct)];
}
