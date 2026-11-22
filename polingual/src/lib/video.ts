export interface VideoCue {
  start: number;
  end: number;
  text: Record<string, string>;
}

export interface Video {
  id: string;
  title: string;
  channel: string;
  duration: number;
  source_lang: string;
  license: string;
  source_url: string;
  langs: string[];
  cues: VideoCue[];
}

export interface VideoSummary {
  id: string;
  title: string;
  channel: string;
  duration: number;
  langs: string[];
  thumb: string;
  license: string;
  source_url: string;
}

export interface SavedWord {
  video: string;
  lang: string;
  word: string;
  start: number;
}

export interface VideoProgress {
  seen: number[];
  words: number;
  total?: number;
}

export const PROGRESS_KEY = "polingual-web/video-progress/v1";
export const WORDS_KEY = "polingual-web/video-words/v1";

export function activeCue(cues: VideoCue[], t: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found < 0) return -1;
  const next = cues[found + 1];
  return t < cues[found].end || (next && t < next.start) ? found : -1;
}

export function defaultLangs(video: Pick<Video, "langs" | "source_lang">, wanted = ["en", "fr", "ja"]): string[] {
  const picks = [video.source_lang, ...wanted.filter((l) => l !== video.source_lang && video.langs.includes(l))];
  for (const l of video.langs) if (picks.length < 3 && !picks.includes(l)) picks.push(l);
  return picks.slice(0, 4);
}

export function toggleLang(current: string[], lang: string): string[] {
  if (current.includes(lang)) return current.length > 2 ? current.filter((l) => l !== lang) : current;
  return current.length < 4 ? [...current, lang] : [...current.slice(1), lang];
}

const SEGMENTERS = new Map<string, Intl.Segmenter>();

export function words(text: string, lang: string): { text: string; word: boolean }[] {
  let seg = SEGMENTERS.get(lang);
  if (!seg) {
    seg = new Intl.Segmenter(lang, { granularity: "word" });
    SEGMENTERS.set(lang, seg);
  }
  return [...seg.segment(text)].map((p) => ({ text: p.segment, word: !!p.isWordLike }));
}

export function progressOf(p: VideoProgress | undefined, cueCount: number): number {
  if (!p || cueCount === 0) return 0;
  return Math.min(new Set(p.seen).size / cueCount, 1);
}

export function markSeen(p: VideoProgress | undefined, cue: number): VideoProgress {
  const base = p ?? { seen: [], words: 0 };
  return base.seen.includes(cue) ? base : { ...base, seen: [...base.seen, cue] };
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function licenseLabel(license: string): string {
  return /creative commons attribution/i.test(license) ? "CC BY" : license.replace(/\s*\(.*\)$/, "");
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function cleanTitle(title: string): string {
  return title.replace(/\s*#.*$/, "").replace(/\s*\u2014\s*/g, ": ").trim();
}
