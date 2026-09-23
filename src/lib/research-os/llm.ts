import Anthropic from "@anthropic-ai/sdk";
import { selectProvider, type Provider } from "../../app/api/academy/tutor/provider";

export { selectProvider };
export type { Provider };

const MODEL = "claude-sonnet-4-5";
const LLM_BASE_URL = process.env.LLM_BASE_URL?.replace(/\/+$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "qwen2.5-coder-7b";
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_S || 20) * 1000;

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

async function callLocalLLM(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<LlmCallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const resp = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: maxTokens,
        temperature: 0.2,
        stream: false,
        messages: [{ role: "system", content: system }, ...messages],
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

export async function callGroundedModelWithUsage(
  provider: Provider,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<LlmCallResult> {
  if (provider === "local") return callLocalLLM(system, messages, maxTokens);
  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: messages as Anthropic.MessageParam[],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const usage = resp.usage ? { inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens } : null;
    return { text, usage };
  }
  throw new Error("no LLM provider configured");
}

export async function callGroundedModel(
  provider: Provider,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  return (await callGroundedModelWithUsage(provider, system, messages, maxTokens)).text;
}

const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 2.0, output: 10.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

export function estimateCostUsd(usage: LlmUsage | null, model: string = MODEL): number | null {
  if (!usage) return null;
  const price = PRICE_PER_MILLION[model] ?? PRICE_PER_MILLION["claude-sonnet-4-5"];
  return (usage.inputTokens / 1_000_000) * price.input + (usage.outputTokens / 1_000_000) * price.output;
}

export function logToolCost(tool: string, learnerId: string, provider: Provider, usage: LlmUsage | null): void {
  const costUsd = estimateCostUsd(usage);
  console.log(
    "[research-os/cost]",
    JSON.stringify({ tool, learnerId, provider, inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null, costUsd }),
  );
}

export function parseModelJson<T>(text: string): T | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
