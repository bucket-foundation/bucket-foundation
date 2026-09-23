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

export interface IndependenceAssessment {
  independent: boolean;
  reason: string;
}

function normalizedPublisher(publisher: string | undefined): string | null {
  const v = (publisher || "").trim().toLowerCase();
  return v || null;
}

function hostnameOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

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
