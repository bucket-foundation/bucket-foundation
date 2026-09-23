import { band, type Band } from "./silver";

export interface SilverRow {
  id: string;
  source_id: string;
  kind: string;
  locator: string | null;
  text: string | null;
  text_hash: string;
  confidence: number;
}

export interface AdmissionState {
  allow_index: boolean;
  status: string;
}

export interface PublicSilver {
  id: string;
  sourceId: string;
  kind: string;
  locator: string | null;
  text: string | null;
  textHash: string;
  confidence: number;
  band: Band;
  redacted: boolean;
}

export function textWithheld(admission: AdmissionState | null): boolean {
  return !admission || !admission.allow_index || admission.status === "withdrawn";
}

export function publicSilver(row: SilverRow, admission: AdmissionState | null): PublicSilver {
  const redacted = textWithheld(admission);
  return {
    id: row.id,
    sourceId: row.source_id,
    kind: row.kind,
    locator: redacted ? null : row.locator,
    text: redacted ? null : row.text,
    textHash: row.text_hash,
    confidence: row.confidence,
    band: band(row.confidence),
    redacted,
  };
}

export interface PublicCitation {
  sourceId: string;
  locator: string | null;
}

export function publicCitation(sourceId: string, locator: string | null, admission: AdmissionState | null): PublicCitation {
  return { sourceId, locator: textWithheld(admission) ? null : locator };
}
