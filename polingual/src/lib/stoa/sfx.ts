import type { Sfx } from "./script";
import { hz } from "./songs";
import type { Synth } from "./synth";

export function playSfx(s: Synth, name: Sfx, t: number, bus: AudioNode): void {
  const up = (notes: number[], gap: number, type: OscillatorType, peak: number, dur = 0.25) => notes.forEach((n, i) => s.osc(type, hz(n), t + i * gap, dur, peak, bus));
  if (name === "join") {
    const o = s.osc("sine", 520, t, 0.16, 0.35, bus);
    o.frequency.exponentialRampToValueAtTime(1300, t + 0.1);
  } else if (name === "open") {
    up([72, 79, 84], 0.06, "triangle", 0.3, 0.3);
    s.noiseHit(t, 0.35, 0.12, "bandpass", 3000, bus);
  } else if (name === "lock") {
    s.osc("square", 880, t, 0.05, 0.08, bus);
    s.noiseHit(t, 0.03, 0.15, "highpass", 4000, bus);
  } else if (name === "tick") s.osc("sine", 1200, t, 0.06, 0.25, bus);
  else if (name === "tock") {
    s.osc("square", 660, t, 0.1, 0.18, bus);
    s.osc("sine", 1320, t, 0.08, 0.2, bus);
  } else if (name === "reveal") {
    s.sweep(t, 400, 6000, 0.45, 2, [0.35, 0.3, 0.25], 0.7, bus);
    [60, 64, 67, 72].forEach((n) => s.osc("triangle", hz(n), t + 0.45, 0.9, 0.16, bus, 0.01));
  } else if (name === "right") up([72, 76, 79, 84], 0.07, "triangle", 0.35, 0.35);
  else if (name === "streak") {
    up([72, 76, 79, 84, 88, 91], 0.05, "triangle", 0.32, 0.3);
    s.noiseHit(t + 0.3, 0.5, 0.1, "highpass", 6000, bus);
  } else if (name === "wrong") {
    const o = s.osc("sawtooth", 220, t, 0.4, 0.2, bus);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.35);
  } else if (name === "whoosh") s.sweep(t, 5000, 300, 0.4, null, [0.3, 0.08, 0.35], 0.5, bus);
  else if (name === "climb") up([67, 72], 0.08, "sine", 0.25, 0.2);
  else if (name === "fanfare") fanfare(s, t, bus);
}

function fanfare(s: Synth, t: number, bus: AudioNode): void {
  [[70, 74, 77], [70, 74, 77], [75, 79, 82], [77, 81, 84], [82, 86, 89]].forEach((c, i) => {
    const at = t + [0, 0.18, 0.36, 0.62, 0.9][i];
    c.forEach((n) => s.osc("sawtooth", hz(n), at, i === 4 ? 1.4 : 0.16, 0.06, bus));
    c.forEach((n) => s.osc("triangle", hz(n), at, i === 4 ? 1.4 : 0.16, 0.1, bus));
  });
  for (let i = 0; i < 12; i++) s.noiseHit(t + 0.9 + i * 0.04, 0.05, 0.08, "bandpass", 2500 + i * 300, bus);
}
