export const MUTE_KEY = "polingual-web/play-muted/v1";

export type Cue = "tap" | "hit" | "miss" | "round" | "win";

const NOTES: Record<Cue, [number, number][]> = {
  tap: [[660, 0.05]],
  hit: [[784, 0.07], [1047, 0.09]],
  miss: [[220, 0.14]],
  round: [[523, 0.06], [659, 0.06], [784, 0.08]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.18]],
};

export function readMuted(storage: () => Storage | null): boolean {
  try {
    return storage()?.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(storage: () => Storage | null, muted: boolean): void {
  try {
    storage()?.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
  }
}

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

export function unlockSound(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  try {
    const c = context();
    if (!c) return Promise.resolve(true);
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
    if (c.state === "running") return Promise.resolve(true);
    return c.resume().then(() => (c.state as AudioContextState) === "running", () => false);
  } catch {
    return Promise.resolve(false);
  }
}

export function resetSound(): void {
  ctx = null;
}

export function play(cue: Cue, muted: boolean): void {
  if (muted || typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(MUTE_KEY) === "1") return;
  } catch {
    return;
  }
  try {
    const audio = context();
    if (!audio) return;
    let t = audio.currentTime;
    for (const [freq, len] of NOTES[cue]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = cue === "miss" ? "sawtooth" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + len);
      t += len * 0.8;
    }
  } catch {
  }
}
