export type Role = "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface Message {
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface Tool {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface Usage {
  input: number;
  output: number;
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "done"; stop: string; usage: Usage };

export interface ChatOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface Provider {
  readonly name: string;
  readonly kind: ProviderKind;
  readonly local: boolean;
  chat(messages: Message[], tools: Tool[], opts?: ChatOptions): AsyncIterable<StreamEvent>;
}

export type ProviderKind = "anthropic" | "openai";

export type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
