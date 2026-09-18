/**
 * One search over the graph: title, summary, and slug matches ranked by
 * where the query lands, filtered to what the viewer may see. Pure ranking
 * here; the route loads candidates.
 */
export interface SearchNode {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  branch: string;
  summary: string | null;
  visibility?: string | null;
  ownerId?: string | null;
}

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Score a node for a query: whole-phrase title match first, then title tokens, then summary tokens; 0 when nothing matches. */
export function scoreNode(n: SearchNode, q: string, tokens: string[]): number {
  const title = n.title.toLowerCase();
  const summary = (n.summary ?? "").toLowerCase();
  const qq = q.toLowerCase().trim();
  let score = 0;
  if (qq && title === qq) score += 100;
  else if (qq && title.includes(qq)) score += 60;
  else if (qq && summary.includes(qq)) score += 25;
  for (const t of tokens) {
    if (title.includes(t)) score += 12;
    else if (n.slug.includes(t)) score += 8;
    else if (summary.includes(t)) score += 4;
  }
  if (score > 0) score += Math.max(0, 6 - n.tier);
  return score;
}

export function rankNodes(nodes: SearchNode[], q: string, limit = 20): (SearchNode & { score: number })[] {
  const tokens = tokenize(q);
  if (!q.trim() || tokens.length === 0) return [];
  return nodes
    .map((n) => ({ ...n, score: scoreNode(n, q, tokens) }))
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
