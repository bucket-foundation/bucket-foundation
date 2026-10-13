export const MIN_GAP_ACTIVE_MS = 90 * 60 * 1000;
export const P_PER_ACTIVE_MINUTE = 1 / 60;
export const DAILY_CAP = 2;
export const TICK_MS = 60 * 1000;
export const IDLE_AFTER_MS = 2 * 60 * 1000;

export interface TriggerState {
  activeMsSinceLast: number;
  day: string;
  shownToday: number;
}

export interface TickInput {
  now: number;
  visible: boolean;
  lastInputAt: number;
  typing: boolean;
  quizOpen: boolean;
  rand: number;
}

export function localDay(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function initialState(now: number): TriggerState {
  return { activeMsSinceLast: 0, day: localDay(now), shownToday: 0 };
}

export function normalizeState(raw: unknown, now: number): TriggerState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<TriggerState>;
  const base: TriggerState = {
    activeMsSinceLast: typeof r.activeMsSinceLast === "number" && r.activeMsSinceLast >= 0 ? r.activeMsSinceLast : 0,
    day: typeof r.day === "string" ? r.day : localDay(now),
    shownToday: typeof r.shownToday === "number" && r.shownToday >= 0 ? Math.floor(r.shownToday) : 0,
  };
  return base.day === localDay(now) ? base : { ...base, day: localDay(now), shownToday: 0 };
}

export function tick(state: TriggerState, input: TickInput): { state: TriggerState; fire: boolean } {
  const s = normalizeState(state, input.now);
  const active = input.visible && input.now - input.lastInputAt <= IDLE_AFTER_MS;
  if (!active || input.quizOpen) return { state: s, fire: false };
  const next: TriggerState = { ...s, activeMsSinceLast: s.activeMsSinceLast + TICK_MS };
  const eligible = next.activeMsSinceLast >= MIN_GAP_ACTIVE_MS && next.shownToday < DAILY_CAP && !input.typing;
  if (!eligible || input.rand >= P_PER_ACTIVE_MINUTE) return { state: next, fire: false };
  return { state: markShown(next, input.now), fire: true };
}

export function markShown(state: TriggerState, now: number): TriggerState {
  const s = normalizeState(state, now);
  return { activeMsSinceLast: 0, day: s.day, shownToday: s.shownToday + 1 };
}

export const WORK_SURFACES = [
  "/research-os/workspace",
  "/research-os/n",
  "/research-os/map",
  "/research-os/import",
  "/research-os/primes",
  "/research-os/attend",
  "/research-os/nsm",
  "/research-os/software",
  "/research-os/productions",
  "/research-os/class",
  "/research-os/review",
  "/research-os/merges",
  "/research-os/roster",
  "/research-os/edges",
  "/research-os/status",
  "/research-os/patents",
  "/research-os/roadmap",
] as const;

export function onWorkSurface(pathname: string): boolean {
  return WORK_SURFACES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export const START_EVENT = "work-quiz:start";
export const DONE_EVENT = "work-quiz:done";
export const STORAGE_KEY = "bucket-ros/work-quiz/v1";
