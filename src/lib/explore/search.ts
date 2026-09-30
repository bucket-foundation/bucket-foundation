import type { Edge, EdgeKind } from "@/lib/stage/record";

export type HitType = "excerpt" | "advisor" | "work";

export const HIT_TYPES: HitType[] = ["excerpt", "advisor", "work"];

export interface Hit {
  id: string;
  type: HitType;
  title: string;
  subtitle: string;
  text: string;
  score: number;
  branch: string;
  year: number | null;
  url: string | null;
  links: string[];
  edges?: Edge[];
}

export interface ExcerptSource {
  branch: string;
  concept: string;
  slug: string;
  title: string;
  text: string;
  score: number;
  year?: number | null;
}

export interface AdvisorSource {
  rank: number;
  name: string;
  field: string;
  text: string;
  year: number | null;
  score: number;
  url: string | null;
}

export interface UnifyOptions {
  query: string;
  excerpts: ExcerptSource[];
  advisors: AdvisorSource[];
  types?: HitType[];
  topK?: number;
  linksPerHit?: number;
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "was", "his", "her", "its", "not", "but", "you", "all", "any", "can", "has", "have", "into", "our", "out", "who", "why", "how", "what"]);

export function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOP.has(w)),
  );
}

export function coverage(q: Set<string>, text: Set<string>): number {
  if (q.size === 0) return 0;
  let n = 0;
  for (const w of Array.from(q)) if (text.has(w)) n++;
  return n / q.size;
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const w of Array.from(a)) if (b.has(w)) n++;
  return n / Math.sqrt(a.size * b.size);
}

export function excerptId(e: Pick<ExcerptSource, "branch" | "concept" | "slug">): string {
  return `excerpt:${e.branch}/${e.concept}/${e.slug}`;
}

export function advisorId(a: Pick<AdvisorSource, "rank">): string {
  return `advisor:${a.rank}`;
}

function nearest<T extends { id: string; bag: Set<string> }>(bag: Set<string>, pool: T[], k: number): { id: string; s: number }[] {
  return pool
    .map((p) => ({ id: p.id, s: similarity(bag, p.bag) }))
    .filter((p) => p.s > 0)
    .sort((x, y) => y.s - x.s || (x.id < y.id ? -1 : 1))
    .slice(0, k);
}

export function rankNormalized<T extends { id: string; raw: number }>(items: T[]): (T & { score: number })[] {
  const sorted = items.slice().sort((x, y) => y.raw - x.raw || (x.id < y.id ? -1 : 1));
  return sorted.map((x, i) => ({ ...x, score: (sorted.length - i) / sorted.length }));
}

export function unify(opts: UnifyOptions): Hit[] {
  const q = tokens(opts.query);
  const types = new Set(opts.types?.length ? opts.types : HIT_TYPES);
  const topK = opts.topK ?? 30;
  const k = opts.linksPerHit ?? 3;
  const excerpts = rankNormalized(
    opts.excerpts.map((e) => ({ e, bag: tokens(`${e.title} ${e.text}`), id: excerptId(e), raw: e.score })),
  );

  const advisors = rankNormalized(
    opts.advisors
      .map((a) => {
        const bag = tokens(`${a.name} ${a.field} ${a.text}`);
        const cov = coverage(q, bag);
        return { a, bag, id: advisorId(a), raw: cov > 0 ? cov * 0.8 + Math.max(0, Math.min(1, a.score)) * 0.2 : 0 };
      })
      .filter((x) => x.raw > 0),
  );

  const edges = new Map<string, Map<string, Edge>>();
  const link = (from: string, to: string, kind: EdgeKind, reason: string, weight: number) => {
    if (!edges.has(from)) edges.set(from, new Map());
    const m = edges.get(from)!;
    if (!m.has(to)) m.set(to, { to, kind, reason, weight });
  };
  const edgesOf = (id: string): Edge[] => Array.from(edges.get(id)?.values() ?? []);
  for (const a of advisors) {
    for (const n of nearest(a.bag, excerpts, k)) {
      link(a.id, n.id, "advises", "shared vocabulary", n.s);
      link(n.id, a.id, "advises", "shared vocabulary", n.s);
    }
  }
  for (const e of excerpts) {
    for (const n of nearest(e.bag, advisors, 1)) {
      link(e.id, n.id, "advises", "shared vocabulary", n.s);
      link(n.id, e.id, "advises", "shared vocabulary", n.s);
    }
  }

  const hits: Hit[] = [];
  for (const x of excerpts) {
    hits.push({
      id: x.id,
      type: "excerpt",
      title: x.e.title || x.e.slug,
      subtitle: `${x.e.branch.replace(/^\d+-/, "")} · ${x.e.concept}`,
      text: x.e.text.slice(0, 400),
      score: x.score,
      branch: x.e.branch,
      year: x.e.year ?? null,
      url: `/excerpts/${x.e.concept}/${x.e.slug}`,
      links: edgesOf(x.id).map((e) => e.to),
      edges: edgesOf(x.id),
    });
  }
  for (const x of advisors) {
    hits.push({
      id: x.id,
      type: "advisor",
      title: x.a.name,
      subtitle: x.a.field,
      text: x.a.text.slice(0, 400),
      score: x.score,
      branch: x.a.field,
      year: x.a.year,
      url: x.a.url,
      links: edgesOf(x.id).map((e) => e.to),
      edges: edgesOf(x.id),
    });
  }
  const works = new Map<string, { e: ExcerptSource; ids: string[]; score: number }>();
  for (const x of excerpts) {
    const key = `${x.e.branch}/${x.e.concept}`;
    const w = works.get(key);
    if (w) {
      w.ids.push(x.id);
      w.score = Math.max(w.score, x.score);
    } else works.set(key, { e: x.e, ids: [x.id], score: x.score });
  }
  for (const [key, w] of Array.from(works)) {
    hits.push({
      id: `work:${key}`,
      type: "work",
      title: w.e.concept,
      subtitle: `${w.e.branch.replace(/^\d+-/, "")} · ${w.ids.length} excerpt${w.ids.length === 1 ? "" : "s"}`,
      text: "",
      score: w.score * 0.95,
      branch: w.e.branch,
      year: w.e.year ?? null,
      url: `/excerpts/${w.e.concept}`,
      links: w.ids,
      edges: w.ids.map((id) => ({ to: id, kind: "same-branch" as const, reason: `excerpt of ${key}`, weight: 1 })),
    });
  }
  return hits
    .filter((h) => types.has(h.type))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
    .slice(0, topK);
}
