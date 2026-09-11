/**
 * Research OS for K-12, faded guidance's worked-example display helpers
 * (bkt-ros ros-14 item 2). The worked examples themselves are authored data
 * on `graph.nodes.worked_example` (GraphNode.workedExample, types.ts),
 * seeded from supabase/seed/research-os-sky-blue.json for the sky-blue
 * path's first six nodes; this file holds only the pure, dependency-free
 * display logic the workspace page and its tests both need, matching this
 * repo's convention that anything a UI has to compute from authored
 * content stays a small, separately-testable function rather than inline
 * JSX (organize.ts, locate.ts's own precedent).
 *
 * Guidance level decides how much of a node's worked example the workspace
 * shows before the learner's own explanation box (GUIDANCE.md): the full
 * text at high, the first half at medium, nothing at low.
 */

/**
 * The "first half" of a worked example's text for medium guidance: whole
 * sentences only (a partial sentence is worse than no partial example, it
 * reads as a typo rather than a deliberate fade), rounded UP to the
 * nearest whole sentence so a 3-sentence example shows 2, not 1 -- medium
 * guidance is "less than high," not "as little as possible."
 *
 * A string with no recognizable sentence boundary (no `.`/`!`/`?`) returns
 * itself unchanged rather than an empty string: there is nothing shorter
 * to cut to without losing the whole idea.
 */
export function firstHalfOfWorkedExample(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentences = trimmed.match(/[^.!?]+[.!?]+(\s+|$)/g);
  if (!sentences || sentences.length === 0) return trimmed;
  const half = Math.max(1, Math.ceil(sentences.length / 2));
  return sentences.slice(0, half).join("").trim();
}
