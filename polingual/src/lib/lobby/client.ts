import type { ChatBlock, ChatReportReason } from "./moderation";
import type { LobbyPrompt, LobbyState, LobbySummary } from "@academy/lobbies";

export type { LobbyPrompt, LobbyState, LobbySummary };
export type WebLobbyState = LobbyState;
export { flagEmoji, langFlag, streakOf, livesLeft, LEARN_HREF, botLabel, myScore, standings, missedWords, promptFor, answeredRound, ranked, gameProgress, revealOrder } from "./standing";
export { type Phase, gameSeconds, phaseAt, TALLY_WAIT_MS, tallyLate, serverOffset } from "./phase";
type AnswerResult = { correct: boolean; points: number; ms: number; lobby: WebLobbyState };

const GUEST_KEY = "polingual-web/guest/v1";
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

interface GuestStore {
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
  audience_age: "Players under 13 take a seat in the game. Ask the host to free one.",
  audience_signin: "Sign in to watch, or ask the host to let guests watch.",
  seat_open: "A seat is open. Join the game instead.",
  lobby_started: "That game already started.",
  setup_off: "Game sets and random mix are off right now. Pick one game.",
  need_ready: "Everyone needs to be ready.",
  not_host: "Only the host can start.",
  already_answered: "You already answered this round.",
  already_continued: "You already used your continue this game.",
  has_lives: "You still have lives left.",
  no_coins: "Not enough coins for that power-up.",
  power_used: "You already have a power-up for the next round.",
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
  update_app: "This game needs the newest app. Open it on polingual.com.",
};

export function lobbyError(code: string | undefined): string {
  return ERRORS[code ?? ""] ?? "Something went wrong. Try again.";
}

export class LobbyError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

interface LobbyApiDeps {
  fetch: typeof fetch;
  auth: () => Promise<string | null>;
}

export class LobbyApi {
  constructor(private readonly deps: LobbyApiDeps) {}

  private async call<T>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
    const q = init.query ? `?${new URLSearchParams(init.query)}` : "";
    const headers: Record<string, string> = { accept: "application/json", "x-polingual-client": "web" };
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

  async listing(): Promise<{ lobbies: LobbySummary[]; bots: boolean; games: string[] | null }> {
    const res = await this.call<{ lobbies: LobbySummary[]; bots?: boolean; games?: string[] }>("", { query: { client: "web" } });
    return { lobbies: res.lobbies, bots: res.bots === true, games: Array.isArray(res.games) ? res.games : null };
  }

  async fillBots(lobbyId: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/bots", { body: { lobbyId } })).lobby;
  }

  async power(lobbyId: string, kind: "double" | "fifty"): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/power", { body: { lobbyId, kind } })).lobby;
  }

  async continueRun(lobbyId: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/continue", { body: { lobbyId } })).lobby;
  }

  async create(input: { name: string; root: string; targets: string[]; rounds: number; roundSeconds: number; listed: boolean; displayName: string; game: string; fillBots?: boolean; setup?: string; games?: string[]; hostScreen?: boolean }): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("", { body: { ...input, reveal: true } })).lobby;
  }

  roomRealtime = async (lobbyId: string) => (await this.call<{ realtime: { url: string; key: string; topic: string } }>("/react", { query: { lobbyId } })).realtime;
  signal = async (lobbyId: string, body: { emoji: string } | { round: number; choice: string }) => void (await this.call("/react", { body: { lobbyId, ...body } }));

  async join(input: { code?: string; lobbyId?: string; displayName: string; screen?: boolean; audience?: boolean; ageBand?: string }): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/join", { body: input })).lobby;
  }

  async leave(lobbyId: string): Promise<void> {
    await this.call("/leave", { body: { lobbyId } });
  }

  async ready(lobbyId: string, ready: boolean): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/ready", { body: { lobbyId, ready } })).lobby;
  }

  async settings(lobbyId: string, input: { setup?: string; game?: string; games?: string[]; targets?: string[]; guestsWatch?: boolean }): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/settings", { body: { lobbyId, ...input } })).lobby;
  }

  async hostMode(lobbyId: string, screen: boolean, displayName?: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/hostmode", { body: { lobbyId, screen, ...(displayName ? { displayName } : {}) } })).lobby;
  }

  async end(lobbyId: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/end", { body: { lobbyId } })).lobby;
  }

  async next(lobbyId: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/next", { body: { lobbyId } })).lobby;
  }

  async start(lobbyId: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/start", { body: { lobbyId } })).lobby;
  }

  async chat(lobbyId: string, body: string): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/chat", { body: { lobbyId, body } })).lobby;
  }

  async report(lobbyId: string, messageId: number, reason: ChatReportReason): Promise<void> {
    await this.call("/report", { body: { lobbyId, messageId, reason } });
  }

  async blocks(): Promise<ChatBlock[]> {
    return (await this.call<{ blocks: ChatBlock[] }>("/blocks")).blocks;
  }

  async block(userId: string, name: string, blocked: boolean): Promise<ChatBlock[]> {
    return (await this.call<{ blocks: ChatBlock[] }>("/blocks", { body: { userId, name, blocked } })).blocks;
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

function joinHref(code: string): string {
  return `/play/${code}`;
}

export function shareUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}${joinHref(code)}`;
}

export interface Identity {
  token: string;
  kind: "account" | "guest";
}

interface IdentityDeps {
  api: Pick<LobbyApi, "guest" | "merge">;
  store: GuestStore;
  account: () => Promise<string | null>;
  now: () => number;
}

export function guestMerged(e: unknown): boolean {
  return e instanceof LobbyError && e.status === 409 && e.code === "guest_merged";
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
      } catch (e) {
        if (guestMerged(e)) deps.store.clear();
      }
    }
    return { token: account, kind: "account" };
  }
  const name = nickname ? cleanNickname(nickname) : saved?.nickname ?? null;
  if (!name) return null;
  if (saved && saved.nickname === name && tokenFresh(saved, deps.now())) return { token: saved.token as string, kind: "guest" };
  let guestId = saved?.guestId ?? newGuestId();
  let got: Awaited<ReturnType<IdentityDeps["api"]["guest"]>>;
  try {
    got = await deps.api.guest(guestId, name);
  } catch (e) {
    if (!guestMerged(e)) throw e;
    deps.store.clear();
    guestId = newGuestId();
    got = await deps.api.guest(guestId, name);
  }
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
