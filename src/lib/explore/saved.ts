import type { Hit } from "./search";

export const SAVED_KEY = "bucket.explore.saved.v1";
export const SAVED_VERSION = 1;
export const SAVED_LIMIT = 500;
export const CITE_ORIGIN = "https://www.bucket.foundation";
export const NO_AUTHOR = "Author not listed";
export const NO_YEAR = "year not listed";

export type SavedKind = "paper" | "book" | "text" | "talk" | "excerpt" | "work" | "canon-file" | "canon-entry";

export interface SavedItem {
  id: string;
  kind: SavedKind;
  title: string;
  authors: string;
  year: number | null;
  citation: string;
  url: string | null;
  licence?: string;
  savedAt: string;
}

export interface SavedState {
  v: typeof SAVED_VERSION;
  items: SavedItem[];
  noticeSeen: boolean;
}

export interface CiteFields {
  id: string;
  kind: SavedKind;
  title: string;
  authors: string;
  year: number | null;
  url: string | null;
  publisher: string;
  licence?: string;
}

export const EMPTY_SAVED: SavedState = { v: SAVED_VERSION, items: [], noticeSeen: false };

const KINDS: SavedKind[] = ["paper", "book", "text", "talk", "excerpt", "work", "canon-file", "canon-entry"];
const DOI = /10\.\d{4,9}\/[^\s"<>]+/;

export function doiOf(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const m = c ? DOI.exec(c) : null;
    if (m) return m[0].replace(/[.,;)]+$/, "");
  }
  return null;
}

export function absoluteUrl(url: string | null, origin = CITE_ORIGIN): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? origin + url : null;
}

export function yearLabel(year: number | null): string {
  if (year === null) return NO_YEAR;
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

export function hitAuthors(hit: Pick<Hit, "subtitle" | "source" | "branch" | "type">): string {
  if (hit.type !== "paper" && hit.type !== "text" && hit.type !== "talk") return "";
  const label = hit.source ?? hit.branch;
  const tail = ` · ${label}`;
  if (label && hit.subtitle.endsWith(tail)) return hit.subtitle.slice(0, -tail.length).trim();
  return "";
}

export function hitKind(hit: Pick<Hit, "type" | "source">): SavedKind | null {
  if (hit.type === "advisor" || hit.type === "you") return null;
  if (hit.type === "text") return hit.source === "Gutenberg" ? "book" : "text";
  return hit.type;
}

export function citeFieldsFromHit(hit: Hit): CiteFields | null {
  const kind = hitKind(hit);
  if (!kind) return null;
  const doi = doiOf(hit.url, hit.id.startsWith("paper:d/") ? hit.id : null);
  const canon = kind === "excerpt" || kind === "work" || kind === "canon-file";
  return {
    id: hit.id,
    kind,
    title: hit.title,
    authors: hitAuthors(hit),
    year: hit.year,
    url: doi ? `https://doi.org/${doi}` : absoluteUrl(hit.url),
    publisher: canon ? "Bucket Foundation canon" : hit.source ?? "",
    licence: hit.license,
  };
}

export function markerCiteFields(m: { id: string; title: string; year: number | null; path: string | null; excerpt: boolean }): CiteFields {
  return {
    id: m.excerpt && m.path ? `excerpt:${m.path}` : `canon:${m.id}`,
    kind: m.excerpt ? "excerpt" : "canon-entry",
    title: m.title,
    authors: "",
    year: m.year,
    url: absoluteUrl(m.path),
    publisher: "Bucket Foundation canon",
  };
}

export function plainCitation(f: Pick<CiteFields, "title" | "authors" | "year" | "url" | "publisher">): string {
  const parts = [`${f.authors || NO_AUTHOR} (${yearLabel(f.year)}).`, `${f.title.replace(/[.\s]+$/, "")}.`];
  if (f.publisher) parts.push(`${f.publisher}.`);
  if (f.url) parts.push(f.url);
  return parts.join(" ");
}

export function buildSavedItem(f: CiteFields, now: Date): SavedItem {
  const item: SavedItem = {
    id: f.id,
    kind: f.kind,
    title: f.title,
    authors: f.authors,
    year: f.year,
    citation: plainCitation(f),
    url: f.url,
    savedAt: now.toISOString(),
  };
  if (f.licence) item.licence = f.licence;
  return item;
}

export function savedItemFromHit(hit: Hit, now: Date): SavedItem | null {
  const f = citeFieldsFromHit(hit);
  return f ? buildSavedItem(f, now) : null;
}

function bibEscape(s: string): string {
  return s.replace(/[\\{}]/g, "").replace(/([&%$#_])/g, "\\$1");
}

export function bibKey(item: Pick<SavedItem, "authors" | "year" | "title">): string {
  const word = (s: string) => (/[A-Za-z]{2,}/.exec(s.normalize("NFKD").replace(/[̀-ͯ]/g, ""))?.[0] ?? "").toLowerCase();
  const first = item.authors.split(/,|;| et al\.?| and /)[0] ?? "";
  const names = first.trim().split(/\s+/);
  const surname = names[names.length - 1] ?? "";
  return [word(surname) || "anon", item.year === null ? "nd" : String(Math.abs(item.year)), word(item.title) || "untitled"].join("");
}

export function bibtex(item: SavedItem): string {
  const type = item.kind === "paper" ? "article" : item.kind === "book" ? "book" : "misc";
  const doi = doiOf(item.url);
  const fields: [string, string][] = [["title", item.title]];
  if (item.authors) fields.push(["author", item.authors]);
  if (item.year !== null) fields.push(["year", yearLabel(item.year)]);
  if (doi) fields.push(["doi", doi]);
  if (item.url) fields.push(["url", item.url]);
  if (item.licence) fields.push(["note", item.licence]);
  const body = fields.map(([k, v]) => `  ${k} = {${k === "url" || k === "doi" ? v.replace(/[{}]/g, "") : bibEscape(v)}}`).join(",\n");
  return `@${type}{${bibKey(item)},\n${body}\n}`;
}

function isItem(x: unknown): x is SavedItem {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    KINDS.includes(r.kind as SavedKind) &&
    typeof r.title === "string" &&
    typeof r.authors === "string" &&
    (r.year === null || typeof r.year === "number") &&
    typeof r.citation === "string" &&
    (r.url === null || typeof r.url === "string") &&
    (r.licence === undefined || typeof r.licence === "string") &&
    typeof r.savedAt === "string"
  );
}

export function parseSaved(raw: string | null | undefined): SavedState {
  if (!raw) return EMPTY_SAVED;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedState> | null;
    if (!parsed || parsed.v !== SAVED_VERSION || !Array.isArray(parsed.items)) return EMPTY_SAVED;
    const seen = new Set<string>();
    const items = parsed.items.filter((x): x is SavedItem => isItem(x) && !seen.has(x.id) && !!seen.add(x.id)).slice(0, SAVED_LIMIT);
    return { v: SAVED_VERSION, items, noticeSeen: parsed.noticeSeen === true };
  } catch {
    return EMPTY_SAVED;
  }
}

export function serializeSaved(state: SavedState): string {
  return JSON.stringify({ v: SAVED_VERSION, items: state.items, noticeSeen: state.noticeSeen });
}

export function hasSaved(state: SavedState, id: string): boolean {
  return state.items.some((i) => i.id === id);
}

export function addSaved(state: SavedState, item: SavedItem): SavedState {
  if (hasSaved(state, item.id) || state.items.length >= SAVED_LIMIT) return state;
  return { ...state, items: [item, ...state.items] };
}

export function removeSaved(state: SavedState, id: string): SavedState {
  return { ...state, items: state.items.filter((i) => i.id !== id) };
}

export interface SavedExport {
  kind: "bucket.explore.saved";
  version: typeof SAVED_VERSION;
  exportedAt: string;
  items: SavedItem[];
}

export function exportSaved(state: SavedState, now: Date): SavedExport {
  return { kind: "bucket.explore.saved", version: SAVED_VERSION, exportedAt: now.toISOString(), items: state.items };
}

export function exportFileName(now: Date): string {
  return `bucket-saved-${now.toISOString().slice(0, 10)}.json`;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readSaved(storage: StorageLike | null | undefined): { state: SavedState; ok: boolean } {
  if (!storage) return { state: EMPTY_SAVED, ok: false };
  try {
    return { state: parseSaved(storage.getItem(SAVED_KEY)), ok: true };
  } catch {
    return { state: EMPTY_SAVED, ok: false };
  }
}

export function writeSaved(storage: StorageLike | null | undefined, state: SavedState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVED_KEY, serializeSaved(state));
    return true;
  } catch {
    return false;
  }
}
