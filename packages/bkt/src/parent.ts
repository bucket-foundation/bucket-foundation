export type Env = Record<string, string | undefined>;

export const PARENT_LINE_BYTES = 256;

export function isSidecar(env: Env): boolean {
  return env.BKT_SIDECAR === "1";
}

export async function watchParent(stream: AsyncIterable<unknown>, onLine: (line: string) => void = () => {}): Promise<void> {
  const decoder = new TextDecoder();
  let held: number[] = [];
  let over = false;
  try {
    for await (const chunk of stream) {
      if (!(chunk instanceof Uint8Array)) continue;
      for (const byte of chunk) {
        if (byte !== 10) {
          if (held.length >= PARENT_LINE_BYTES) over = true;
          else held.push(byte);
          continue;
        }
        const line = over ? null : decoder.decode(new Uint8Array(held)).replace(/\r$/, "");
        held = [];
        over = false;
        if (line === null) continue;
        try {
          onLine(line);
        } catch {
          continue;
        }
      }
    }
  } catch {
    return;
  }
}

export function parentGone(env: Env, stdin: () => AsyncIterable<unknown>, onLine?: (line: string) => void): Promise<void> {
  if (!isSidecar(env)) return new Promise<void>(() => {});
  return watchParent(stdin(), onLine);
}
