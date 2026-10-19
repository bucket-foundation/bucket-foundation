import { redact } from "./redact";
import { sseData } from "./sse";
import { LlmError, type ChatOptions, type Fetch, type Message, type Provider, type StreamEvent, type Tool, type ToolCall } from "./types";

export interface OpenAiConfig {
  name: string;
  baseUrl: string;
  model: string;
  local: boolean;
  key: () => Promise<string | null>;
  fetch?: Fetch;
}

interface Delta {
  content?: string | null;
  reasoning?: string | null;
  tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
}

interface Chunk {
  choices?: { delta?: Delta; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  error?: { message?: string };
}

export function openAiMessages(messages: Message[], system?: string): unknown[] {
  const out: unknown[] = system ? [{ role: "system", content: system }] : [];
  for (const m of messages) {
    if (m.role === "tool") out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    else if (m.role === "assistant" && m.toolCalls?.length)
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.input) } })),
      });
    else out.push({ role: m.role, content: m.content });
  }
  return out;
}

export function openAiTools(tools: Tool[]): unknown[] {
  return tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.schema } }));
}

export function parseArgs(raw: string): unknown {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new LlmError(`the model sent tool arguments that are not JSON: ${raw.slice(0, 80)}`);
  }
}

export class OpenAiProvider implements Provider {
  readonly kind = "openai" as const;
  constructor(private cfg: OpenAiConfig) {}

  get name() {
    return this.cfg.name;
  }

  get local() {
    return this.cfg.local;
  }

  async *chat(messages: Message[], tools: Tool[], opts: ChatOptions = {}): AsyncGenerator<StreamEvent> {
    const key = await this.cfg.key();
    const headers: Record<string, string> = { "content-type": "application/json", accept: "text/event-stream" };
    if (key) headers.authorization = `Bearer ${key}`;
    const body: Record<string, unknown> = {
      model: opts.model ?? this.cfg.model,
      messages: openAiMessages(messages, opts.system),
      stream: true,
      stream_options: { include_usage: true },
    };
    if (tools.length) body.tools = openAiTools(tools);
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    const secrets = key ? [key] : [];
    let res: Response;
    try {
      res = await (this.cfg.fetch ?? fetch)(`${this.cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (e) {
      if (opts.signal?.aborted) return;
      throw new LlmError(`${this.cfg.name}: ${redact(String((e as Error).message ?? e), secrets)}`);
    }
    if (!res.ok || !res.body) throw new LlmError(`${this.cfg.name} answered ${res.status}: ${redact(await res.text(), secrets)}`, res.status);
    const calls = new Map<number, { id: string; name: string; args: string }>();
    let stop = "stop";
    const usage = { input: 0, output: 0 };
    for await (const data of sseData(res.body, opts.signal)) {
      if (opts.signal?.aborted) return;
      if (data === "[DONE]") break;
      let chunk: Chunk;
      try {
        chunk = JSON.parse(data) as Chunk;
      } catch {
        throw new LlmError(`${this.cfg.name} sent a stream line that is not JSON`);
      }
      if (chunk.error) throw new LlmError(`${this.cfg.name}: ${redact(chunk.error.message ?? "stream error", secrets)}`);
      if (chunk.usage) {
        usage.input = chunk.usage.prompt_tokens ?? usage.input;
        usage.output = chunk.usage.completion_tokens ?? usage.output;
      }
      for (const choice of chunk.choices ?? []) {
        const d = choice.delta ?? {};
        if (opts.signal?.aborted) return;
        if (d.content) yield { type: "text", text: d.content };
        for (const tc of d.tool_calls ?? []) {
          const cur = calls.get(tc.index) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name += tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          calls.set(tc.index, cur);
        }
        if (choice.finish_reason) stop = choice.finish_reason;
      }
    }
    if (opts.signal?.aborted) return;
    for (const [i, c] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
      const call: ToolCall = { id: c.id || `call_${i}`, name: c.name, input: parseArgs(c.args) };
      yield { type: "tool_call", call };
    }
    yield { type: "done", stop: calls.size && stop === "stop" ? "tool_calls" : stop, usage };
  }
}
