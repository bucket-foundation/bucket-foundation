import { genomeSpace } from "../dna-space";
import type { Dataset } from "../space";
import { summarize, type GenomeSummary } from "./parse";

export const MAX_GENOME_BYTES = 100 * 1024 * 1024;

export interface GenomeRequest {
  token: number;
  file?: Pick<File, "size" | "text">;
  text?: string;
  space?: { id: string; label: string };
}

export type GenomeReply =
  | { token: number; ok: true; summary: GenomeSummary }
  | { token: number; ok: false; error: string };

export type SpaceReply =
  | { token: number; ok: true; dataset: Dataset }
  | { token: number; ok: false; error: string };

export function sizeError(bytes: number): string | null {
  if (bytes <= MAX_GENOME_BYTES) return null;
  const mb = (n: number) => Math.round(n / (1024 * 1024));
  return `File is ${mb(bytes)} MB. The limit is ${mb(MAX_GENOME_BYTES)} MB; export a smaller raw data file.`;
}

export async function runGenomeJob(req: GenomeRequest): Promise<GenomeReply> {
  try {
    if (req.file) {
      const tooBig = sizeError(req.file.size);
      if (tooBig) return { token: req.token, ok: false, error: tooBig };
    }
    const text = req.text ?? (req.file ? await req.file.text() : "");
    const tooBig = sizeError(text.length);
    if (tooBig) return { token: req.token, ok: false, error: tooBig };
    return { token: req.token, ok: true, summary: summarize(text) };
  } catch (err) {
    return { token: req.token, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runSpaceJob(req: GenomeRequest): Promise<SpaceReply> {
  try {
    if (!req.space) return { token: req.token, ok: false, error: "no data set name" };
    if (req.file) {
      const tooBig = sizeError(req.file.size);
      if (tooBig) return { token: req.token, ok: false, error: tooBig };
    }
    const text = req.text ?? (req.file ? await req.file.text() : "");
    const tooBig = sizeError(text.length);
    if (tooBig) return { token: req.token, ok: false, error: tooBig };
    return { token: req.token, ok: true, dataset: genomeSpace(text, req.space.id, req.space.label) };
  } catch (err) {
    return { token: req.token, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export class ParseTokens {
  private current = 0;

  next(): number {
    return ++this.current;
  }

  cancel(): void {
    this.current++;
  }

  isCurrent(token: number): boolean {
    return token === this.current;
  }
}
