export const AGENT_TOOLS = ["claude", "codex", "gemini", "opencode", "aider"] as const;
export type AgentTool = (typeof AGENT_TOOLS)[number];

export type EventKind = "prompt" | "subagent" | "subagent-stop" | "stop" | "waiting";

export const EVENT_KINDS: Record<string, EventKind> = {
  UserPromptSubmit: "prompt",
  PreToolUse: "subagent",
  SubagentStop: "subagent-stop",
  Stop: "stop",
  SessionEnd: "stop",
  Notification: "waiting",
  "agent-turn-complete": "stop",
  "approval-requested": "waiting",
  BeforeAgent: "prompt",
  BeforeTool: "subagent",
  AfterTool: "subagent-stop",
  AfterAgent: "stop",
};

export const NOTIFY_TYPES = ["permission_prompt", "ToolPermission"];

export type HookSpec = { event: string; matchers: (string | null)[] };

export const CLAUDE_HOOKS: HookSpec[] = [
  { event: "UserPromptSubmit", matchers: [null] },
  { event: "PreToolUse", matchers: ["Task"] },
  { event: "SubagentStop", matchers: [null] },
  { event: "Stop", matchers: [null] },
  { event: "SessionEnd", matchers: [null] },
  { event: "Notification", matchers: ["permission_prompt", "idle_prompt"] },
];

export const GEMINI_SUBAGENT_TOOL = "invoke_agent";

export const GEMINI_HOOKS: HookSpec[] = [
  { event: "BeforeAgent", matchers: [null] },
  { event: "BeforeTool", matchers: [GEMINI_SUBAGENT_TOOL] },
  { event: "AfterTool", matchers: [GEMINI_SUBAGENT_TOOL] },
  { event: "AfterAgent", matchers: [null] },
  { event: "SessionEnd", matchers: [null] },
  { event: "Notification", matchers: [null] },
];

export const NO_EVENT_SOURCE = ["OpenCode", "Aider", "Goose", "Crush", "Continue CLI", "Qwen Code"];

const names = (kinds: EventKind[]) => Object.keys(EVENT_KINDS).filter((e) => kinds.includes(EVENT_KINDS[e])).join("|");

export function shellTables(): Record<string, string> {
  return {
    "@@EVENTS@@": Object.keys(EVENT_KINDS).join("|"),
    "@@TOOLS@@": AGENT_TOOLS.join("|"),
    "@@STUDY@@": names(["prompt", "subagent"]),
    "@@DONE@@": names(["stop"]),
    "@@WAITING@@": names(["waiting"]),
    "@@NOTIFY_TYPES@@": NOTIFY_TYPES.map((t) => `Notification:${t}`).join("|"),
  };
}

export function fillTables(template: string): string {
  let out = template;
  for (const [k, v] of Object.entries(shellTables())) out = out.split(k).join(v);
  return out;
}
