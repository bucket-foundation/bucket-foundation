import type { LobbyState, LobbySummary } from "@academy/lobbies";

export type { LobbyState, LobbySummary };
export type WebLobbyState = LobbyState & { game?: string };

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
    return (await this.call<{ lobbies: LobbySummary[] }>("")).lobbies;
  }

  async create(input: { name: string; root: string; targets: string[]; rounds: number; roundSeconds: number; listed: boolean; displayName: string; game: string }): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("", { body: input })).lobby;
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

  async answer(lobbyId: string, round: number, choice: string, correct: boolean): Promise<WebLobbyState> {
    return (await this.call<{ lobby: WebLobbyState }>("/answer", { body: { lobbyId, round, choice, correct } })).lobby;
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

export type Phase = { kind: "waiting" } | { kind: "countdown"; seconds: number } | { kind: "round"; index: number; remaining: number } | { kind: "finished" };

export function phaseAt(lobby: Pick<LobbyState, "status" | "startedAt" | "rounds" | "roundSeconds">, now: number): Phase {
  if (lobby.status === "lobby") return { kind: "waiting" };
  if (lobby.status === "done" || !lobby.startedAt) return lobby.status === "done" ? { kind: "finished" } : { kind: "waiting" };
  const elapsed = (now - Date.parse(lobby.startedAt)) / 1000;
  if (elapsed < 0) return { kind: "countdown", seconds: -elapsed };
  const index = Math.floor(elapsed / lobby.roundSeconds);
  if (index >= lobby.rounds) return { kind: "finished" };
  return { kind: "round", index, remaining: lobby.roundSeconds * (index + 1) - elapsed };
}

export function serverOffset(serverNow: string, sentAt: number, receivedAt: number): number {
  return Date.parse(serverNow) - (sentAt + receivedAt) / 2;
}

export function joinHref(code: string): string {
  return `/join/${code}`;
}

export function shareUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}${joinHref(code)}`;
}
