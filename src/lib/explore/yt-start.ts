export interface Cue {
  start: string;
  end?: string;
  text: string;
}

export interface YtStarts {
  v: 1;
  excerpts: Record<string, number>;
  sources: Record<string, number>;
}

const PROBE = 16;
const THRESHOLD = 0.6;
const REACH = 3;

export function cueSeconds(stamp: string): number {
  const parts = stamp.trim().split(":").map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return NaN;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/[’']/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function matchStart(snippet: string, cues: Cue[]): number | null {
  const probe = words(snippet).slice(0, PROBE);
  if (probe.length < 4) return null;
  const seq: string[] = [];
  const at: number[] = [];
  for (const cue of cues) {
    const s = cueSeconds(cue.start);
    if (!Number.isFinite(s)) continue;
    for (const w of words(cue.text)) {
      seq.push(w);
      at.push(s);
    }
  }
  const heads = new Set(probe.slice(0, 3));
  let best = 0;
  let bestAt = -1;
  for (let i = 0; i < seq.length; i++) {
    if (!heads.has(seq[i])) continue;
    const { hits, first } = orderedHits(probe, seq, i);
    if (hits > best) {
      best = hits;
      bestAt = first;
      if (hits === probe.length) break;
    }
  }
  if (bestAt < 0 || best / probe.length < THRESHOLD) return null;
  return Math.floor(at[bestAt]);
}

function orderedHits(probe: string[], seq: string[], from: number): { hits: number; first: number } {
  let j = from;
  let hits = 0;
  let first = -1;
  for (const w of probe) {
    const end = Math.min(seq.length, j + REACH);
    for (let x = j; x < end; x++) {
      if (seq[x] === w) {
        if (first < 0) first = x;
        hits++;
        j = x + 1;
        break;
      }
    }
  }
  return { hits, first };
}

export function startFromUrl(url: string): number | null {
  const t = /[?&]t=(\d+)/.exec(url)?.[1];
  return t ? Number(t) : null;
}

export function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
