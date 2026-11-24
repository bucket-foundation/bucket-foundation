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

export function canModerate(message: Pick<LobbyMessage, "from">, myId: string | null | undefined): boolean {
  return !!myId && message.from !== myId;
}

export function visibleMessages<M extends Pick<LobbyMessage, "from">>(messages: readonly M[], blocked: readonly ChatBlock[]): M[] {
  const ids = new Set(blocked.map((b) => b.userId));
  return messages.filter((m) => !ids.has(m.from));
}
