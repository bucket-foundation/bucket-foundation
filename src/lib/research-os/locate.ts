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
 *
 * Lateral reading (bkt-ros, `learning/research-os/PLAN-REVISION-3.md`
 * section 2c, Wineburg and McGrew 2019, Breakstone and colleagues 2021):
 * findIndependentSources below is Locate's "find another source" mode,
 * given a claim and the source already quoted, surfacing up to three
 * candidate nodes elsewhere in the graph whose own provenance names a
 * different publisher and a different domain than the already-quoted
 * source. Retrieval only, the same substring filter locateHits already
 * uses, plus a provenance comparison computed here in code
 * (assessSourceIndependence): no model call decides independence, so an
 * adversarial claim or a same-publisher candidate can only ever be
 * excluded, never smuggled in as "independent." See
 * `learning/research-os/LATERAL-READING.md`.
 */
import type { GraphNode, Provenance } from "./types";
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

// ---------------------------------------------------------------------------
// Lateral reading: "find another source" (PLAN-REVISION-3.md section 2c)
// ---------------------------------------------------------------------------

export interface IndependenceAssessment {
  independent: boolean;
  /** A short, human-readable reason, always populated on either outcome,
   * so a "same publisher"/"same domain" exclusion and a "different
   * publisher"/"different domain" inclusion are both traceable in a test
   * or a UI without re-deriving the comparison. */
  reason: string;
}

function normalizedPublisher(publisher: string | undefined): string | null {
  const v = (publisher || "").trim().toLowerCase();
  return v || null;
}

/** The registrable host a provenance's own `url` resolves to, lowercased,
 * or null when there is no url or it does not parse. A malformed url
 * (the seed carries none for the two 1871/1869 journal entries, see
 * passages.ts) never throws here, it just carries no domain signal. */
function hostnameOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Whether `candidate`'s own provenance is independent of `quoted`'s
 * (lateral reading's own criterion: a different publisher AND a
 * different domain, per the seed's provenance fields, e.g. Tyndall's
 * Royal Society papers versus Rayleigh's Philosophical Magazine versus
 * NASA Space Place versus Wikipedia). Excluded (not independent) the
 * moment either the publisher or the domain matches, since sharing
 * either one is already a same-source signal (two Wikipedia articles on
 * different pages still share the one publisher this check cares about).
 * A side with no publisher and no url on file (a canon-bridge node, or
 * either of the two 1871 papers passages.ts documents no public-domain
 * transcription for) cannot be judged same as anything, so it reads
 * independent by default, with a reason naming the missing data rather
 * than a false claim of a real comparison.
 */
export function assessSourceIndependence(quoted: Provenance | undefined, candidate: Provenance | undefined): IndependenceAssessment {
  const quotedPublisher = normalizedPublisher(quoted?.publisher);
  const candidatePublisher = normalizedPublisher(candidate?.publisher);
  const quotedDomain = hostnameOf(quoted?.url);
  const candidateDomain = hostnameOf(candidate?.url);

  if (quotedPublisher !== null && candidatePublisher !== null && quotedPublisher === candidatePublisher) {
    return { independent: false, reason: `same publisher (${candidate?.publisher})` };
  }
  if (quotedDomain !== null && candidateDomain !== null && quotedDomain === candidateDomain) {
    return { independent: false, reason: `same domain (${candidateDomain})` };
  }
  if (candidatePublisher && quotedPublisher) {
    return { independent: true, reason: `different publisher (${candidate?.publisher} vs ${quoted?.publisher})` };
  }
  if (candidateDomain && quotedDomain) {
    return { independent: true, reason: `different domain (${candidateDomain} vs ${quotedDomain})` };
  }
  return { independent: true, reason: "no publisher or domain on file for the already-quoted source to compare against" };
}

export interface IndependentSourceCandidate extends LocateHit {
  independenceReason: string;
}

const MAX_INDEPENDENT_SOURCES = 3;

/**
 * Locate's "find another source" mode: every node in `nodes` whose title
 * or summary contains `query` (the same case-insensitive substring test
 * locateHits runs), excluding `quotedSource` itself and every candidate
 * assessSourceIndependence judges NOT independent of it, capped at
 * MAX_INDEPENDENT_SOURCES. Every returned field beyond `independenceReason`
 * is copied straight from the matched node, the same "no synthesized
 * text" contract locateHits already holds; an adversarial `query` can
 * only narrow or empty the result, never fabricate a candidate or an
 * independence verdict.
 */
export function findIndependentSources(
  nodes: Pick<GraphNode, "id" | "slug" | "title" | "kind" | "tier" | "summary" | "provenance">[],
  query: string,
  quotedSource: { id: string; provenance?: Provenance },
): IndependentSourceCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: IndependentSourceCandidate[] = [];
  for (const n of nodes) {
    if (n.id === quotedSource.id) continue;
    if (out.length >= MAX_INDEPENDENT_SOURCES) break;
    const matches = n.title.toLowerCase().includes(q) || (n.summary || "").toLowerCase().includes(q);
    if (!matches) continue;
    const assessment = assessSourceIndependence(quotedSource.provenance, n.provenance);
    if (!assessment.independent) continue;
    out.push({
      nodeId: n.id,
      slug: n.slug,
      title: n.title,
      kind: n.kind,
      tier: n.tier,
      summary: n.summary,
      citation: citationLabel({ title: n.title, provenance: n.provenance }),
      independenceReason: assessment.reason,
    });
  }
  return out;
}
