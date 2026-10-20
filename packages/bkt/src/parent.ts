import { readFileSync } from "node:fs";

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

export interface ParentProbe {
  ppid: () => number;
  alive: (pid: number) => boolean;
  every: (ms: number, tick: () => void) => () => void;
}

export const PARENT_POLL_MS = 500;

export function livePpid(): number {
  try {
    const stat = readFileSync("/proc/self/stat", "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    const ppid = Number(fields[1]);
    if (Number.isInteger(ppid) && ppid > 0) return ppid;
  } catch {
    return process.ppid;
  }
  return process.ppid;
}

export const SYSTEM_PROBE: ParentProbe = {
  ppid: livePpid,
  alive: (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return (e as NodeJS.ErrnoException).code === "EPERM";
    }
  },
  every: (ms, tick) => {
    const t = setInterval(tick, ms);
    return () => clearInterval(t);
  },
};

export function parentDied(probe: ParentProbe): Promise<void> {
  const first = probe.ppid();
  return new Promise<void>((resolve) => {
    const stop = probe.every(PARENT_POLL_MS, () => {
      if (probe.ppid() !== first || !probe.alive(first)) {
        stop();
        resolve();
      }
    });
  });
}

export function parentGone(env: Env, stdin: () => AsyncIterable<unknown>, onLine?: (line: string) => void, probe: ParentProbe = SYSTEM_PROBE): Promise<void> {
  if (!isSidecar(env)) return new Promise<void>(() => {});
  return Promise.race([watchParent(stdin(), onLine), parentDied(probe)]);
}
