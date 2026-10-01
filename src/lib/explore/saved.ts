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
  if (hit.type !== "paper" && hit.type !== "text") return "";
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

export function citable(f: Pick<CiteFields, "authors">): boolean {
  return f.authors.trim().length > 0;
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

const BIB_ESCAPES: Record<string, string> = { "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "&": "\\&", "%": "\\%", $: "\\$", "#": "\\#", _: "\\_", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" };

export function bibEscape(s: string): string {
  return s.replace(/[\\{}&%$#_~^]/g, (c) => BIB_ESCAPES[c]);
}

function idTag(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(7, "0");
}

export function bibKey(item: Pick<SavedItem, "id" | "authors" | "year" | "title">): string {
  const word = (s: string) => (/[A-Za-z]{2,}/.exec(s.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""))?.[0] ?? "").toLowerCase();
  const first = item.authors.split(/,|;| et al\.?| and /)[0] ?? "";
  const names = first.trim().split(/\s+/);
  const surname = names[names.length - 1] ?? "";
  return [word(surname) || "anon", item.year === null ? "nd" : String(Math.abs(item.year)), word(item.title) || "untitled", "-", idTag(item.id)].join("");
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
  const body = fields.map(([k, v]) => `  ${k} = {${k === "url" || k === "doi" ? v.replace(/[{}\\\s]/g, "") : bibEscape(v)}}`).join(",\n");
  return `@${type}{${bibKey(item)},\n${body}\n}`;
}

const LIMITS = { id: 300, title: 500, authors: 500, citation: 2000, url: 2000, licence: 300 };

export function safeUrl(url: unknown): url is string | null {
  if (url === null) return true;
  if (typeof url !== "string" || url.length === 0 || url.length > LIMITS.url || /[\u0000-\u0020]/.test(url)) return false;
  if (url.startsWith("/")) return !url.startsWith("//") && !url.includes("\\");
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function text(v: unknown, max: number, min = 0): v is string {
  return typeof v === "string" && v.length >= min && v.length <= max;
}

export function isSavedItem(x: unknown): x is SavedItem {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  return (
    text(r.id, LIMITS.id, 1) &&
    KINDS.includes(r.kind as SavedKind) &&
    text(r.title, LIMITS.title, 1) &&
    text(r.authors, LIMITS.authors) &&
    (r.year === null || (typeof r.year === "number" && Number.isInteger(r.year) && Math.abs(r.year) < 100000)) &&
    text(r.citation, LIMITS.citation) &&
    safeUrl(r.url) &&
    (r.licence === undefined || text(r.licence, LIMITS.licence)) &&
    text(r.savedAt, 40, 1) &&
    !Number.isNaN(Date.parse(r.savedAt))
  );
}

function cleanItems(list: unknown[]): SavedItem[] {
  const seen = new Set<string>();
  const out: SavedItem[] = [];
  for (const x of list) {
    if (!isSavedItem(x) || seen.has(x.id)) continue;
    seen.add(x.id);
    const item: SavedItem = { id: x.id, kind: x.kind, title: x.title, authors: x.authors, year: x.year, citation: x.citation, url: x.url, savedAt: x.savedAt };
    if (x.licence) item.licence = x.licence;
    out.push(item);
    if (out.length >= SAVED_LIMIT) break;
  }
  return out;
}

export type ReadStatus = "ok" | "empty" | "damaged" | "blocked";

export function parseStored(raw: string | null | undefined): { state: SavedState; status: ReadStatus } {
  if (raw === null || raw === undefined || raw === "") return { state: EMPTY_SAVED, status: "empty" };
  try {
    const parsed = JSON.parse(raw) as Partial<SavedState> | null;
    if (!parsed || typeof parsed !== "object" || parsed.v !== SAVED_VERSION || !Array.isArray(parsed.items)) return { state: EMPTY_SAVED, status: "damaged" };
    return { state: { v: SAVED_VERSION, items: cleanItems(parsed.items), noticeSeen: parsed.noticeSeen === true }, status: "ok" };
  } catch {
    return { state: EMPTY_SAVED, status: "damaged" };
  }
}

export function parseSaved(raw: string | null | undefined): SavedState {
  return parseStored(raw).state;
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

export function importSaved(raw: string): SavedItem[] | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SavedExport> | null;
    if (!parsed || typeof parsed !== "object" || parsed.kind !== "bucket.explore.saved" || parsed.version !== SAVED_VERSION || !Array.isArray(parsed.items)) return null;
    return cleanItems(parsed.items);
  } catch {
    return null;
  }
}

export type SavedChange = { add: SavedItem } | { remove: string } | { noticeSeen: true };

export function applyChange(state: SavedState, change: SavedChange): SavedState {
  if ("add" in change) return addSaved(state, change.add);
  if ("remove" in change) return removeSaved(state, change.remove);
  return { ...state, noticeSeen: true };
}

export function exportFileName(now: Date): string {
  return `bucket-saved-${now.toISOString().slice(0, 10)}.json`;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readSaved(storage: StorageLike | null | undefined): { state: SavedState; ok: boolean; status: ReadStatus } {
  if (!storage) return { state: EMPTY_SAVED, ok: false, status: "blocked" };
  try {
    const r = parseStored(storage.getItem(SAVED_KEY));
    return { state: r.state, ok: r.status !== "damaged", status: r.status };
  } catch {
    return { state: EMPTY_SAVED, ok: false, status: "blocked" };
  }
}

export function changeSaved(storage: StorageLike | null | undefined, memory: SavedState, change: SavedChange): { state: SavedState; kept: boolean } {
  const fresh = readSaved(storage);
  if (!fresh.ok) return { state: applyChange(memory, change), kept: false };
  const state = applyChange(fresh.state, change);
  return { state, kept: writeSaved(storage, state) };
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
