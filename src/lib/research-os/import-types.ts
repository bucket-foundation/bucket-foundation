/**
 * What kind of file an import holds (ros-import 2).
 *
 * A browser reports a media type from the operating system's own table,
 * and that table disagrees with itself across machines: the same .csv
 * arrives as `text/csv`, `application/vnd.ms-excel`, or
 * `application/octet-stream`, and a file with no extension arrives as an
 * empty string. The extension is the more reliable signal for the formats
 * Research OS reads, so the extension decides the structured type and the
 * media type is repaired to match. A type nothing here knows keeps its
 * bytes and its metadata, and says so.
 *
 * `structured` is what the rest of the loop switches on. `extractable`
 * says whether ros-import 3 has a reader for it; the others stay
 * metadata and bytes until one exists.
 */
import { isMediaType } from "./import-storage";

export type StructuredType = "text" | "document" | "web" | "table" | "data" | "image" | "audio" | "video" | "archive" | "other";

export const EXTRACTABLE: ReadonlySet<StructuredType> = new Set<StructuredType>(["text", "document", "web", "table", "data"]);

export const OCTET_STREAM = "application/octet-stream";
export const MAX_FILENAME = 255;
export const MAX_TITLE = 200;
export const MAX_NOTE = 2000;

interface Known {
  media: string;
  structured: StructuredType;
}

/** Extension to the media type Research OS records, and the type it reads it as. */
export const BY_EXTENSION: Readonly<Record<string, Known>> = {
  txt: { media: "text/plain", structured: "text" },
  text: { media: "text/plain", structured: "text" },
  md: { media: "text/markdown", structured: "text" },
  markdown: { media: "text/markdown", structured: "text" },
  rtf: { media: "application/rtf", structured: "text" },
  pdf: { media: "application/pdf", structured: "document" },
  epub: { media: "application/epub+zip", structured: "document" },
  docx: { media: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", structured: "document" },
  odt: { media: "application/vnd.oasis.opendocument.text", structured: "document" },
  html: { media: "text/html", structured: "web" },
  htm: { media: "text/html", structured: "web" },
  csv: { media: "text/csv", structured: "table" },
  tsv: { media: "text/tab-separated-values", structured: "table" },
  xlsx: { media: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", structured: "table" },
  ods: { media: "application/vnd.oasis.opendocument.spreadsheet", structured: "table" },
  parquet: { media: "application/vnd.apache.parquet", structured: "table" },
  json: { media: "application/json", structured: "data" },
  jsonl: { media: "application/jsonl", structured: "data" },
  ndjson: { media: "application/x-ndjson", structured: "data" },
  xml: { media: "application/xml", structured: "data" },
  yaml: { media: "application/yaml", structured: "data" },
  yml: { media: "application/yaml", structured: "data" },
  png: { media: "image/png", structured: "image" },
  jpg: { media: "image/jpeg", structured: "image" },
  jpeg: { media: "image/jpeg", structured: "image" },
  gif: { media: "image/gif", structured: "image" },
  webp: { media: "image/webp", structured: "image" },
  svg: { media: "image/svg+xml", structured: "image" },
  tif: { media: "image/tiff", structured: "image" },
  tiff: { media: "image/tiff", structured: "image" },
  mp3: { media: "audio/mpeg", structured: "audio" },
  wav: { media: "audio/wav", structured: "audio" },
  m4a: { media: "audio/mp4", structured: "audio" },
  flac: { media: "audio/flac", structured: "audio" },
  mp4: { media: "video/mp4", structured: "video" },
  mov: { media: "video/quicktime", structured: "video" },
  webm: { media: "video/webm", structured: "video" },
  mkv: { media: "video/x-matroska", structured: "video" },
  zip: { media: "application/zip", structured: "archive" },
  gz: { media: "application/gzip", structured: "archive" },
  tar: { media: "application/x-tar", structured: "archive" },
  "7z": { media: "application/x-7z-compressed", structured: "archive" },
};

/** The structured type a media type alone implies, for a file with no extension. */
const BY_PREFIX: [string, StructuredType][] = [
  ["text/html", "web"],
  ["text/csv", "table"],
  ["text/tab-separated-values", "table"],
  ["text/", "text"],
  ["image/", "image"],
  ["audio/", "audio"],
  ["video/", "video"],
  ["application/pdf", "document"],
  ["application/epub", "document"],
  ["application/json", "data"],
  ["application/xml", "data"],
  ["application/zip", "archive"],
  ["application/gzip", "archive"],
];

export interface DetectedType {
  /** The media type the row records, one `type/subtype` with no parameters. */
  mediaType: string;
  structured: StructuredType;
  extractable: boolean;
  /** Which signal decided: the file's extension, the browser's media type, or neither. */
  from: "extension" | "media-type" | "fallback";
}

/** The extension of `filename`, lower case and without its dot, or null. */
export function extensionOf(filename: string): string | null {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,12}$/.test(ext) ? ext : null;
}

/** One `type/subtype`, lower case, with any parameter such as `; charset=utf-8` removed. */
export function normalizeMediaType(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const bare = raw.split(";")[0].trim().toLowerCase();
  return bare && isMediaType(bare) ? bare : null;
}

export function detectType(filename: string, reported: string | null | undefined): DetectedType {
  const known = BY_EXTENSION[extensionOf(filename) ?? ""];
  if (known) return { mediaType: known.media, structured: known.structured, extractable: EXTRACTABLE.has(known.structured), from: "extension" };
  const media = normalizeMediaType(reported);
  if (media && media !== OCTET_STREAM) {
    const hit = BY_PREFIX.find(([prefix]) => media === prefix || media.startsWith(prefix));
    const structured = hit ? hit[1] : "other";
    return { mediaType: media, structured, extractable: EXTRACTABLE.has(structured), from: "media-type" };
  }
  return { mediaType: media ?? OCTET_STREAM, structured: "other", extractable: false, from: "fallback" };
}

export type MetadataError = "filename_missing" | "filename_too_long" | "title_missing" | "title_too_long" | "note_too_long" | "kind_unknown";

export const IMPORT_KINDS = ["dataset", "paper", "notes", "corpus"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export interface ImportMetadata {
  kind: ImportKind;
  title: string;
  note: string | null;
}

/** The metadata form's rules, shared by the page and the route. */
export function validateMetadata(input: { kind?: unknown; title?: unknown; note?: unknown }): { ok: true; value: ImportMetadata } | { ok: false; error: MetadataError } {
  if (!IMPORT_KINDS.includes(input.kind as ImportKind)) return { ok: false, error: "kind_unknown" };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, error: "title_missing" };
  if (title.length > MAX_TITLE) return { ok: false, error: "title_too_long" };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > MAX_NOTE) return { ok: false, error: "note_too_long" };
  return { ok: true, value: { kind: input.kind as ImportKind, title, note: note || null } };
}

/** A filename the row may record: one path segment, bounded, with no separators. */
export function validateFilename(raw: unknown): { ok: true; value: string } | { ok: false; error: MetadataError } {
  const name = typeof raw === "string" ? raw.trim().replace(/[\\/]/g, "") : "";
  if (!name) return { ok: false, error: "filename_missing" };
  if (name.length > MAX_FILENAME) return { ok: false, error: "filename_too_long" };
  return { ok: true, value: name };
}
