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
export const SCHEMAS = ["bucket.report/1", "bucket.report/2"];
export const LOCAL_KEYS = ["assets", "tables", "paper", "record_sets", "tool", "builds", "attributions"];
export const AUDIENCES = ["public", "staff"];
export const TABLE_FORMATS = ["tsv", "csv", "json", "jsonl"];
export const RUNNERS = ["latex", "python"];

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
  if (!SCHEMAS.includes(record.schema)) errors.push(`schema: must be one of ${SCHEMAS.join(", ")}`);
  if (record.schema === "bucket.report/2") validateLocal(record, errors);
  else for (const key of LOCAL_KEYS) if (key in record) errors.push(`${key}: needs bucket.report/2`);
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

function under(path, dir) {
  return path === dir || path.startsWith(`${dir}/`);
}

function isPathList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function paperFiles(paper) {
  if (!isPlainObject(paper)) return [];
  return ["includes", "bib", "style"].flatMap((key) => (isPathList(paper[key]) ? paper[key] : []));
}

function parentDir(path) {
  return typeof path === "string" && path.includes("/") ? path.split("/").slice(0, -1).join("/") : null;
}

function paperRoots(record) {
  const own = parentDir(record.source_path);
  const shared = own === null ? null : parentDir(own);
  return [own, shared === null ? null : `${shared}/bib`].filter((dir) => dir !== null);
}

function staffRoots(record) {
  const roots = ["tools"];
  if (isPlainObject(record.tool) && typeof record.tool.path === "string") roots.push(record.tool.path);
  for (const set of Array.isArray(record.record_sets) ? record.record_sets : []) if (isPlainObject(set) && typeof set.dir === "string" && set.audience !== "public") roots.push(set.dir);
  return roots;
}

function leanDir(record) {
  const own = parentDir(record.source_path);
  const lean = isPlainObject(record.paper) ? record.paper.lean : null;
  return typeof lean === "string" && own !== null && lean !== own && under(lean, own) ? lean : null;
}

function publicRule(record) {
  const staff = staffRoots(record);
  const roots = paperRoots(record);
  const exact = new Set([record.source_path, record.pdf_path]);
  for (const key of ["figures", "data_sources"]) for (const item of Array.isArray(record[key]) ? record[key] : []) if (isPlainObject(item) && typeof item.path === "string") exact.add(item.path);
  for (const path of paperFiles(record.paper)) if (roots.some((dir) => under(path, dir))) exact.add(path);
  const lean = leanDir(record);
  return (path) => typeof path === "string" && !staff.some((dir) => under(path, dir)) && (path.startsWith("public/") || exact.has(path) || (lean !== null && under(path, lean)));
}

function listedRule(record) {
  const exact = new Set([record.source_path, ...paperFiles(record.paper)]);
  const dirs = [];
  const rows = (key) => (Array.isArray(record[key]) ? record[key].filter(isPlainObject) : []);
  for (const asset of rows("assets")) for (const key of ["path", "source"]) if (typeof asset[key] === "string") exact.add(asset[key]);
  for (const table of rows("tables")) if (typeof table.path === "string") exact.add(table.path);
  for (const set of rows("record_sets")) {
    if (typeof set.dir === "string") dirs.push(set.dir);
    if (typeof set.index === "string") exact.add(set.index);
  }
  if (isPlainObject(record.paper) && typeof record.paper.lean === "string") dirs.push(record.paper.lean);
  if (isPlainObject(record.tool)) {
    if (typeof record.tool.path === "string") dirs.push(record.tool.path);
    if (typeof record.tool.readme === "string") exact.add(record.tool.readme);
  }
  return (path) => exact.has(path) || dirs.some((dir) => under(path, dir));
}

function checkText(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) errors.push(`${label}: required`);
}

function checkAudience(entry, label, paths, isPublic, errors) {
  if (!AUDIENCES.includes(entry.audience)) return errors.push(`${label}.audience: one of ${AUDIENCES.join(", ")}`);
  if (entry.audience !== "public") return;
  for (const path of paths) if (typeof path === "string" && !isPublic(path)) errors.push(`${label}.audience: ${path} cannot be public`);
}

function eachEntry(record, key, errors, visit, hasId = true) {
  const list = record[key] ?? [];
  if (!Array.isArray(list)) return errors.push(`${key}: must be a list`);
  const ids = new Set();
  list.forEach((entry, i) => {
    const label = `${key}[${i}]`;
    if (!isPlainObject(entry)) return errors.push(`${label}: must be an object`);
    if (hasId) {
      if (typeof entry.id !== "string" || !SLUG_RE.test(entry.id)) errors.push(`${label}.id: must be kebab-case`);
      else if (ids.has(entry.id)) errors.push(`${label}.id: ${entry.id} repeats`);
      else ids.add(entry.id);
    }
    visit(entry, label);
  });
}

export function validateLocal(record, errors) {
  const isPublic = publicRule(record);
  const isListed = listedRule(record);
  const buildIds = new Set((Array.isArray(record.builds) ? record.builds : []).filter(isPlainObject).map((b) => b.id));
  eachEntry(record, "assets", errors, (asset, label) => {
    checkPath(asset.path, `${label}.path`, errors);
    if (typeof asset.caption !== "string") errors.push(`${label}.caption: must be a string`);
    checkText(asset.licence, `${label}.licence`, errors);
    if (asset.source != null) checkPath(asset.source, `${label}.source`, errors);
    if (asset.build != null && !buildIds.has(asset.build)) errors.push(`${label}.build: ${asset.build} is not a build id`);
    checkAudience(asset, label, [asset.path], isPublic, errors);
  });
  eachEntry(record, "tables", errors, (table, label) => {
    checkPath(table.path, `${label}.path`, errors);
    if (!TABLE_FORMATS.includes(table.format)) errors.push(`${label}.format: one of ${TABLE_FORMATS.join(", ")}`);
    checkText(table.label, `${label}.label`, errors);
    checkText(table.licence, `${label}.licence`, errors);
    if (table.editable != null && typeof table.editable !== "boolean") errors.push(`${label}.editable: must be true or false`);
    for (const key of ["licence_column", "source_column"]) if (table[key] != null && (typeof table[key] !== "string" || table[key].length === 0)) errors.push(`${label}.${key}: must be a column name`);
    if (table.licence === "mixed" && table.licence_column == null) errors.push(`${label}.licence_column: required when licence is mixed`);
    checkAudience(table, label, [table.path], isPublic, errors);
  });
  if ("paper" in record) {
    const paper = record.paper;
    if (!isPlainObject(paper)) errors.push("paper: must be an object");
    else {
      for (const key of ["includes", "bib", "style"]) {
        if (!(key in paper)) continue;
        if (!isPathList(paper[key])) errors.push(`paper.${key}: must be a list of paths`);
        else paper[key].forEach((path, i) => checkPath(path, `paper.${key}[${i}]`, errors));
      }
      if (paper.lean != null) {
        checkPath(paper.lean, "paper.lean", errors);
        if (typeof paper.lean === "string" && leanDir(record) === null) errors.push(`paper.lean: must sit inside ${parentDir(record.source_path) ?? "the paper folder"}`);
      }
      checkAudience(paper, "paper", [...paperFiles(paper), paper.lean], isPublic, errors);
    }
  }
  eachEntry(record, "record_sets", errors, (set, label) => {
    checkPath(set.dir, `${label}.dir`, errors);
    checkText(set.schema, `${label}.schema`, errors);
    checkText(set.label, `${label}.label`, errors);
    checkText(set.licence, `${label}.licence`, errors);
    if (set.index != null) checkPath(set.index, `${label}.index`, errors);
    checkAudience(set, label, [set.dir, set.index], isPublic, errors);
  });
  if ("tool" in record) {
    const tool = record.tool;
    if (!isPlainObject(tool)) errors.push("tool: must be an object");
    else {
      checkPath(tool.path, "tool.path", errors);
      if (tool.readme != null) checkPath(tool.readme, "tool.readme", errors);
      checkAudience(tool, "tool", [tool.path, tool.readme], isPublic, errors);
    }
  }
  eachEntry(record, "builds", errors, (build, label) => {
    checkText(build.label, `${label}.label`, errors);
    if (!RUNNERS.includes(build.runner)) errors.push(`${label}.runner: one of ${RUNNERS.join(", ")}`);
    checkPath(build.entry, `${label}.entry`, errors);
    for (const key of ["inputs", "outputs"]) {
      if (!isPathList(build[key] ?? [])) errors.push(`${label}.${key}: must be a list of paths`);
      else (build[key] ?? []).forEach((path, i) => checkPath(path, `${label}.${key}[${i}]`, errors));
    }
    if (!isPathList(build.needs ?? [])) errors.push(`${label}.needs: must be a list of strings`);
    const inputs = isPathList(build.inputs ?? []) ? build.inputs ?? [] : [];
    const outputs = isPathList(build.outputs ?? []) ? build.outputs ?? [] : [];
    if (typeof build.entry === "string" && !isListed(build.entry)) errors.push(`${label}.entry: ${build.entry} is not listed in the manifest`);
    inputs.forEach((path, i) => {
      if (!isListed(path)) errors.push(`${label}.inputs[${i}]: ${path} is not listed in the manifest`);
    });
    checkAudience(build, label, [build.entry, ...inputs, ...outputs], isPublic, errors);
  });
  eachEntry(record, "attributions", errors, (row, label) => {
    checkText(row.source, `${label}.source`, errors);
    if (typeof row.url !== "string" || !/^https?:\/\//.test(row.url)) errors.push(`${label}.url: must be an http or https link`);
    checkText(row.licence, `${label}.licence`, errors);
    if (!Number.isInteger(row.rows) || row.rows < 0) errors.push(`${label}.rows: must be a whole number`);
    if (typeof row.notice !== "string") errors.push(`${label}.notice: must be a string`);
  }, false);
}

export function localPaths(record) {
  const isPublic = publicRule(record);
  const byPath = new Map();
  const add = (path, entry, role) => {
    if (typeof path !== "string" || path.length === 0) return;
    const audience = entry.audience === "public" && isPublic(path) ? "public" : "staff";
    const seen = byPath.get(path);
    if (!seen) byPath.set(path, { path, audience, role });
    else if (audience === "staff") seen.audience = "staff";
  };
  const rows = (key) => (Array.isArray(record[key]) ? record[key].filter(isPlainObject) : []);
  for (const asset of rows("assets")) {
    add(asset.path, asset, "asset");
    add(asset.source, asset, "asset-source");
  }
  for (const table of rows("tables")) add(table.path, table, "table");
  if (isPlainObject(record.paper)) {
    for (const [key, role] of [["includes", "paper-include"], ["bib", "paper-bib"], ["style", "paper-style"]]) for (const path of isPathList(record.paper[key]) ? record.paper[key] : []) add(path, record.paper, role);
    add(record.paper.lean, record.paper, "paper-lean");
  }
  for (const set of rows("record_sets")) {
    add(set.dir, set, "record-set");
    add(set.index, set, "record-index");
  }
  if (isPlainObject(record.tool)) {
    add(record.tool.path, record.tool, "tool");
    add(record.tool.readme, record.tool, "tool-readme");
  }
  return [...byPath.values()];
}

export function registerRow(record, now) {
  return {
    slug: record.slug,
    title: record.title,
    authors: record.authors,
    date: record.date,
    status: record.status,
    kind: record.kind,
    abstract: record.abstract ?? (record.abstract_paragraphs ?? []).join("\n\n"),
    bead: record.bead ?? null,
    source_path: record.source_path,
    pdf_path: record.pdf_path ?? null,
    figures: record.figures ?? [],
    data_sources: record.data_sources ?? [],
    source_hash: record.source_hash,
    pdf_hash: record.pdf_hash ?? null,
    built_at: record.built_at ?? null,
    published_at: record.published_at ?? null,
    updated_at: now,
  };
}

export function checkRecord(record, { slug, bytes, exists, papersSource }) {
  const errors = validateRecord(record);
  if (errors.length) return errors;
  if (record.slug !== slug) errors.push(`slug: ${record.slug} does not match folder ${slug}`);
  errors.push(...checkHashes(record, bytes));
  const stored = bytes(`reports/${slug}/report.json`);
  if (stored == null || !Buffer.from(stored).equals(canonicalBytes(record))) errors.push("report.json: not in canonical byte form");
  if (record.status === "public") {
    const paths = publicPaths(record);
    for (const p of [paths.pdf, ...paths.figures, ...paths.data]) if (!exists(p)) errors.push(`public copy missing: ${p}`);
    if (!papersSource.includes(`slug: ${JSON.stringify(slug)},`)) errors.push("src/lib/papers.ts: no entry");
  }
  if (record.schema === "bucket.report/2") for (const path of new Set(localPaths(record).map((entry) => entry.path))) if (!exists(path)) errors.push(`local file missing: ${path}`);
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
