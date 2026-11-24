import type { LobbyMessage } from "@academy/lobbies";

export const CHAT_REPORT_REASONS = [
  { id: "offensive_name", label: "Offensive name" },
  { id: "harassment", label: "Harassment" },
  { id: "spam", label: "Spam" },
  { id: "other", label: "Something else" },
] as const;
export type ChatReportReason = (typeof CHAT_REPORT_REASONS)[number]["id"];

export interface ChatBlock {
  userId: string;
  name: string;
  at: string;
}

export const BLOCK_CACHE_KEY = "polingual-web/chat-blocks/v1";

export function canModerate(message: Pick<LobbyMessage, "from">, myId: string | null | undefined, bots: readonly string[] = []): boolean {
  return !!myId && message.from !== myId && !bots.includes(message.from);
}

export function blockCacheKey(userId: string): string {
  return `${BLOCK_CACHE_KEY}:${userId}`;
}

export function readBlockCache(userId: string): ChatBlock[] | null {
  try {
    const raw = globalThis.localStorage?.getItem(blockCacheKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((b): b is ChatBlock => typeof b?.userId === "string") : null;
  } catch {
    return null;
  }
}

export function writeBlockCache(userId: string, blocks: readonly ChatBlock[]): void {
  try {
    globalThis.localStorage?.setItem(blockCacheKey(userId), JSON.stringify(blocks));
  } catch {
    return;
  }
}

export function visibleMessages<M extends Pick<LobbyMessage, "from">>(messages: readonly M[], blocked: readonly ChatBlock[] | null): M[] {
  if (!blocked) return [];
  const ids = new Set(blocked.map((b) => b.userId));
  return messages.filter((m) => !ids.has(m.from));
}
