/**
 * Research OS for K-12, Phase 0, shared grounded-model call (bkt-ros).
 * Reuses the /api/academy/tutor provider seam (local OpenAI-compatible LLM
 * default, hosted Anthropic fallback, dark when neither is configured) so
 * Check and Organize (src/app/api/research-os/workspace/route.ts) run
 * against the same two providers the tutor does, with no third integration
 * to configure. See src/app/api/academy/tutor/route.ts's header for the full
 * S1-S7 safety rationale this module's callers must keep enforcing in code.
 */
import Anthropic from "@anthropic-ai/sdk";
import { selectProvider, type Provider } from "@/app/api/academy/tutor/provider";

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

async function callLocalLLM(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
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
    const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return (data.choices?.[0]?.message?.content || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

/** Call the configured provider (local default, Anthropic fallback) and return raw text. Throws on failure/timeout. */
export async function callGroundedModel(
  provider: Provider,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  if (provider === "local") return callLocalLLM(system, messages, maxTokens);
  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: MODEL,
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
  throw new Error("no LLM provider configured");
}

/** Strip markdown fences and parse the first {...} block. Returns null on any failure (fail-safe, S7). */
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
