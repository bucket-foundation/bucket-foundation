import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useRef, useState } from "react";
import type { AgentsBodyV2, TurnEvent, TurnInput } from "../agents";
import type { ProviderEntry } from "../llm/config";
import type { Message } from "../llm/types";

export const AGENTS_POLL_MS = 3000;

const TOOL_LABEL: Record<string, string> = { claude: "Claude", codex: "Codex", gemini: "Gemini", opencode: "OpenCode", aider: "Aider" };
const STATE_LABEL: Record<string, string> = { running: "running", waiting: "waiting on you", done: "done", cancelled: "cancelled", error: "error" };

export function ago(fromS: number, nowMs: number): string {
  const s = Math.max(0, Math.floor(nowMs / 1000) - fromS);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export interface AgentsAppProps {
  load: () => AgentsBodyV2;
  providers: ProviderEntry[];
  turn: (input: TurnInput, ctrl: AbortController) => AsyncIterable<TurnEvent>;
  now?: () => number;
  pollMs?: number;
}

export function AgentsApp({ load, providers, turn, now = Date.now, pollMs = AGENTS_POLL_MS }: AgentsAppProps) {
  const { exit } = useApp();
  const [body, setBody] = useState<AgentsBodyV2 | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [chatting, setChatting] = useState(false);
  const [pick, setPick] = useState(0);
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState<Message[]>([]);
  const [prior, setPrior] = useState<{ id: string; started: number } | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        setBody(load());
        setTrouble(null);
      } catch (e) {
        setTrouble((e as Error).message);
      }
    };
    read();
    const t = setInterval(read, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  const send = async (text: string) => {
    const entry = providers[pick];
    if (!entry) return;
    const messages: Message[] = [...log, { role: "user", content: text }];
    setLog([...messages, { role: "assistant", content: "" }]);
    const c = new AbortController();
    ctrl.current = c;
    setStatus("answering");
    let answer = "";
    for await (const ev of turn({ entry, model: entry.model, messages, prior }, c)) {
      if (ev.type === "start") setPrior({ id: ev.id, started: ev.started });
      if (ev.type === "text") {
        answer += ev.text;
        setLog([...messages, { role: "assistant", content: answer }]);
      }
      if (ev.type === "error") setStatus(`error: ${ev.message}`);
      if (ev.type === "cancelled") setStatus("cancelled");
      if (ev.type === "done") setStatus(null);
    }
    ctrl.current = null;
  };

  useInput((input, key) => {
    if (!chatting) {
      if (input === "q" || key.escape) exit();
      if (input === "c" && providers.length > 0) setChatting(true);
      return;
    }
    if (key.escape) {
      if (ctrl.current) ctrl.current.abort();
      else setChatting(false);
      return;
    }
    if (ctrl.current) return;
    if (key.tab) {
      setPick((p) => (p + 1) % providers.length);
      setLog([]);
      setPrior(undefined);
      return;
    }
    if (key.return) {
      const text = draft.trim();
      setDraft("");
      if (text) void send(text);
      return;
    }
    if (key.backspace || key.delete) {
      setDraft((d) => d.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) setDraft((d) => d + input);
  });

  if (chatting) {
    const entry = providers[pick];
    return (
      <Box flexDirection="column">
        <Text bold>Bucket agent</Text>
        <Text dimColor>
          {entry.name} {entry.model} {entry.local ? "on this computer" : "hosted, your messages leave this computer"}
        </Text>
        {log.map((m, i) => (
          <Text key={i}>
            {m.role === "user" ? "you: " : "bucket: "}
            {m.content}
          </Text>
        ))}
        {status && <Text dimColor>{status}</Text>}
        <Text>&gt; {draft}</Text>
        <Text dimColor>Enter sends. Tab changes the provider. Esc stops the answer or leaves the chat.</Text>
      </Box>
    );
  }

  const sessions = body?.sessions ?? [];
  const chats = body?.chats ?? [];
  return (
    <Box flexDirection="column">
      <Text bold>Agents</Text>
      {trouble && <Text color="red">{trouble}</Text>}
      {sessions.length === 0 && <Text dimColor>No coding agent is running.</Text>}
      {sessions.map((r) => (
        <Text key={`${r.tool}:${r.session}`}>
          {(r.project || r.session.slice(0, 8)).padEnd(24)} {(TOOL_LABEL[r.tool] ?? r.tool).padEnd(9)} {STATE_LABEL[r.state].padEnd(15)} {ago(r.since, now())}
          {r.subagents > 0 ? ` ${r.subagents} ${r.subagents === 1 ? "subagent" : "subagents"}` : ""}
        </Text>
      ))}
      <Text bold>Bucket agent chats</Text>
      {chats.length === 0 && <Text dimColor>No chats yet.</Text>}
      {chats.map((c) => (
        <Text key={c.id}>
          {`${c.provider} ${c.model}`.padEnd(34)} {(STATE_LABEL[c.state] ?? c.state).padEnd(15)} {ago(c.started, now())}
        </Text>
      ))}
      <Text dimColor>{providers.length > 0 ? "c opens a Bucket agent chat. q quits." : "Add a model with bkt llm add or bkt llm local to chat. q quits."}</Text>
    </Box>
  );
}
