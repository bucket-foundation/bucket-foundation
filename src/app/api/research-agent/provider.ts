/**
 * LLM provider selection for the Bucket research agent — extracted so it can be
 * unit-tested (Next.js forbids non-handler exports from a `route.ts`). This is
 * the SAME seam the Academy tutor uses (see
 * `src/app/api/academy/tutor/provider.ts`) — local GPU LLM is the DEFAULT when
 * LLM_BASE_URL is set, hosted Anthropic is the fallback ALTERNATIVE, neither =>
 * null => the route returns 503 (agent dark). All grounding/citation/abstain
 * safety runs in code regardless of which provider answers (S7), so they are
 * interchangeable.
 *
 * Reads env live (not module-load constants) so it reflects current config.
 */
export type Provider = "local" | "anthropic" | null;

export function selectProvider(): Provider {
  if (process.env.LLM_BASE_URL) return "local";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}
