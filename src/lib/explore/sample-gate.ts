export type Env = Record<string, string | undefined>;

export function samplesAllowed(env: Env = process.env): boolean {
  return env.VERCEL_ENV !== "production";
}
