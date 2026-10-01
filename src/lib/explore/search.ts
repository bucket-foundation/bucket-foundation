import { idiv } from "./rank-kernel";
import { indexDoc, queryTerms, rank, statsOf, terms, type IndexedDoc, type RankStats } from "./rank";

export type HitType = "excerpt" | "advisor" | "work" | "paper" | "text" | "talk" | "you" | "canon-file";

export const HIT_TYPES: HitType[] = ["excerpt", "advisor", "work", "paper", "text", "talk", "canon-file"];

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
  source?: string;
  license?: string;
  also?: string[];
  fragments?: Fragment[];
}

export interface Fragment {
  id: string;
  text: string;
  url: string;
}

export interface Talk {
  id: string;
  title: string;
}

export interface ExcerptSource {
  branch: string;
  concept: string;
  slug: string;
  title: string;
  text: string;
  score: number;
  year?: number | null;
  talk?: Talk | null;
}

export interface AdvisorSource {
  rank: number;
  name: string;
  field: string;
  text: string;
  year: number | null;
  score: number;
  url: string | null;
  star?: number[];
}

export interface UnifyOptions {
  query: string;
  excerpts: ExcerptSource[];
  advisors: AdvisorSource[];
  sources?: Hit[];
  types?: HitType[];
  topK?: number;
  linksPerHit?: number;
  extraHits?: Hit[];
  stats?: RankStats;
}

export const FRAGMENTS_PER_TALK = 3;
export const TOPIC_WEIGHT_NUM = 19;
export const TOPIC_WEIGHT_DEN = 20;

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

function nearest<T extends { id: string; bag: Set<string> }>(bag: Set<string>, pool: T[], k: number): string[] {
  return pool
    .map((p) => ({ id: p.id, s: similarity(bag, p.bag) }))
    .filter((p) => p.s > 0)
    .sort((x, y) => y.s - x.s || (x.id < y.id ? -1 : 1))
    .slice(0, k)
    .map((p) => p.id);
}

export function rankNormalized<T extends { id: string; raw: number }>(items: T[]): (T & { score: number })[] {
  const sorted = items.slice().sort((x, y) => y.raw - x.raw || (x.id < y.id ? -1 : 1));
  return sorted.map((x, i) => ({ ...x, score: (sorted.length - i) / sorted.length }));
}

const advisorDocs = new WeakMap<AdvisorSource[], IndexedDoc[]>();

function indexAdvisors(advisors: AdvisorSource[]): IndexedDoc[] {
  const hit = advisorDocs.get(advisors);
  if (hit) return hit;
  const docs = advisors.map((a) => indexDoc({ id: advisorId(a), title: "", author: a.name, concept: a.field, body: a.text }));
  advisorDocs.set(advisors, docs);
  return docs;
}

function excerptDoc(e: ExcerptSource): IndexedDoc {
  return indexDoc({ id: excerptId(e), title: e.talk?.title ?? e.title, author: "", concept: e.concept.replace(/-/g, " "), body: e.text });
}

const byScore = <T extends { id: string; score: number }>(a: T, b: T) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function unify(opts: UnifyOptions): Hit[] {
  const q = queryTerms(opts.query);
  const types = new Set(opts.types?.length ? opts.types : HIT_TYPES);
  const topK = opts.topK ?? 30;
  const k = opts.linksPerHit ?? 3;
  const fragments = opts.excerpts
    .filter((e) => !q.length || e.score > 0)
    .map((e) => ({ e, id: excerptId(e), score: Math.round(e.score), bag: tokens(`${e.title} ${e.text}`) }))
    .sort(byScore);

  const talks = new Map<string, typeof fragments>();
  for (const f of fragments) {
    const key = f.e.talk?.id ? `talk:${f.e.talk.id}` : f.id;
    const group = talks.get(key);
    if (group) group.push(f);
    else talks.set(key, [f]);
  }
  const excerpts = Array.from(talks.values()).map((group) => ({ ...group[0], group }));

  const advisorIndex = indexAdvisors(opts.advisors);
  const stats = opts.stats ?? statsOf([...advisorIndex, ...opts.excerpts.map(excerptDoc)]);
  const advisorById = new Map(opts.advisors.map((a) => [advisorId(a), a]));
  const advisors = rank(opts.query, advisorIndex, stats).map((s) => {
    const a = advisorById.get(s.doc.id)!;
    return { a, id: s.doc.id, score: s.score, bag: tokens(`${a.name} ${a.field} ${a.text}`) };
  });

  const links = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    if (!links.has(from)) links.set(from, new Set());
    links.get(from)!.add(to);
  };
  for (const a of advisors) {
    for (const id of nearest(a.bag, excerpts, k)) {
      link(a.id, id);
      link(id, a.id);
    }
  }
  for (const e of excerpts) {
    for (const id of nearest(e.bag, advisors, 1)) {
      link(e.id, id);
      link(id, e.id);
    }
  }

  const sourceHits: Hit[] = (opts.sources ?? []).map((h) => {
    const bag = tokens(`${h.title} ${h.text}`);
    const near = [...nearest(bag, excerpts, 2), ...nearest(bag, advisors, 1)];
    for (const id of near) link(id, h.id);
    return { ...h, links: near };
  });

  const hits: Hit[] = [...sourceHits];
  for (const x of excerpts) {
    hits.push({
      id: x.id,
      type: "excerpt",
      title: x.e.talk?.title ?? x.e.title ?? x.e.slug,
      subtitle: `${x.e.branch.replace(/^\d+-/, "")} · ${x.e.concept.replace(/-/g, " ")}`,
      text: x.e.text.slice(0, 400),
      score: x.score,
      branch: x.e.branch,
      year: x.e.year ?? null,
      url: `/excerpts/${x.e.concept}/${x.e.slug}`,
      links: Array.from(links.get(x.id) ?? []),
      also: x.group.slice(1).map((f) => f.id),
      fragments: x.group.slice(0, FRAGMENTS_PER_TALK).map((f) => ({ id: f.id, text: f.e.text.slice(0, 200), url: `/excerpts/${f.e.concept}/${f.e.slug}` })),
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
      links: Array.from(links.get(x.id) ?? []),
    });
  }
  const works = new Map<string, { e: ExcerptSource; ids: string[]; score: number }>();
  for (const x of fragments) {
    const key = `${x.e.branch}/${x.e.concept}`;
    const w = works.get(key);
    if (w) {
      w.ids.push(x.id);
      w.score = Math.max(w.score, x.score);
    } else works.set(key, { e: x.e, ids: [x.id], score: x.score });
  }
  const wanted = new Set(q);
  for (const [key, w] of Array.from(works)) {
    if (q.length && !terms(w.e.concept).some((t) => wanted.has(t))) continue;
    hits.push({
      id: `work:${key}`,
      type: "work",
      title: w.e.concept.replace(/-/g, " "),
      subtitle: `${w.e.branch.replace(/^\d+-/, "")} · ${w.ids.length} excerpt${w.ids.length === 1 ? "" : "s"}`,
      text: "",
      score: idiv(w.score * TOPIC_WEIGHT_NUM, TOPIC_WEIGHT_DEN),
      branch: w.e.branch,
      year: w.e.year ?? null,
      url: `/excerpts/${w.e.concept}`,
      links: w.ids,
    });
  }
  return [...hits, ...(opts.extraHits ?? [])]
    .filter((h) => types.has(h.type))
    .sort(byScore)
    .slice(0, topK);
}
