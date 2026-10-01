export type Env = Record<string, string | undefined>;

export function isSidecar(env: Env): boolean {
  return env.BKT_SIDECAR === "1";
}

export async function drained(stream: AsyncIterable<unknown>): Promise<void> {
  try {
    for await (const _ of stream) continue;
  } catch {
    return;
  }
}

export function parentGone(env: Env, stdin: () => AsyncIterable<unknown>): Promise<void> {
  if (!isSidecar(env)) return new Promise<void>(() => {});
  return drained(stdin());
}
