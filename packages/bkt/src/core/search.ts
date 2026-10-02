import { rankCanon, type CanonSearchParams, type ClaimIndexEntry } from "../../../../src/lib/canon-rank";
import type { CanonPack, PackPassage } from "../pack/canon";

export const SEARCH_DEFAULT_LIMIT = 20;
export const EXCERPT_CHARS = 400;
export const CANON_SITE = "https://bucket.foundation";

export interface CanonSource {
  index(): ClaimIndexEntry[];
  evidenceCount(id: number): number;
  passages(id: number): PackPassage[];
}

export interface SearchHit {
  id: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  score: number;
  url: string;
  excerpt: string;
  evidence: number;
}

export type SearchResult = { ok: true; mode: string; results: SearchHit[] } | { ok: false; status: number; code: string; message: string };

export interface Excerpt {
  id: number;
  branch: string;
  concept: string;
  title: string;
  text: string;
  url: string;
  evidence: PackPassage[];
}

const NO_VEC = new Float32Array(0);

export const excerptUrl = (e: { concept: string; slug: string }) => `${CANON_SITE}/excerpts/${e.concept}/${e.slug}`;

export function packCanon(pack: CanonPack): CanonSource {
  const index = pack.excerpts.map((e) => ({ rowid: e.rowid, branch: e.branch, concept: e.concept, slug: e.slug, title: e.title, text: e.text, path: e.path, vec: NO_VEC }));
  const passages = (id: number) => pack.evidence[String(id)] ?? [];
  return { index: () => index, evidenceCount: (id) => passages(id).length, passages };
}

export function searchParams(q: string, o: { limit?: number; branch?: string } = {}): CanonSearchParams {
  return { q: q.trim().slice(0, 200), qvec: null, topK: o.limit ?? SEARCH_DEFAULT_LIMIT, tier: "all", branch: o.branch ?? "", mode: "lexical" };
}

export function searchCanon(src: CanonSource, p: CanonSearchParams, o: { matchedOnly?: boolean } = {}): SearchResult {
  const found = rankCanon({ loadIndex: () => src.index(), decodeQVec: () => null }, { ...p, qvec: null });
  if (!found.ok) return found;
  return {
    ok: true,
    mode: found.mode,
    results: found.results.filter((r) => !o.matchedOnly || r.score > 0).map((r) => ({
      id: r.entry.rowid,
      branch: r.entry.branch,
      concept: r.entry.concept,
      slug: r.entry.slug,
      title: r.entry.title,
      score: r.score,
      url: excerptUrl(r.entry),
      excerpt: r.entry.text.slice(0, EXCERPT_CHARS),
      evidence: src.evidenceCount(r.entry.rowid),
    })),
  };
}

export function showExcerpt(src: CanonSource, id: number): Excerpt | null {
  if (!Number.isInteger(id)) return null;
  const e = src.index().find((x) => x.rowid === id);
  if (!e) return null;
  return { id: e.rowid, branch: e.branch, concept: e.concept, title: e.title, text: e.text, url: excerptUrl(e), evidence: src.passages(id) };
}

export function branchLabel(branch: string): string {
  return branch.replace(/^\d+-/, "").replace(/[-_]+/g, " ");
}

export function parseId(raw: string): number | null {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

const cell = (v: string | number) => String(v).replace(/[\t\r\n]+/g, " ");

export function searchTsv(hits: SearchHit[]): string {
  return hits.map((h) => [h.id, h.score.toFixed(3), h.branch, h.title, h.evidence, h.url].map(cell).join("\t")).join("\n");
}

export function searchText(hits: SearchHit[]): string {
  const width = Math.max(...hits.map((h) => String(h.id).length));
  return hits.map((h) => `${String(h.id).padStart(width)}  ${h.title}  (${branchLabel(h.branch)}, ${h.evidence} ${h.evidence === 1 ? "passage" : "passages"})`).join("\n");
}

export function excerptText(e: Excerpt): string {
  const lines = [e.title, branchLabel(e.branch), "", e.text, "", e.evidence.length ? "Evidence:" : "No evidence passages."];
  e.evidence.forEach((p, n) => {
    lines.push("", `${n + 1}. ${p.title}${p.author ? `, ${p.author}` : ""}`, `   ${p.text.replace(/\s+/g, " ")}`);
    if (p.url) lines.push(`   ${p.url}`);
  });
  lines.push("", e.url);
  return lines.join("\n");
}
