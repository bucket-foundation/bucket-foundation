import Anthropic from "@anthropic-ai/sdk";
import { parseArgs } from "./openai";
import { redact } from "./redact";
import { LlmError, type ChatOptions, type Fetch, type Message, type Provider, type StreamEvent, type Tool } from "./types";

export const DEFAULT_MAX_TOKENS = 4096;

export interface AnthropicConfig {
  name: string;
  model: string;
  baseUrl?: string;
  key: () => Promise<string | null>;
  fetch?: Fetch;
}

type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown } | { type: "tool_result"; tool_use_id: string; content: string };

export function anthropicMessages(messages: Message[]): { role: "user" | "assistant"; content: Block[] }[] {
  const out: { role: "user" | "assistant"; content: Block[] }[] = [];
  const push = (role: "user" | "assistant", block: Block) => {
    const last = out.at(-1);
    if (last?.role === role) last.content.push(block);
    else out.push({ role, content: [block] });
  };
  for (const m of messages) {
    if (m.role === "tool") push("user", { type: "tool_result", tool_use_id: m.toolCallId ?? "", content: m.content });
    else {
      if (m.content) push(m.role, { type: "text", text: m.content });
      for (const c of m.toolCalls ?? []) push("assistant", { type: "tool_use", id: c.id, name: c.name, input: c.input });
    }
  }
  return out;
}

export class AnthropicProvider implements Provider {
  readonly kind = "anthropic" as const;
  readonly local = false;
  constructor(private cfg: AnthropicConfig) {}

  get name() {
    return this.cfg.name;
  }

  async *chat(messages: Message[], tools: Tool[], opts: ChatOptions = {}): AsyncGenerator<StreamEvent> {
    const key = await this.cfg.key();
    if (!key) throw new LlmError(`${this.cfg.name} has no key; run bkt llm add ${this.cfg.name}`);
    const client = new Anthropic({ apiKey: key, baseURL: this.cfg.baseUrl, fetch: this.cfg.fetch, maxRetries: 0 });
    const params = {
      model: opts.model ?? this.cfg.model,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: anthropicMessages(messages),
      stream: true as const,
      ...(opts.system ? { system: opts.system } : {}),
      ...(tools.length ? { tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema })) } : {}),
    };
    const blocks = new Map<number, { id: string; name: string; json: string }>();
    const usage = { input: 0, output: 0 };
    let stop = "end_turn";
    try {
      const stream = await client.messages.create(params as Anthropic.MessageCreateParamsStreaming, { signal: opts.signal });
      for await (const ev of stream) {
        if (opts.signal?.aborted) return;
        if (ev.type === "message_start") usage.input = ev.message.usage.input_tokens;
        else if (ev.type === "content_block_start" && ev.content_block.type === "tool_use")
          blocks.set(ev.index, { id: ev.content_block.id, name: ev.content_block.name, json: "" });
        else if (ev.type === "content_block_delta") {
          if (ev.delta.type === "text_delta") yield { type: "text", text: ev.delta.text };
          else if (ev.delta.type === "input_json_delta") {
            const b = blocks.get(ev.index);
            if (b) b.json += ev.delta.partial_json;
          }
        } else if (ev.type === "content_block_stop") {
          const b = blocks.get(ev.index);
          if (b) yield { type: "tool_call", call: { id: b.id, name: b.name, input: parseArgs(b.json) } };
        } else if (ev.type === "message_delta") {
          stop = ev.delta.stop_reason ?? stop;
          usage.output = ev.usage.output_tokens;
        }
      }
    } catch (e) {
      if (opts.signal?.aborted) return;
      if (e instanceof LlmError) throw e;
      const status = e instanceof Anthropic.APIError ? e.status : undefined;
      throw new LlmError(`${this.cfg.name}${status ? ` answered ${status}` : ""}: ${redact((e as Error).message ?? String(e), [key])}`, status);
    }
    yield { type: "done", stop, usage };
  }
}
