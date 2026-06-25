/**
 * LLM provider selection for the Academy tutor — extracted so it can be unit
 * tested (Next.js forbids non-handler exports from a `route.ts`).
 *
 * Local LLM (OpenAI-compatible — in prod the auth-shim + cloudflared tunnel in
 * front of a llama.cpp server on Gian's AMD RX 7700S GPU) is the DEFAULT when
 * LLM_BASE_URL is set.
 * Hosted Anthropic is the fallback ALTERNATIVE when only ANTHROPIC_API_KEY is
 * set. Neither => null => the route returns 503 (tutor dark). All S1–S7 safety
 * runs in code regardless of which provider answers, so they are interchangeable.
 *
 * Reads env live (not module-load constants) so it reflects current config and
 * is straightforward to test.
 */
export type Provider = "local" | "anthropic" | null;

export function selectProvider(): Provider {
  if (process.env.LLM_BASE_URL) return "local";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}
