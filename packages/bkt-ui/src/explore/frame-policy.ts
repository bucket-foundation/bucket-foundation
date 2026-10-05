export const SPIN_FPS = 20;
export const MAX_SPIN_STEP_S = 0.1;
export const SPIN_REST_MS = 15_000;

export interface TickerDeps {
  invalidate(): void;
  hidden(): boolean;
  idleMs(): number;
  every(run: () => void, ms: number): unknown;
  cancel(handle: unknown): void;
}

export function startSpinTicker(deps: TickerDeps, fps = SPIN_FPS, restAfterMs = SPIN_REST_MS): () => void {
  const handle = deps.every(() => {
    if (!deps.hidden() && deps.idleMs() < restAfterMs) deps.invalidate();
  }, Math.round(1000 / fps));
  return () => deps.cancel(handle);
}

export function spinStep(spin: number, dt: number): number {
  return spin * Math.min(Math.max(dt, 0), MAX_SPIN_STEP_S);
}
