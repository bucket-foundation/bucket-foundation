import Anthropic from "@anthropic-ai/sdk";
import { selectProvider, type Provider } from "./provider";

export { selectProvider };
export type { Provider };

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface LlmError extends Error {
  status?: number;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmCallResult {
  text: string;
  usage: LlmUsage | null;
}

export interface LocalLlmConfig {
  baseUrl: string | undefined;
  model: string;
  apiKey: string | undefined;
  timeoutMs: number;
}

export function localLlmConfig(defaultTimeoutS: number): LocalLlmConfig {
  return {
    baseUrl: process.env.LLM_BASE_URL?.replace(/\/+$/, ""),
    model: process.env.LLM_MODEL || "qwen2.5-coder-7b",
    apiKey: process.env.LLM_API_KEY,
    timeoutMs: Number(process.env.LLM_TIMEOUT_S || defaultTimeoutS) * 1000,
  };
}

export interface CompleteOptions {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  anthropicModel: string;
  local: LocalLlmConfig;
  provider?: Provider;
  noProviderStatus?: number;
}

async function callLocal(opts: CompleteOptions): Promise<LlmCallResult> {
  const { local } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), local.timeoutMs);
  try {
    const resp = await fetch(`${local.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(local.apiKey ? { Authorization: `Bearer ${local.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: local.model,
        max_tokens: opts.maxTokens,
        temperature: 0.2,
        stream: false,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const err = new Error(`local LLM HTTP ${resp.status}`) as LlmError;
      err.status = resp.status;
      throw err;
    }
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = (data.choices?.[0]?.message?.content || "").trim();
    const usage =
      data.usage && typeof data.usage.prompt_tokens === "number" && typeof data.usage.completion_tokens === "number"
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : null;
    return { text, usage };
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(opts: CompleteOptions): Promise<LlmCallResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await anthropic.messages.create({
    model: opts.anthropicModel,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages as Anthropic.MessageParam[],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  const usage = resp.usage ? { inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens } : null;
  return { text, usage };
}

export async function complete(opts: CompleteOptions): Promise<LlmCallResult> {
  const provider = opts.provider === undefined ? selectProvider() : opts.provider;
  if (provider === "local") return callLocal(opts);
  if (provider === "anthropic") return callAnthropic(opts);
  const err = new Error("no LLM provider configured") as LlmError;
  if (opts.noProviderStatus !== undefined) err.status = opts.noProviderStatus;
  throw err;
}
