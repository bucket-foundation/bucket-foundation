import { appendFileSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import type { Keyring } from "./keyring";
import { providerFor } from "./llm";
import { readProviders, type ProviderEntry } from "./llm/config";
import type { Message, Provider, StreamEvent } from "./llm/types";
import type { Route } from "./serve";
import { agentsBody, waitDir, type WaitDeps } from "./wait";
import type { AgentsBody } from "./wait-fold";
import type { AgentsBodyV2, ChatRecord, ChatState, TurnEvent } from "./agents-types";

export type { AgentsBodyV2, ChatRecord, ChatRow, ChatState, CliRow, TurnEvent } from "./agents-types";

export const AGENT_CLIS = ["claude", "codex", "gemini", "opencode", "aider"] as const;
export type AgentCli = (typeof AGENT_CLIS)[number];
export const CHATS_FILE = "chats.jsonl";
export const FOLDERS_FILE = "agent-folders.json";
export const MAX_CHAT_MESSAGES = 200;
export const MAX_CHATS = 50;
export const SYSTEM = "You are the Bucket agent. Answer from the Bucket canon where you can, say when you are unsure, and keep answers short.";

export type ChatRunner = (provider: Provider, messages: Message[], signal: AbortSignal) => AsyncIterable<StreamEvent>;

export const plainChat: ChatRunner = (provider, messages, signal) => provider.chat(messages, [], { system: SYSTEM, signal });

const CHAT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const STATES = new Set<ChatState>(["running", "done", "cancelled", "error"]);

export function parseChat(line: string): ChatRecord | null {
  if (line.length > 2048) return null;
  try {
    const r = JSON.parse(line) as ChatRecord;
    if (r.v !== 1 || typeof r.id !== "string" || !CHAT_ID.test(r.id)) return null;
    if (typeof r.provider !== "string" || typeof r.model !== "string" || typeof r.started !== "number" || !STATES.has(r.state)) return null;
    if (r.folder !== undefined && typeof r.folder !== "string") return null;
    return r;
  } catch {
    return null;
  }
}

export function foldChats(text: string): ChatRecord[] {
  const byId = new Map<string, ChatRecord>();
  for (const raw of text.split("\n")) {
    const r = parseChat(raw.trim());
    if (!r) continue;
    byId.delete(r.id);
    byId.set(r.id, r);
  }
  return [...byId.values()].sort((a, b) => b.started - a.started).slice(0, MAX_CHATS);
}

export class ChatStore {
  constructor(readonly dir: string) {}

  get file(): string {
    return join(this.dir, CHATS_FILE);
  }

  write(r: ChatRecord): void {
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    appendFileSync(this.file, `${JSON.stringify(r)}\n`, { mode: 0o600 });
  }

  list(): ChatRecord[] {
    try {
      return foldChats(readFileSync(this.file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }
}

export function agentsBodyV2(body: AgentsBody, chats: ChatRecord[]): AgentsBodyV2 {
  return {
    ...body,
    sessions: body.sessions.map((r) => ({ ...r, v: 2, kind: "cli" })),
    chats: chats.map((c) => ({ ...c, kind: "chat" })),
  };
}

export function approvedFolders(dir: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(dir, FOLDERS_FILE), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const list = (raw as { v?: unknown; folders?: unknown }).folders;
  if ((raw as { v?: unknown }).v !== 1 || !Array.isArray(list)) throw new Error(`${FOLDERS_FILE} is not a v1 folder list`);
  return list.filter((f): f is string => typeof f === "string" && f.startsWith("/"));
}

export function inApproved(folder: string, approved: string[]): string | null {
  let real: string;
  try {
    real = realpathSync(folder);
  } catch {
    return null;
  }
  for (const a of approved) {
    let root: string;
    try {
      root = realpathSync(a);
    } catch {
      continue;
    }
    if (real === root || real.startsWith(root.endsWith("/") ? root : `${root}/`)) return real;
  }
  return null;
}

export function installedClis(which: (bin: string) => string | null): AgentCli[] {
  return AGENT_CLIS.filter((t) => which(t) !== null);
}

export interface AgentsDeps {
  wait: () => Pick<WaitDeps, "home" | "env" | "os">;
  llmHome: string;
  keyring: Keyring | null;
  which: (bin: string) => string | null;
  run?: ChatRunner;
  fetch?: typeof fetch;
  newId?: () => string;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });


function checkMessages(raw: unknown): Message[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CHAT_MESSAGES) return null;
  const out: Message[] = [];
  for (const m of raw) {
    const r = m as { role?: unknown; content?: unknown };
    if ((r.role !== "user" && r.role !== "assistant") || typeof r.content !== "string") return null;
    out.push({ role: r.role, content: r.content });
  }
  return out[out.length - 1].role === "user" ? out : null;
}

export interface TurnDeps {
  store: ChatStore;
  running: Map<string, AbortController>;
  run: ChatRunner;
  keyring: Keyring | null;
  fetch?: typeof fetch;
  newId: () => string;
  now: () => number;
}

export interface TurnInput {
  entry: ProviderEntry;
  model: string;
  messages: Message[];
  prior?: Pick<ChatRecord, "id" | "started" | "folder">;
  folder?: string;
}

export async function* chatTurn(d: TurnDeps, t: TurnInput, ctrl: AbortController): AsyncGenerator<TurnEvent> {
  const folder = t.folder ?? t.prior?.folder;
  const record: ChatRecord = { v: 1, id: t.prior?.id ?? d.newId(), provider: t.entry.name, model: t.model, started: t.prior?.started ?? Math.floor(d.now() / 1000), state: "running", ...(folder ? { folder } : {}) };
  d.store.write(record);
  d.running.set(record.id, ctrl);
  const provider = providerFor({ ...t.entry, model: t.model }, d.keyring, d.fetch);
  yield { type: "start", id: record.id, started: record.started, provider: t.entry.name, model: t.model, local: t.entry.local };
  let state: ChatState = "done";
  try {
    for await (const ev of d.run(provider, t.messages, ctrl.signal)) {
      if (ctrl.signal.aborted) break;
      if (ev.type === "text") yield { type: "text", text: ev.text };
      if (ev.type === "done") yield { type: "done", usage: ev.usage };
    }
    if (ctrl.signal.aborted) state = "cancelled";
  } catch (e) {
    state = ctrl.signal.aborted ? "cancelled" : "error";
    if (state === "error") yield { type: "error", message: (e as Error).message.slice(0, 600) };
  } finally {
    if (ctrl.signal.aborted) state = state === "error" ? state : "cancelled";
    d.running.delete(record.id);
    d.store.write({ ...record, state });
  }
  if (state === "cancelled") yield { type: "cancelled" };
}

export function agentRoutes(deps: AgentsDeps, now: () => number = Date.now): Record<string, Route> {
  const running = new Map<string, AbortController>();
  const store = () => new ChatStore(waitDir(deps.wait().env, deps.wait().home));
  const newId = deps.newId ?? (() => crypto.randomUUID().replace(/-/g, ""));
  const run = deps.run ?? plainChat;

  return {
    "GET /local/agents": async () => {
      const d = deps.wait();
      return json(agentsBodyV2(agentsBody(d, Math.floor(now() / 1000)), store().list()));
    },
    "GET /local/agents/tools": async () => json({ tools: installedClis(deps.which) }),
    "GET /local/agents/folders": async () => {
      const d = deps.wait();
      return json({ folders: approvedFolders(waitDir(d.env, d.home)) });
    },
    "GET /local/agents/providers": async () => json({ providers: readProviders(deps.llmHome).map(({ name, model, local }) => ({ name, model, local })) }),
    "POST /local/agents/chat/cancel": async (req) => {
      const b = (await req.json().catch(() => null)) as { id?: unknown } | null;
      if (!b || typeof b.id !== "string") return json({ error: "send the chat id" }, 400);
      const c = running.get(b.id);
      c?.abort();
      return json({ cancelled: c !== undefined });
    },
    "POST /local/agents/chat": async (req) => {
      const b = (await req.json().catch(() => null)) as { id?: unknown; provider?: unknown; model?: unknown; folder?: unknown; messages?: unknown } | null;
      if (!b || typeof b.provider !== "string") return json({ error: "send a provider" }, 400);
      const messages = checkMessages(b.messages);
      if (!messages) return json({ error: "send messages that end with a user message" }, 400);
      const entry = readProviders(deps.llmHome).find((p) => p.name === b.provider);
      if (!entry) return json({ error: `no provider named ${b.provider}; add one with bkt llm add` }, 400);
      const model = typeof b.model === "string" && b.model.length > 0 && b.model.length <= 128 ? b.model : entry.model;
      const d = deps.wait();
      let folder: string | undefined;
      if (b.folder !== undefined) {
        const real = typeof b.folder === "string" ? inApproved(b.folder, approvedFolders(waitDir(d.env, d.home))) : null;
        if (!real) return json({ error: "that folder is not on the approved list" }, 403);
        folder = real;
      }
      const prior = typeof b.id === "string" && CHAT_ID.test(b.id) ? store().list().find((c) => c.id === b.id) : undefined;
      if (typeof b.id === "string" && !prior) return json({ error: "no chat with that id" }, 404);
      if (prior && running.has(prior.id)) return json({ error: "that chat is still answering" }, 409);
      const ctrl = new AbortController();
      req.signal?.addEventListener("abort", () => ctrl.abort());
      const turn = chatTurn({ store: store(), running, run, keyring: deps.keyring, fetch: deps.fetch, newId, now }, { entry, model, messages, prior, folder }, ctrl);
      const enc = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(out) {
          for await (const ev of turn) out.enqueue(enc.encode(`${JSON.stringify(ev)}\n`));
          out.close();
        },
        cancel() {
          ctrl.abort();
        },
      });
      return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
    },
  };
}
