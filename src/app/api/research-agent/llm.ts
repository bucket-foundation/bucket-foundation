import { complete as completeWith, localLlmConfig, type ChatMessage, type LlmError } from "@/lib/llm/client";

export { selectProvider } from "@/lib/llm/client";
export type { ChatMessage, LlmError };

export async function complete(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const result = await completeWith({
    system,
    messages,
    maxTokens,
    anthropicModel: "claude-sonnet-4-5",
    local: localLlmConfig(60),
    noProviderStatus: 503,
  });
  return result.text;
}
