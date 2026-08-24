/**
 * LLM client seam for the Bucket research agent.
 *
 * MIRRORS the tutor's seam (`src/app/api/academy/tutor/route.ts` callLocalLLM +
 * its Anthropic branch), same env contract (LLM_BASE_URL / LLM_MODEL /
 * LLM_API_KEY / LLM_TIMEOUT_S), same OpenAI-compatible POST, same error tagging
 * (`.status`) so the route's 401/429/502 handling applies, same fail-safe
 * posture. In prod the local path is the bearer-protected auth-shim +
 * cloudflared tunnel in front of a llama.cpp server running Qwen2.5-Coder-7B on
 * Gian's AMD RX 7700S (Vulkan, ~13 tok/s). It is NOT a different LLM client, 
 * the research agent and the tutor speak to the same endpoint the same way.
 *
 * Why a local module and not an import from the tutor route: Next.js forbids
 * importing non-handler exports across `route.ts` files, and the tutor keeps its
 * client inline. This module is the agent's copy of that exact pattern (one
 * function, one Anthropic branch) so the seam stays identical and testable.
 */
import Anthropic from "@anthropic-ai/sdk";
import { selectProvider, type Provider } from "./provider";

const LLM_BASE_URL = () => process.env.LLM_BASE_URL?.replace(/\/+$/, "");
const LLM_MODEL = () => process.env.LLM_MODEL || "qwen2.5-coder-7b";
const LLM_API_KEY = () => process.env.LLM_API_KEY;
const LLM_TIMEOUT_MS = () => Number(process.env.LLM_TIMEOUT_S || 60) * 1000;

// Hosted-Anthropic fallback model, same choice the tutor makes. The grounding
// does the factual work, so a mid model is plenty.
const ANTHROPIC_MODEL = "claude-sonnet-4-5";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Tagged error so the caller can map status the same way the tutor does. */
export type LlmError = Error & { status?: number };

/** Call the local OpenAI-compatible chat endpoint (default path). Throws an
 * error tagged with `.status` on a non-2xx so the caller's catch can map
 * 401/429/timeout exactly as the tutor route does. */
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

/** Single completion via whichever provider is configured (local default,
 * Anthropic fallback). Errors propagate tagged with `.status`. */
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
