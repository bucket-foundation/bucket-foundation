import { atlasPoints, ATLAS_MAX } from "@academy/voice-atlas";

export function guessPoints(km: number, peek: boolean): number {
  return Math.round(atlasPoints(km) / (peek ? 2 : 1));
}

export function stamped(points: number): boolean {
  return points >= ATLAS_MAX * 0.5;
}

export function addStamp(have: readonly string[], lang: string): string[] {
  return have.includes(lang) ? [...have] : [...have, lang];
}

export function mapPoint(clientX: number, clientY: number, box: { left: number; top: number; width: number; height: number }, w: number, h: number): [number, number] {
  return [((clientX - box.left) / box.width) * w, ((clientY - box.top) / box.height) * h];
}
