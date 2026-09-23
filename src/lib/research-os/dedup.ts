export type DedupNode = { id: string; slug: string; title: string; branch: string; kind: string; tier: number; degree: number };
export type Refusal = { fromSlug: string; toSlug: string; text: string };

export type MergeReason = "same_title" | "near_title" | "verifier_duplicate";

export interface MergeCandidate {
  keepSlug: string;
  dropSlug: string;
  reason: MergeReason;
  similarity: number;
  evidence: string;
}

const STOP = new Set(["the", "a", "an", "of", "and", "in", "on", "for", "to", "its", "with"]);

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((t) => t && !STOP.has(t))
      .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t)),
  );
}

export function titleSimilarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (x.size === 0 || y.size === 0) return 0;
  let inter = 0;
  x.forEach((t) => {
    if (y.has(t)) inter += 1;
  });
  return inter / (x.size + y.size - inter);
}

export function chooseKeeper(a: DedupNode, b: DedupNode): [DedupNode, DedupNode] {
  if (a.degree !== b.degree) return a.degree > b.degree ? [a, b] : [b, a];
  if (a.tier !== b.tier) return a.tier < b.tier ? [a, b] : [b, a];
  return a.slug < b.slug ? [a, b] : [b, a];
}

const DUPLICATE_WORDS = /\b(same (concept|idea|statement|principle|thing)|duplicate|listed twice|listed in another branch|identical|restates)\b/i;

export const NEAR_TITLE_MIN = 0.8;

export function findMergeCandidates(nodes: DedupNode[], refusals: Refusal[] = []): MergeCandidate[] {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const out = new Map<string, MergeCandidate>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const add = (a: DedupNode, b: DedupNode, reason: MergeReason, similarity: number, evidence: string) => {
    const k = key(a.slug, b.slug);
    if (out.has(k)) return;
    const [keep, drop] = chooseKeeper(a, b);
    out.set(k, { keepSlug: keep.slug, dropSlug: drop.slug, reason, similarity: Math.min(1, Math.max(similarity, 0.01)), evidence });
  };

  for (const r of refusals) {
    if (!DUPLICATE_WORDS.test(r.text)) continue;
    const a = bySlug.get(r.fromSlug);
    const b = bySlug.get(r.toSlug);
    if (a && b && a.slug !== b.slug) add(a, b, "verifier_duplicate", Math.max(titleSimilarity(a.title, b.title), 0.5), r.text.slice(0, 400));
  }

  const byNorm = new Map<string, DedupNode[]>();
  for (const n of nodes) {
    const k = normalizeTitle(n.title);
    if (!k) continue;
    byNorm.set(k, [...(byNorm.get(k) ?? []), n]);
  }
  byNorm.forEach((group) => {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        add(group[i], group[j], "same_title", 1, `Both titled "${group[i].title}", in ${group[i].branch} and ${group[j].branch}.`);
  });

  const withTokens = nodes.map((n) => ({ n, t: tokens(n.title) })).filter((x) => x.t.size >= 2);
  for (let i = 0; i < withTokens.length; i++) {
    for (let j = i + 1; j < withTokens.length; j++) {
      const a = withTokens[i].n;
      const b = withTokens[j].n;
      if (normalizeTitle(a.title) === normalizeTitle(b.title)) continue;
      const s = titleSimilarity(a.title, b.title);
      if (s >= NEAR_TITLE_MIN) add(a, b, "near_title", s, `"${a.title}" (${a.branch}) and "${b.title}" (${b.branch}) share ${Math.round(s * 100)}% of their words.`);
    }
  }
  return Array.from(out.values()).sort((x, y) => y.similarity - x.similarity || x.keepSlug.localeCompare(y.keepSlug));
}

export function splitBundle(title: string): string[] {
  const parts = title
    .replace(/\([^)]*\)/g, " ")
    .split(/\s*,\s*|\s+and\s+|\s*&\s*/i)
    .map((p) => p.trim())
    .filter((p) => normalizeTitle(p).length > 0);
  return parts.length >= 2 ? parts : [];
}

export const PART_MATCH_MIN = 0.5;

export function matchBundleParts(title: string, nodes: DedupNode[]): { part: string; slug: string; nodeTitle: string; similarity: number }[] {
  const out: { part: string; slug: string; nodeTitle: string; similarity: number }[] = [];
  for (const part of splitBundle(title)) {
    let best: { n: DedupNode; s: number } | null = null;
    for (const n of nodes) {
      const s = normalizeTitle(part) === normalizeTitle(n.title) ? 1 : titleSimilarity(part, n.title);
      if (s >= PART_MATCH_MIN && (!best || s > best.s)) best = { n, s };
    }
    if (best) out.push({ part, slug: best.n.slug, nodeTitle: best.n.title, similarity: Math.round(best.s * 1000) / 1000 });
  }
  return out;
}
