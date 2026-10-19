import type { AgentRow, AgentsBody } from "./wait-fold";

export type ChatState = "running" | "done" | "cancelled" | "error";

export interface ChatRecord {
  v: 1;
  id: string;
  provider: string;
  model: string;
  started: number;
  state: ChatState;
  folder?: string;
}

export type CliRow = AgentRow & { v: 2; kind: "cli" };
export type ChatRow = ChatRecord & { kind: "chat" };

export interface AgentsBodyV2 extends Omit<AgentsBody, "sessions"> {
  sessions: CliRow[];
  chats: ChatRow[];
}

export type TurnEvent =
  | { type: "start"; id: string; started: number; provider: string; model: string; local: boolean }
  | { type: "text"; text: string }
  | { type: "done"; usage: { input: number; output: number } }
  | { type: "error"; message: string }
  | { type: "cancelled" };

