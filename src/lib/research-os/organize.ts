const STOPWORDS = new Set([
  "the",
  "and",
  "that",
  "this",
  "with",
  "from",
  "have",
  "into",
  "your",
  "their",
  "because",
  "which",
  "about",
  "there",
  "these",
  "those",
  "some",
  "than",
  "then",
  "what",
  "when",
  "where",
]);

function significantWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export function isGroundedInNotes(item: string, sourceText: string): boolean {
  const trimmed = item.trim();
  if (!trimmed) return false;
  const words = significantWords(trimmed);
  if (words.length === 0) return sourceText.toLowerCase().includes(trimmed.toLowerCase());
  const sourceWords = new Set(significantWords(sourceText));
  return words.every((w) => sourceWords.has(w));
}

export interface OrganizeInput {
  claim: string;
  evidenceNotes: string;
  sourceNotes: string;
}

export interface OrganizeModelOutput {
  claim?: unknown;
  evidence?: unknown;
  sources?: unknown;
}

export interface OrganizeResult {
  claim: string;
  evidence: string[];
  sources: string[];
  abstained: boolean;
}

export function groundOrganizeResult(parsed: OrganizeModelOutput | null, input: OrganizeInput): OrganizeResult {
  const hadInput = Boolean(input.claim.trim() || input.evidenceNotes.trim() || input.sourceNotes.trim());

  const rawClaim = typeof parsed?.claim === "string" ? parsed.claim.trim() : "";
  const claim = input.claim.trim() && rawClaim && isGroundedInNotes(rawClaim, input.claim) ? rawClaim : "";

  const rawEvidence = Array.isArray(parsed?.evidence) ? (parsed!.evidence as unknown[]) : [];
  const evidence = input.evidenceNotes.trim()
    ? rawEvidence.filter((e): e is string => typeof e === "string" && isGroundedInNotes(e, input.evidenceNotes))
    : [];

  const rawSources = Array.isArray(parsed?.sources) ? (parsed!.sources as unknown[]) : [];
  const sources = input.sourceNotes.trim()
    ? rawSources.filter((s): s is string => typeof s === "string" && isGroundedInNotes(s, input.sourceNotes))
    : [];

  const abstained = hadInput && !claim && evidence.length === 0 && sources.length === 0;
  return { claim, evidence, sources, abstained };
}
