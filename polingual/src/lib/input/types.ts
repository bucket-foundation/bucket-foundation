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
  items: InputItem[];
  units: InputUnit[];
}

export interface InputManifest {
  format: "polingual-input";
  langs: Record<string, { file: string; items: number; units: number; coverage: LemmaCoverage }>;
}

export const MIN_UNIT_TOKENS = 40;
export const INPUT_BASE = "/input";

export function bundleUrl(manifest: InputManifest, lang: string): string | null {
  const entry = manifest.langs[lang];
  return entry ? `${INPUT_BASE}/${entry.file}` : null;
}
