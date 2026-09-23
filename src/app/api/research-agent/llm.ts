import Anthropic from "@anthropic-ai/sdk";
import { selectProvider, type Provider } from "./provider";

const LLM_BASE_URL = () => process.env.LLM_BASE_URL?.replace(/\/+$/, "");
const LLM_MODEL = () => process.env.LLM_MODEL || "qwen2.5-coder-7b";
const LLM_API_KEY = () => process.env.LLM_API_KEY;
const LLM_TIMEOUT_MS = () => Number(process.env.LLM_TIMEOUT_S || 60) * 1000;

const ANTHROPIC_MODEL = "claude-sonnet-4-5";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type LlmError = Error & { status?: number };

async function callLocalLLM(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS());
  try {
    const resp = await fetch(`${LLM_BASE_URL()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(LLM_API_KEY() ? { Authorization: `Bearer ${LLM_API_KEY()}` } : {}),
      },
      body: JSON.stringify({
        model: LLM_MODEL(),
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
    };
    return (data.choices?.[0]?.message?.content || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: messages as Anthropic.MessageParam[],
  });
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function complete(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const provider: Provider = selectProvider();
  if (provider === "local") return callLocalLLM(system, messages, maxTokens);
  if (provider === "anthropic") return callAnthropic(system, messages, maxTokens);
  const err = new Error("no LLM provider configured") as LlmError;
  err.status = 503;
  throw err;
}

export { selectProvider } from "./provider";
