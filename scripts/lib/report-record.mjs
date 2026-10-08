import { createHash } from "node:crypto";

export const STATUSES = ["draft", "private", "public"];
export const KINDS = ["paper", "brief", "memo", "dataset-report"];
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const HASH_RE = /^[0-9a-f]{64}$/;
export const BEAD_RE = /^bkt-[a-z0-9]{3,12}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
export const KEY_RE = /^[a-z0-9_]+$/;

const REQUIRED = ["schema", "slug", "title", "authors", "date", "status", "kind", "source_path", "source_hash"];
const STRING_FIELDS = ["schema", "slug", "title", "date", "status", "kind", "abstract", "source_path", "source_hash", "affiliation", "version", "venue", "doi", "github_url", "licence", "corpus_line", "bibtex", "build_command", "public_path"];
const NULLABLE_STRING_FIELDS = ["bead", "pdf_path", "pdf_hash", "built_at", "published_at", "updated_at"];
const LIST_FIELDS = ["authors", "abstract_paragraphs", "highlights"];

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalValue(value, path, errors) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isInteger(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) errors.push(`${path}: number is not a safe integer`);
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map((item, i) => canonicalValue(item, `${path}[${i}]`, errors)).join(",")}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const key of keys) if (!KEY_RE.test(key)) errors.push(`${path}.${key}: key must match [a-z0-9_]+`);
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key], `${path}.${key}`, errors)}`).join(",")}}`;
  }
  errors.push(`${path}: unsupported value`);
  return "null";
}

export function canonicalBytes(record) {
  const errors = [];
  const text = canonicalValue(record, "$", errors);
  if (errors.length) throw new Error(errors.join("\n"));
  return Buffer.from(`${text.normalize("NFC")}\n`, "utf8");
}

function checkPath(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) errors.push(`${label}: must be a repo-relative path`);
  else if (value.startsWith("/") || value.split("/").includes("..")) errors.push(`${label}: must be repo-relative without ..`);
}

export function validateRecord(record) {
  const errors = [];
  if (!isPlainObject(record)) return ["record: must be an object"];
  for (const key of REQUIRED) if (!(key in record)) errors.push(`${key}: required`);
  for (const key of Object.keys(record)) if (!KEY_RE.test(key)) errors.push(`${key}: key must match [a-z0-9_]+`);
  for (const key of STRING_FIELDS) if (key in record && typeof record[key] !== "string") errors.push(`${key}: must be a string`);
  for (const key of NULLABLE_STRING_FIELDS) if (key in record && record[key] !== null && typeof record[key] !== "string") errors.push(`${key}: must be a string or null`);
  for (const key of LIST_FIELDS) if (key in record && !(Array.isArray(record[key]) && record[key].every((item) => typeof item === "string"))) errors.push(`${key}: must be a list of strings`);
  if (errors.length) return errors;
  if (record.schema !== "bucket.report/1") errors.push("schema: must be bucket.report/1");
  if (!SLUG_RE.test(record.slug)) errors.push("slug: must be kebab-case");
  if (record.title.length === 0 || record.title.length > 500) errors.push("title: 1 to 500 characters");
  if (record.authors.length === 0) errors.push("authors: at least one");
  if (!DATE_RE.test(record.date)) errors.push("date: must be YYYY-MM-DD");
  if (!STATUSES.includes(record.status)) errors.push(`status: one of ${STATUSES.join(", ")}`);
  if (!KINDS.includes(record.kind)) errors.push(`kind: one of ${KINDS.join(", ")}`);
  if (record.bead != null && !BEAD_RE.test(record.bead)) errors.push("bead: must look like bkt-xxxx");
  checkPath(record.source_path, "source_path", errors);
  if (record.pdf_path != null) checkPath(record.pdf_path, "pdf_path", errors);
  if (!HASH_RE.test(record.source_hash)) errors.push("source_hash: 64 hex");
  if (record.pdf_hash != null && !HASH_RE.test(record.pdf_hash)) errors.push("pdf_hash: 64 hex");
  if (record.pdf_path != null && record.pdf_hash == null) errors.push("pdf_hash: required when pdf_path is set");
  for (const key of ["built_at", "published_at", "updated_at"]) if (record[key] != null && !TIMESTAMP_RE.test(record[key])) errors.push(`${key}: RFC 3339 UTC with Z`);
  const figures = record.figures ?? [];
  if (!Array.isArray(figures)) errors.push("figures: must be a list");
  else figures.forEach((fig, i) => {
    if (!isPlainObject(fig)) return errors.push(`figures[${i}]: must be an object`);
    checkPath(fig.path, `figures[${i}].path`, errors);
    if (typeof fig.caption !== "string") errors.push(`figures[${i}].caption: must be a string`);
    if (typeof fig.licence !== "string" || fig.licence.length === 0) errors.push(`figures[${i}].licence: required`);
  });
  const sources = record.data_sources ?? [];
  if (!Array.isArray(sources)) errors.push("data_sources: must be a list");
  else sources.forEach((src, i) => {
    if (!isPlainObject(src)) return errors.push(`data_sources[${i}]: must be an object`);
    const hasPath = typeof src.path === "string" && src.path.length > 0;
    const hasUrl = typeof src.url === "string" && /^https?:\/\//.test(src.url);
    if (!hasPath && !hasUrl) errors.push(`data_sources[${i}]: path or url required`);
    if (hasPath) checkPath(src.path, `data_sources[${i}].path`, errors);
    if (typeof src.licence !== "string" || src.licence.length === 0) errors.push(`data_sources[${i}].licence: required`);
    if (src.retrieved != null && !DATE_RE.test(src.retrieved)) errors.push(`data_sources[${i}].retrieved: YYYY-MM-DD`);
  });
  if (record.status === "public") {
    if (record.pdf_path == null) errors.push("pdf_path: required when status is public");
    if (record.published_at == null) errors.push("published_at: required when status is public");
  }
  try {
    canonicalBytes(record);
  } catch (err) {
    errors.push(...String(err.message).split("\n"));
  }
  return errors;
}

export function checkHashes(record, readBytes) {
  const errors = [];
  const source = readBytes(record.source_path);
  if (source == null) errors.push(`source_path: ${record.source_path} is missing`);
  else if (sha256(source) !== record.source_hash) errors.push(`source_hash: ${record.source_path} has changed; run build then register`);
  if (record.pdf_path != null) {
    const pdf = readBytes(record.pdf_path);
    if (pdf == null) errors.push(`pdf_path: ${record.pdf_path} is missing`);
    else if (sha256(pdf) !== record.pdf_hash) errors.push(`pdf_hash: ${record.pdf_path} has changed; run build`);
  }
  return errors;
}

export function publicPaths(record) {
  const base = record.public_path ?? `public/papers/${record.slug}`;
  const pdf = `${base}/paper.pdf`;
  const figures = (record.figures ?? []).map((fig) => (fig.path.startsWith(`${base}/`) ? fig.path : `${base}/${webpName(fig.path)}`));
  const data = (record.data_sources ?? []).filter((src) => src.path).map((src) => `${base}/data/${src.path.split("/").pop()}`);
  return { base, pdf, figures, data };
}

export function webpName(figurePath) {
  return figurePath.split("/").pop().replace(/\.[a-z0-9]+$/i, ".webp");
}

function tsString(value) {
  return JSON.stringify(value);
}

function tsTemplate(value) {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;
}

export function papersEntry(record) {
  const { base, figures } = publicPaths(record);
  const lines = [];
  lines.push("  {");
  lines.push(`    slug: ${tsString(record.slug)},`);
  lines.push(`    title: ${tsString(record.title)},`);
  lines.push(`    authors: ${tsString(record.authors.join(" · "))},`);
  lines.push(`    affiliation: ${tsString(record.affiliation ?? "Bucket Foundation")},`);
  lines.push(`    date: ${tsString(record.date)},`);
  lines.push(`    version: ${tsString(record.version ?? "1.0")},`);
  lines.push(`    venue: ${tsString(record.venue ?? "Bucket Foundation report")},`);
  if (record.doi) {
    lines.push(`    doi: ${tsString(record.doi)},`);
    lines.push(`    doiUrl: ${tsString(`https://doi.org/${record.doi}`)},`);
  }
  lines.push(`    pdfUrl: ${tsString(`/papers/${record.slug}/paper.pdf`)},`);
  lines.push(`    githubUrl: ${tsString(record.github_url ?? `https://github.com/gianyrox/bucket-foundation/tree/dev/${record.source_path.split("/").slice(0, -1).join("/")}`)},`);
  lines.push(`    license: ${tsString(record.licence ?? "CC-BY-4.0")},`);
  lines.push(`    corpusLine: ${tsString(record.corpus_line ?? "")},`);
  const abstract = record.abstract_paragraphs ?? (record.abstract ? [record.abstract] : []);
  lines.push(`    abstract: [${abstract.map((p) => `\n      ${tsString(p)},`).join("")}\n    ],`);
  lines.push(`    highlights: [${(record.highlights ?? []).map((h) => `\n      ${tsString(h)},`).join("")}\n    ],`);
  lines.push("    figures: [");
  (record.figures ?? []).forEach((fig, i) => {
    lines.push("      {");
    lines.push(`        src: ${tsString(`/${figures[i].replace(/^public\//, "")}`)},`);
    lines.push(`        alt: ${tsString(fig.alt ?? fig.caption)},`);
    lines.push(`        caption: ${tsString(fig.caption)},`);
    lines.push("      },");
  });
  lines.push("    ],");
  const dataLinks = (record.data_sources ?? []).map((src) => ({
    label: src.label ?? (src.path ? src.path.split("/").pop() : src.url),
    href: src.path ? `/${base.replace(/^public\//, "")}/data/${src.path.split("/").pop()}` : src.url,
  }));
  if (dataLinks.length) {
    lines.push("    dataLinks: [");
    for (const link of dataLinks) lines.push(`      { label: ${tsString(link.label)}, href: ${tsString(link.href)} },`);
    lines.push("    ],");
  }
  lines.push(`    bibtex: ${tsTemplate(record.bibtex ?? defaultBibtex(record))},`);
  lines.push("  },");
  return lines.join("\n");
}

export function defaultBibtex(record) {
  const key = `bucket${record.date.slice(0, 4)}${record.slug.replace(/-/g, "")}`;
  const author = record.authors.join(" and ");
  return `@techreport{${key},
  title        = {${record.title}},
  author       = {${author}},
  institution  = {Bucket Foundation},
  year         = {${record.date.slice(0, 4)}},
  url          = {https://www.bucket.foundation/research/papers/${record.slug}},
  note         = {${record.kind}, ${record.date}}
}`;
}

export function findEntry(source, slug) {
  const needle = `slug: ${JSON.stringify(slug)},`;
  const at = source.indexOf(needle);
  if (at < 0) return null;
  const brace = source.lastIndexOf("{", at);
  let start = brace;
  while (start > 0 && source[start - 1] === " ") start -= 1;
  let depth = 0;
  let quote = null;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        if (source[end] === ",") end += 1;
        if (source[end] === "\n") end += 1;
        return { start, end };
      }
    }
  }
  return null;
}

export function upsertPapersSource(source, record) {
  const entry = papersEntry(record);
  const existing = findEntry(source, record.slug);
  if (existing) return `${source.slice(0, existing.start)}${entry}\n${source.slice(existing.end)}`;
  const close = source.indexOf("\n];", source.indexOf("export const PAPERS"));
  if (close < 0) throw new Error("src/lib/papers.ts: PAPERS array not found");
  return `${source.slice(0, close)}\n${entry}${source.slice(close)}`;
}
