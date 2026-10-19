import { parseDownload, type DownloadRequest } from "../download/core";
import { parseSignup, type SignupInput } from "../waitlist/core";
import type { StorePart } from "../waitlist/store";

export const CAPTURE_SOURCES = ["download", "footer", "polingual", "quiz", "wall"] as const;
export type CaptureSource = (typeof CAPTURE_SOURCES)[number];

export const CAPTURE_WINDOW_MS = 30_000;
export const CAPTURE_MAX_PER_WINDOW = 1;
export const LEG_TIMEOUT_MS = 6_000;
export const LANGUAGES_MAX = 160;
export const PERSONA_MAX = 40;
export const INTEREST_MAX = 160;

export const CAPTURE_LEGS = ["store", "email", "analytics", "slack"] as const;
export type CaptureLeg = (typeof CAPTURE_LEGS)[number];
export type Delivered = Record<CaptureLeg, "dispatched" | null>;

export interface CaptureRecord {
  email: string;
  source: CaptureSource;
  persona: string | null;
  speaks: string | null;
  learning: string | null;
  interest: string | null;
  opt_ins: { release_notes: boolean; whats_new_daily: boolean };
  at: string;
}

export type ParsedCapture =
  | { ok: true; source: CaptureSource; input: SignupInput; download: DownloadRequest | null; suspect: boolean; record: Omit<CaptureRecord, "at"> }
  | { ok: false; error: string };

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const out = Array.from(value, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch)).join("").replace(/\s+/g, " ").trim().slice(0, max);
  return out || null;
}

export function isCaptureSource(value: unknown): value is CaptureSource {
  return (CAPTURE_SOURCES as readonly unknown[]).includes(value);
}

export function storePart(source: CaptureSource, suspect: boolean): StorePart {
  if (source === "download") return suspect ? "downloads/suspect" : "downloads";
  if (source === "polingual") return suspect ? "polingual/suspect" : "polingual";
  return suspect ? "suspect" : "list";
}

export function parseCapture(body: unknown): ParsedCapture {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!isCaptureSource(b.source)) return { ok: false, error: "Unknown signup source." };
  const source = b.source;
  let input: SignupInput;
  let download: DownloadRequest | null = null;
  let suspect: boolean;
  if (source === "download") {
    const parsed = parseDownload(b);
    if (!parsed.ok) return parsed;
    download = parsed.request;
    input = parsed.request.input;
    suspect = parsed.suspect;
  } else {
    const parsed = parseSignup(b);
    if (!parsed.ok) return parsed;
    input = parsed.input;
    suspect = parsed.suspect;
  }
  const speaks = text(b.speaks, LANGUAGES_MAX);
  const learning = text(b.learning, LANGUAGES_MAX);
  if (speaks) input = { ...input, speaks };
  if (learning) input = { ...input, learning };
  const record = {
    email: input.email,
    source,
    persona: text(b.persona, PERSONA_MAX),
    speaks,
    learning,
    interest: text(b.research ?? b.interest, INTEREST_MAX),
    opt_ins: { release_notes: input.release_notes === true, whats_new_daily: input.whats_new_daily === true },
  };
  return { ok: true, source, input, download, suspect, record };
}
