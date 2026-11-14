export const MUTE_KEY = "polingual-web/play-muted/v1";

export type Cue = "tap" | "hit" | "miss" | "round" | "win";

const NOTES: Record<Cue, [number, number][]> = {
  tap: [[660, 0.05]],
  hit: [[784, 0.07], [1047, 0.09]],
  miss: [[220, 0.14]],
  round: [[523, 0.06], [659, 0.06], [784, 0.08]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.18]],
};

export function cueNotes(cue: Cue): [number, number][] {
  return NOTES[cue];
}

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

export function play(cue: Cue, muted: boolean): void {
  if (muted || typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(MUTE_KEY) === "1") return;
  } catch {
    return;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  try {
    ctx ??= new Ctor();
    let t = ctx.currentTime;
    for (const [freq, len] of NOTES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cue === "miss" ? "sawtooth" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + len);
      t += len * 0.8;
    }
  } catch {
  }
}
