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

export const ACTIVE_DPR: [number, number] = [1, 2];
export const REST_DPR = 1;

export function isResting(idleMs: number, restAfterMs = SPIN_REST_MS): boolean {
  return idleMs >= restAfterMs;
}

export function sceneDpr(resting: boolean): number | [number, number] {
  return resting ? REST_DPR : ACTIVE_DPR;
}

export interface VisibilitySource {
  hidden: boolean;
  addEventListener(type: "visibilitychange", run: () => void): void;
  removeEventListener(type: "visibilitychange", run: () => void): void;
}

export function onVisible(doc: VisibilitySource, run: () => void): () => void {
  const check = () => {
    if (!doc.hidden) run();
  };
  doc.addEventListener("visibilitychange", check);
  return () => doc.removeEventListener("visibilitychange", check);
}

export function releaseWebgl(host: Pick<Element, "querySelectorAll"> | null): number {
  let released = 0;
  for (const canvas of host ? Array.from(host.querySelectorAll("canvas")) : []) {
    for (const kind of ["webgl2", "webgl"] as const) {
      let lose: { loseContext(): void } | null | undefined;
      try {
        lose = ((canvas as HTMLCanvasElement).getContext(kind) as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context");
      } catch {
        lose = null;
      }
      if (!lose) continue;
      lose.loseContext();
      released++;
      break;
    }
    canvas.remove();
  }
  return released;
}
