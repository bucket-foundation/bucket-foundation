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
// A relative import here (the "@/" alias resolves fine too, but only under
// Next's own bundler) keeps llm.ts, and everything that transitively
// imports it (grounding.ts, locate.ts), resolvable by plain ts-node in
// scripts/test-research-os-*.ts, which carries no tsconfig-paths
// registration (bkt-ros ros-04, found writing
// scripts/test-research-os-workspace-contracts.ts).
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

/** Input/output token counts for one model call, when the provider reports
 * them. Both a local OpenAI-compatible endpoint and Anthropic's API return
 * usage on every response; "when available" (bkt-ros ros-04, "Rate and
 * cost guard") covers the case where a local server's OpenAI-compat shim
 * omits the field. */
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

/** Call the configured provider (local default, Anthropic fallback) and
 * return raw text plus usage when the provider reports it. Throws on
 * failure/timeout. Callers that only need the text (most of this package)
 * should use callGroundedModel below; callGroundedModelWithUsage is for the
 * cost-estimate log ros-04 adds to Check and Organize. */
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

/** The original text-only call, kept for every caller that has no use for
 * usage (most of this package: Locate/Quote never call a model at all, and
 * several callers of gradeExplanation only want the verdict). */
export async function callGroundedModel(
  provider: Provider,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  return (await callGroundedModelWithUsage(provider, system, messages, maxTokens)).text;
}

/** Per-million-token USD pricing, current Anthropic first-party rates cited
 * in _intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md's workspace
 * cost model (Sonnet 5 $2.00/$10.00, Haiku 4.5 $1.00/$5.00 per million
 * input/output tokens). The local provider's own inference cost is not a
 * per-token USD figure (it runs on owned hardware), so a local-provider
 * call estimates against the same table only for a size-of-call reference
 * point, labeled `provider: "local"` in the log line rather than implying a
 * real dollar charge. */
const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 2.0, output: 10.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

/** A best-effort USD cost estimate for one model call (bkt-ros ros-04,
 * "a cost estimate logged per call from the tutor's token usage if
 * available"). Returns null when `usage` is null (the provider reported no
 * token counts): a missing figure stays visibly missing, matching this
 * package's fail-safe posture elsewhere (parseModelJson, gradeExplanation's
 * abstain fallback). */
export function estimateCostUsd(usage: LlmUsage | null, model: string = MODEL): number | null {
  if (!usage) return null;
  const price = PRICE_PER_MILLION[model] ?? PRICE_PER_MILLION["claude-sonnet-4-5"];
  return (usage.inputTokens / 1_000_000) * price.input + (usage.outputTokens / 1_000_000) * price.output;
}

/** Logs one tool call's cost estimate as a structured line (bkt-ros ros-04).
 * No durable store exists for this yet (the Viatika metering hook is a
 * TODO shared with /api/academy/tutor, CLAUDE.md #6); this is the Phase 0/1
 * floor, a server log a human or a future ingester can read, never a
 * blocking call and never thrown from. */
export function logToolCost(tool: string, learnerId: string, provider: Provider, usage: LlmUsage | null): void {
  const costUsd = estimateCostUsd(usage);
  console.log(
    "[research-os/cost]",
    JSON.stringify({ tool, learnerId, provider, inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null, costUsd }),
  );
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
