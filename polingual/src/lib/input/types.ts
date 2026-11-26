export type InputKind = "sentence" | "passage" | "audio" | "video_segment";

export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface InputToken {
  surface: string;
  lemma: string;
  unmapped?: true;
}

export interface InputSource {
  name: "tatoeba" | "youtube" | "graded";
  url: string;
  sentenceIds?: Record<string, string>;
  authors?: Record<string, string | null>;
  title?: string;
  channel?: string | null;
}

export interface InputMedia {
  videoId: string;
  start: number;
  end: number;
}

export interface InputItem {
  id: string;
  lang: string;
  kind: InputKind;
  text: string;
  tokens: InputToken[];
  lemmas: string[];
  translation?: string;
  audioUrl?: string;
  media?: InputMedia;
  cefr?: Cefr;
  source: InputSource;
  license: string;
}

export interface InputUnit {
  id: string;
  kind: "episode" | "sentence_set" | "passage";
  itemIds: string[];
  targetLemmas: string[];
  tokenCount: number;
  credit: string;
  credits: InputCredit[];
  band?: number;
  coverage?: number;
}

export interface InputCredit {
  url: string;
  author: string | null;
  sentenceId?: string;
  lang?: string;
}

export interface LemmaCoverage {
  tokens: number;
  tokensMapped: number;
  tokenShare: number;
  types: number;
  typesMapped: number;
  typeShare: number;
}

export interface InputBundle {
  format: "polingual-input";
  version: 1;
  lang: string;
  attribution: string[];
  coverage: LemmaCoverage;
  tatoebaItems: number;
  tatoebaIdsMatched: number;
  items: InputItem[];
  units: InputUnit[];
}

export interface InputManifest {
  format: "polingual-input";
  inputs: Record<string, unknown>;
  bandBase?: string | null;
  langTags?: "BCP-47";
  langs: Record<
    string,
    {
      file: string;
      items: number;
      units: number;
      coverage: LemmaCoverage;
      tatoebaItems: number;
      tatoebaIdsMatched: number;
      tag?: string;
      graded?: { files: Record<string, { file: string; units: number; items: number; bytes: number }[]> };
    }
  >;
}

export interface InputBandFile {
  format: "polingual-input-band";
  version: 1;
  lang: string;
  band: number;
  part: number;
  parts: number;
  attribution: string[];
  items: (Omit<InputItem, "tokens" | "lemmas"> & { tok: ([number, number] | [number, number, string])[] })[];
  units: InputUnit[];
}

export const MIN_UNIT_TOKENS = 40;
export const INPUT_BASE = "/input";

export function bundleUrl(manifest: InputManifest, lang: string): string | null {
  const entry = manifest.langs[lang];
  return entry ? `${INPUT_BASE}/${entry.file}` : null;
}

const LOOPBACK = /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)(?::\d+)?(?:\/|$)/i;

export function isLoopback(url: string): boolean {
  return LOOPBACK.test(url);
}

export function bandUrls(
  manifest: InputManifest,
  lang: string,
  band: number,
  base: string | null | undefined = process.env.NEXT_PUBLIC_POLINGUAL_INPUT_BASE || manifest.bandBase,
  production: boolean = process.env.NODE_ENV === "production",
): string[] {
  const parts = manifest.langs[lang]?.graded?.files[String(band)];
  if (!parts || !base || (production && isLoopback(base))) return [];
  return parts.map((p) => `${base.replace(/\/$/, "")}/${p.file}`);
}
