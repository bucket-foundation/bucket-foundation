/**
 * Research OS for K-12, the Organize tool's contract enforcement (bkt-ros
 * ros-04, "tool contract enforcement server-side"). Organize's system
 * prompt (src/app/api/research-os/workspace/route.ts) already tells the
 * model "you NEVER add a fact, number, or claim that is not already
 * present" in the learner's own notes, but until this file, nothing in
 * code checked that -- the S7 "verified in code, not just the prompt"
 * floor every other tool in this package meets (grounding.ts's citation
 * filter, this same rule applied to Check) did not yet cover Organize.
 *
 * groundOrganizeResult is the enforcement: every claim/evidence/source item
 * the model returns is kept only if it shares enough vocabulary with the
 * learner's own combined notes to be a trim of something they wrote, never
 * a wholesale invention. An item that fails the check is dropped, not
 * corrected or replaced -- Organize relabels the learner's own words or it
 * abstains on that item, per task item 2's "never a rewritten explanation"
 * rule extended to Organize's own "never adds prose."
 */

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

/** Lowercased, punctuation-stripped words of length >= 4, stopwords
 * removed: the "significant words" a groundedness check compares against.
 * Short and common words are excluded so overlap isn't inflated by
 * function words neither the notes nor the model's output can avoid. */
function significantWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * True when `item` is grounded in `sourceText`: every significant word in
 * `item` appears somewhere in `sourceText`, OR (for a short item, too few
 * significant words for the overlap check to mean anything) `item` itself
 * is a substring of `sourceText`. An item with zero significant words (all
 * stopwords, or empty) is never grounded: there is nothing to check it
 * against, so it is treated the same as an unsupported claim.
 */
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
  /** True when every field ended up empty after grounding, so the caller
   * (and a test) can tell "the model returned nothing usable" apart from
   * "the learner's own notes were empty." Mirrors Check's `abstained`. */
  abstained: boolean;
}

/**
 * Sanitizes one model response against the learner's own input, field by
 * field: `claim` is checked against `input.claim` alone, `evidence`
 * entries against `input.evidenceNotes` alone, `sources` entries against
 * `input.sourceNotes` alone. An empty input field forces its output field
 * empty outright (hard rule 4, "if a field is empty in the input, return
 * an empty result for it and do not fabricate content to fill it"), so a
 * model that invents a claim from evidence notes when the claim field was
 * left blank gets nothing through, regardless of how well-grounded that
 * invented claim looks against the OTHER fields. Non-string array entries
 * are dropped outright. `abstained` is true when nothing survived AND the
 * learner had provided at least one non-empty field (a model that returned
 * nothing usable from real input, distinct from real input being empty).
 */
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
