import type { Track } from "./script";

export type Song = { bpm: number; chords: number[][]; bass: number[]; arp: number[]; melody?: (number | null)[] };

export const SONGS: Record<Exclude<Track, "silent">, Song> = {
  lobby: {
    bpm: 98,
    chords: [[62, 65, 69, 72], [67, 71, 74, 77], [69, 72, 76, 79], [67, 71, 74, 77]],
    bass: [38, 43, 45, 43],
    arp: [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 3, 1, 2, 0, 1],
    melody: [74, null, 77, null, 76, 74, null, 72, 69, null, 72, null, 74, null, null, null],
  },
  question: {
    bpm: 128,
    chords: [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 56, 59, 64]],
    bass: [33, 29, 31, 28],
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 3, 2, 1, 0],
  },
  reveal: {
    bpm: 90,
    chords: [[60, 64, 67, 72], [60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79]],
    bass: [36, 36, 41, 43],
    arp: [0, 2, 3, 2, 0, 2, 3, 2, 0, 2, 3, 2, 0, 2, 3, 2],
  },
  board: {
    bpm: 112,
    chords: [[65, 69, 72, 76], [60, 64, 67, 72], [67, 71, 74, 79], [69, 72, 76, 81]],
    bass: [41, 36, 43, 45],
    arp: [0, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 0, 3, 2, 1, 0],
    melody: [76, null, 79, 77, 76, null, 72, null, 74, 76, null, 79, 81, null, null, null],
  },
  finale: {
    bpm: 120,
    chords: [[58, 62, 65, 70], [63, 67, 70, 75], [65, 69, 72, 77], [58, 62, 65, 70]],
    bass: [34, 39, 41, 34],
    arp: [0, 1, 2, 3, 2, 3, 1, 2, 0, 1, 2, 3, 3, 2, 1, 0],
    melody: [82, null, 82, 84, 86, null, 84, 82, 79, null, 82, null, 77, null, null, null],
  },
};

export function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
