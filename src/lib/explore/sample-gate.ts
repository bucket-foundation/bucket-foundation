export type Env = Record<string, string | undefined>;

const SAMPLE_VERCEL_ENVS = ["preview", "development"];
const SAMPLE_NODE_ENVS = ["development", "test"];

export function samplesAllowed(env: Env = process.env): boolean {
  const vercel = env.VERCEL_ENV?.trim();
  if (vercel) return SAMPLE_VERCEL_ENVS.includes(vercel);
  return SAMPLE_NODE_ENVS.includes(env.NODE_ENV?.trim() ?? "");
}
