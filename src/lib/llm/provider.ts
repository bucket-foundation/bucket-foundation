export type Provider = "local" | "anthropic" | null;

export function selectProvider(): Provider {
  if (process.env.LLM_BASE_URL) return "local";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}
