import {
  complete,
  localLlmConfig,
  selectProvider,
  type ChatMessage,
  type LlmCallResult,
  type LlmError,
  type LlmUsage,
  type Provider,
} from "../llm/client";

export { selectProvider };
export type { LlmCallResult, LlmError, LlmUsage, Provider };

const MODEL = "claude-sonnet-4-5";
const LOCAL = localLlmConfig(20);

export async function callGroundedModelWithUsage(
  provider: Provider,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<LlmCallResult> {
  return complete({ provider, system, messages, maxTokens, anthropicModel: MODEL, local: LOCAL });
}

export async function callGroundedModel(
  provider: Provider,
  system: string,
  messages: ChatMessage[],
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
