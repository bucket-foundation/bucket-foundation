import { AGENT_TOOLS, EVENT_KINDS, type AgentTool } from "./wait-events";

export type { AgentTool };
export type AgentState = "running" | "waiting" | "done";

export interface AgentEvent {
  v: 1;
  ts: number;
  tool: AgentTool;
  session: string;
  event: string;
  project: string;
}

export interface AgentRow {
  tool: AgentTool;
  session: string;
  project: string;
  state: AgentState;
  since: number;
  subagents: number;
}

export interface AgentsBody {
  v: 1;
  installed: boolean;
  supported: boolean;
  sessions: AgentRow[];
}

export const IDLE_DROP_S = 30 * 60;
export const DONE_KEEP_S = 10 * 60;
export const MAX_ROWS = 20;

const LINE = new RegExp(`^\\{"v":1,"ts":\\d{1,12},"tool":"(${AGENT_TOOLS.join("|")})","session":"[A-Za-z0-9_-]{1,64}","event":"[A-Za-z-]{1,32}","project":"[A-Za-z0-9._ -]{0,48}"\\}$`);

export function parseEvent(line: string): AgentEvent | null {
  if (line.length > 512 || !LINE.test(line)) return null;
  try {
    const e = JSON.parse(line) as AgentEvent;
    return Object.hasOwn(EVENT_KINDS, e.event) ? e : null;
  } catch {
    return null;
  }
}

export function stateOf(event: string): AgentState | null {
  if (!Object.hasOwn(EVENT_KINDS, event)) return null;
  const kind = EVENT_KINDS[event];
  return kind === "stop" ? "done" : kind === "waiting" ? "waiting" : "running";
}

export function foldAgents(text: string, nowS: number): AgentRow[] {
  const rows = new Map<string, AgentRow & { last: number }>();
  for (const raw of text.split("\n")) {
    const e = parseEvent(raw.trim());
    if (!e) continue;
    const key = `${e.tool}:${e.session}`;
    const state = stateOf(e.event)!;
    const prev = rows.get(key);
    if (state === "waiting" && prev?.state === "done") continue;
    const row = prev ?? { tool: e.tool, session: e.session, project: e.project, state, since: e.ts, subagents: 0, last: e.ts };
    const kind = EVENT_KINDS[e.event];
    if (kind === "prompt") row.subagents = 0;
    if (kind === "subagent") row.subagents += 1;
    if (kind === "subagent-stop") row.subagents = Math.max(0, row.subagents - 1);
    if (prev && prev.state !== state) row.since = e.ts;
    if (kind === "prompt" && prev && prev.state === "done") row.since = e.ts;
    if (state === "done") row.subagents = 0;
    row.state = state;
    row.project = e.project || row.project;
    row.last = Math.max(row.last, e.ts);
    rows.set(key, row);
  }
  return [...rows.values()]
    .filter((r) => nowS - r.last < IDLE_DROP_S && !(r.state === "done" && nowS - r.since >= DONE_KEEP_S))
    .sort((a, b) => b.last - a.last)
    .slice(0, MAX_ROWS)
    .map(({ last: _last, ...r }) => r);
}
