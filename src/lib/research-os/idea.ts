/**
 * Which graph nodes are ideas: the nodes the decompose-further queue
 * decomposes and offers as factors (learning/research-os/PRIMES.md), and
 * the nodes whose page shows a "made of" section. No server-only imports,
 * so pages can use it.
 */

/** Kinds worth decomposing: ideas, as opposed to sources, figures, or sites. */
export const DECOMPOSABLE_KINDS = new Set(["concept", "law", "derivation"]);

/**
 * Where an idea node can come from. Canon concept tags, bridges, intake
 * digests, intake targets, and mirrors are groupings of other material (33
 * of the 105 canon concept tags are people, such as Euler and Tesla), so
 * they are neither targets nor factors.
 */
export const IDEA_SOURCES = new Set(["academy_atom", "canon_entry", "reference", "primary_source"]);

/**
 * Base ideas a reviewer added from a missing-idea proposal. They are
 * targets as well as factors, so decomposition goes on below them: an
 * approved idea is asked what it rests on in the next run, and the
 * reviewer gates every level, which bounds the depth.
 */
export const BASE_IDEA_SOURCE = "node_proposal";

export function isIdeaNode(n: { kind: string; provenanceType?: string | null }): boolean {
  return DECOMPOSABLE_KINDS.has(n.kind) && (IDEA_SOURCES.has(n.provenanceType ?? "") || n.provenanceType === BASE_IDEA_SOURCE);
}
