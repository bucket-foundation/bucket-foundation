import { byteLength, byteSlice, normalizeText, OffsetError, sha256Hex } from "../evidence/text";
import type { BronzeRecord } from "./bronze";

export const HIDE_BELOW = 0.5;
export const SHOW_AT = 0.75;

export type SilverKind = "claim" | "term" | "edge_candidate";
export type SilverStatus = "candidate" | "proposed" | "promoted" | "rejected" | "withdrawn";
export type Band = "hidden" | "uncertain" | "shown";

export function band(confidence: number): Band {
  if (confidence < HIDE_BELOW) return "hidden";
  if (confidence < SHOW_AT) return "uncertain";
  return "shown";
}

export function combineConfidence(parts: Record<string, number>): number {
  const values = Object.values(parts);
  if (values.length === 0) throw new Error("a confidence needs at least one part");
  for (const v of values) if (!Number.isFinite(v) || v < 0 || v > 1) throw new Error(`confidence part ${v} is outside 0 to 1`);
  return Math.min(...values);
}

export interface SilverProposal {
  slug: string;
  kind: string;
  title: string;
  branch: string;
}

export interface SilverDraft {
  source_id: string;
  source_revision: string;
  kind: SilverKind;
  span_start: number;
  span_end: number;
  locator: string | null;
  text_hash: string;
  text: string | null;
  parser: string;
  parser_revision: string;
  confidence: number;
  confidence_parts: Record<string, number>;
  proposal: SilverProposal;
  subject: string;
}

export function locateSpan(text: string, needle: string): { start: number; end: number } | null {
  const n = normalizeText(needle).trim();
  if (!n) return null;
  const at = text.indexOf(n);
  if (at < 0) return null;
  const start = byteLength(text.slice(0, at));
  return { start, end: start + byteLength(n) };
}

export function silverItem(
  bronze: BronzeRecord,
  span: { start: number; end: number },
  opts: { kind: SilverKind; locator: string | null; parser: string; parserRevision: string; confidenceParts: Record<string, number>; proposal: SilverProposal; subject?: string },
): SilverDraft {
  const slice = byteSlice(bronze.text, span.start, span.end);
  return {
    source_id: bronze.sourceId,
    source_revision: bronze.sourceRevision,
    kind: opts.kind,
    span_start: span.start,
    span_end: span.end,
    locator: opts.locator,
    text_hash: sha256Hex(slice),
    text: bronze.rights.allowIndex ? slice : null,
    parser: opts.parser,
    parser_revision: opts.parserRevision,
    confidence: combineConfidence(opts.confidenceParts),
    confidence_parts: opts.confidenceParts,
    proposal: opts.proposal,
    subject: opts.subject ?? "",
  };
}

export function verifySilver(item: Pick<SilverDraft, "span_start" | "span_end" | "text_hash">, bronzeText: string): boolean {
  try {
    return sha256Hex(byteSlice(bronzeText, item.span_start, item.span_end)) === item.text_hash;
  } catch (e) {
    if (e instanceof OffsetError) return false;
    throw e;
  }
}
