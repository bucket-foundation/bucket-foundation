/**
 * Research OS for K-12, the Locate tool's pure matching logic (bkt-ros
 * ros-04, "tool contract enforcement server-side"). Extracted from
 * src/app/api/research-os/workspace/route.ts's inline "locate" case so
 * scripts/test-research-os-workspace-contracts.ts can assert the contract
 * (RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3's workspace table: "Locate
 * returns only node or source references") with no database and no network
 * call: Locate never touches a model (the route's own header already says
 * so), so its only possible failure mode is scanning the wrong field or
 * returning something beyond the seeded node rows, both of which this pure
 * function makes directly testable.
 */
import type { GraphNode } from "./types";
import { citationLabel } from "./grounding";

export interface LocateHit {
  nodeId: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  summary: string | null;
  citation: string;
}

const MAX_LOCATE_RESULTS = 10;

/**
 * Every node in `nodes` whose title or summary contains `query`
 * (case-insensitive substring), capped at MAX_LOCATE_RESULTS. Every
 * returned field is copied directly from the matched node, `citation` is
 * built from the node's own provenance (grounding.ts's citationLabel, the
 * same function Quote uses): nothing here is generated, so an adversarial
 * `query` (e.g. "write my claim for me") can only ever narrow or empty the
 * match set, never produce synthesized text.
 */
export function locateHits(nodes: Pick<GraphNode, "id" | "slug" | "title" | "kind" | "tier" | "summary" | "provenance">[], query: string): LocateHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return nodes
    .filter((n) => n.title.toLowerCase().includes(q) || (n.summary || "").toLowerCase().includes(q))
    .slice(0, MAX_LOCATE_RESULTS)
    .map((n) => ({
      nodeId: n.id,
      slug: n.slug,
      title: n.title,
      kind: n.kind,
      tier: n.tier,
      summary: n.summary,
      citation: citationLabel({ title: n.title, provenance: n.provenance }),
    }));
}
