export type Listen = Pick<EventTarget, "addEventListener" | "removeEventListener">;

export interface ReconnectTimers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export const RETRY_MS = [5_000, 15_000, 60_000, 300_000];

export function watchReconnect(win: Listen, doc: Listen & { visibilityState?: string }, flush: () => Promise<unknown>, pending: () => number, timers: ReconnectTimers = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) }): () => void {
  let attempt = 0;
  let timer: unknown = null;
  let stopped = false;
  const schedule = () => {
    if (stopped || timer !== null || pending() === 0) return;
    timer = timers.setTimeout(() => {
      timer = null;
      run();
    }, RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
    attempt += 1;
  };
  const run = () => {
    if (stopped) return;
    if (timer !== null) {
      timers.clearTimeout(timer);
      timer = null;
    }
    void flush()
      .catch(() => undefined)
      .then(() => {
        if (pending() === 0) attempt = 0;
        else schedule();
      });
  };
  const onVisible = () => {
    if (doc.visibilityState === undefined || doc.visibilityState === "visible") run();
  };
  win.addEventListener("online", run);
  win.addEventListener("focus", run);
  doc.addEventListener("visibilitychange", onVisible);
  run();
  return () => {
    stopped = true;
    if (timer !== null) timers.clearTimeout(timer);
    win.removeEventListener("online", run);
    win.removeEventListener("focus", run);
    doc.removeEventListener("visibilitychange", onVisible);
  };
}
