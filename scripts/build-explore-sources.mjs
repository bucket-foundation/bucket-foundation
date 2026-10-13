import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const LIMIT = 5 * 1024 * 1024;
const PER_AUTHOR = 4;
const SNIPPET = 150;
const AUTHORS = 120;
const CANON_DIR = "bucket-canon";
const PRIMARY_FILE = "primary-papers.yaml";
const OUT_DIR = path.join(ROOT, "src", "data");
const COMMITTED = path.join(OUT_DIR, "explore-sources.json");
const LOCAL = path.join(OUT_DIR, "explore-sources.local.json");

const read = (p) => fs.readFileSync(p, "utf8");
const readJson = (p) => {
  try {
    return JSON.parse(read(p));
  } catch {
    return null;
  }
};
const dirs = (d) => {
  try {
    return fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
};
const EMAIL = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\))\s*[A-Za-z0-9-]{1,63}(?:\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\))\s*[A-Za-z0-9-]{1,63})+/gi;
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
export const scrub = (s) => String(s ?? "").normalize("NFKC").replace(EMAIL, "");
const flat = (s) =>
  scrub(
    String(s ?? "")
      .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
      .replace(/<\/?[A-Za-z][^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
const cut = (s, n = SNIPPET) => {
  const t = flat(s);
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
};
const yearOf = (v) => {
  const n = parseInt(String(v ?? "").slice(0, 4), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function abstractOf(inv) {
  if (!inv || typeof inv !== "object") return "";
  const words = [];
  for (const [w, pos] of Object.entries(inv)) for (const p of pos) if (p < 40) words[p] = w;
  return words.filter(Boolean).join(" ");
}

const MIN_TITLE_KEY = 16;
const norm = (v) => flat(v).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
const entry = (row, doi, firstAuthor) => ({ row, doi: normDoi(doi), title: norm(row[2]), author: norm(firstAuthor), year: row[3] });

export function normDoi(doi) {
  return String(doi ?? "").trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "");
}

export function sameTitle(a, b) {
  const [x, y] = [norm(a), norm(b)];
  if (!x || !y) return false;
  if (x === y) return true;
  return Math.min(x.length, y.length) >= MIN_TITLE_KEY && (x.startsWith(y) || y.startsWith(x));
}

export function sameFamily(family, fullName) {
  const [f, n] = [norm(family), norm(fullName)];
  return !!f && !!n && (n.endsWith(f) || n.startsWith(f));
}

export function sameWork(a, b) {
  if (!sameTitle(a.title, b.title)) return false;
  return sameFamily(a.family, b.author) || (a.year !== null && a.year === b.year);
}

function openalexEntries() {
  const seen = new Set();
  const out = [];
  for (const a of dirs("openalex")) {
    const works = readJson(path.join(ROOT, "openalex", a, "works.json"));
    if (!Array.isArray(works)) continue;
    const top = works
      .filter((w) => w?.title && !w.is_paratext)
      .sort((x, y) => (y.cited_by_count ?? 0) - (x.cited_by_count ?? 0))
      .slice(0, PER_AUTHOR);
    for (const w of top) {
      const id = String(w.id).replace("https://openalex.org/", "");
      if (seen.has(id)) continue;
      seen.add(id);
      const first = w.authorships?.[0]?.author?.display_name ?? "";
      const more = (w.authorships?.length ?? 0) > 1 ? " et al." : "";
      const venue = w.primary_location?.source?.display_name ?? "";
      out.push(entry(["o", id, flat(w.title), w.publication_year ?? null, cut(abstractOf(w.abstract_inverted_index) || venue), cut(`${first}${more}`, 60)], w.doi, first));
    }
  }
  return out;
}

function pubmedEntries() {
  const out = [];
  for (const d of dirs("pubmed")) {
    const m = readJson(path.join(ROOT, "pubmed", d, "metadata.json"));
    if (!m?.title || !m.pmid) continue;
    const first = m.authors?.[0] ?? "";
    const more = (m.authors?.length ?? 0) > 1 ? " et al." : "";
    out.push(entry(["p", String(m.pmid), flat(m.title), yearOf(m.year), cut(m.abstract || m.journal), cut(`${first}${more}`, 60)], m.doi, first));
  }
  return out;
}

function arxivEntries() {
  const out = [];
  for (const d of dirs("arxiv")) {
    const m = readJson(path.join(ROOT, "arxiv", d, "metadata.json"));
    if (!m?.title || !m.id) continue;
    const first = m.authors?.[0] ?? "";
    const more = (m.authors?.length ?? 0) > 1 ? " et al." : "";
    out.push(entry(["a", m.id, flat(m.title), yearOf(m.published), cut(m.summary), cut(`${first}${more}`, 60)], m.doi, first));
  }
  return out;
}

const rows = (entries) => entries.map((e) => e.row);
export const buildOpenalex = () => rows(openalexEntries());
export const buildPubmed = () => rows(pubmedEntries());
export const buildArxiv = () => rows(arxivEntries());

export function buildGutenberg() {
  const out = [];
  for (const d of dirs("gutenberg")) {
    const m = readJson(path.join(ROOT, "gutenberg", d, "metadata.json"));
    if (!m?.title || !m.id) continue;
    const by = m.authors?.[0]?.name ?? "";
    const summary = String(m.summaries?.[0] ?? "").replace(/\(This is an automatically generated summary\.\)/, "");
    out.push(["g", String(m.id), flat(m.title), null, cut(summary || (m.subjects ?? []).join("; ")), cut(by, 60)]);
  }
  return out;
}

export function buildWikisource() {
  const out = [];
  for (const d of dirs("wikisource")) {
    const m = readJson(path.join(ROOT, "wikisource", d, "metadata.json"));
    if (!m?.title || !m.pageid) continue;
    let body = "";
    try {
      body = read(path.join(ROOT, "wikisource", d, "page.txt"));
    } catch {}
    out.push(["w", String(m.pageid), flat(m.title), null, cut(body), ""]);
  }
  return out;
}

export function buildYt() {
  const out = [];
  for (const d of dirs("yt")) {
    let info = "";
    try {
      info = read(path.join(ROOT, "yt", d, "info.md"));
    } catch {
      continue;
    }
    const title = flat(info.match(/^#\s+(.+)$/m)?.[1]);
    const id = info.match(/\*\*Video ID\*\*:\s*`([^`]+)`/)?.[1];
    if (!title || !id) continue;
    const channel = flat(info.match(/\*\*Channel\*\*:\s*([^—\n]+)/)?.[1]);
    const up = info.match(/\*\*Uploaded\*\*:\s*(\d{4})/)?.[1];
    const desc = info.split(/^## Description\s*$/m)[1] ?? "";
    out.push(["y", id, title, up ? Number(up) : null, cut(desc.split(/\n## /)[0]), cut(channel, 60)]);
  }
  return out;
}

export const LICENSE = {
  o: "OpenAlex metadata, CC0",
  p: "PubMed metadata, NLM public domain",
  a: "arXiv metadata, CC0",
  g: "Project Gutenberg, public domain in the US",
  w: "Wikisource, CC BY-SA 4.0",
  y: "YouTube transcript, link only",
  d: "Crossref and OpenAlex metadata, CC0",
};

function primaryFiles(dir = CANON_DIR) {
  let list = [];
  try {
    list = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  return list
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((e) => (e.isDirectory() ? primaryFiles(path.join(dir, e.name)) : e.name === PRIMARY_FILE ? [path.join(dir, e.name)] : []));
}

export function readPrimaryPapers() {
  return primaryFiles().flatMap((file) => {
    const doc = yaml.load(read(path.join(ROOT, file)));
    if (!Array.isArray(doc?.records)) throw new Error(`${file} has no records list`);
    return doc.records;
  });
}

const authorName = (a) => [a?.given, a?.family].filter(Boolean).join(" ");

export function mergePrimaryPapers(existing, records) {
  const dois = new Map(existing.filter((e) => e.doi).map((e) => [e.doi, e]));
  const added = [];
  const stats = { read: records.length, added: 0, sameDoi: 0, sameTitleAuthor: 0, repeated: 0, noDoi: 0, noAuthor: 0 };
  const skipped = [];
  const skip = (reason, r, match) => {
    stats[reason]++;
    skipped.push({ reason, doi: normDoi(r?.doi), title: flat(r?.title), match: match ? `${match.row[0]}/${match.row[1]}` : "" });
  };
  const out = [];
  for (const r of records) {
    const doi = normDoi(r?.doi);
    const by = (r?.authors ?? []).map(authorName).filter(Boolean).join(", ");
    const work = { title: r?.title, family: r?.authors?.[0]?.family, year: yearOf(r?.year) };
    const twin = (pool) => pool.find((e) => sameWork(work, e));
    if (!doi || !flat(r?.title)) skip("noDoi", r);
    else if (!by) skip("noAuthor", r);
    else if (added.some((e) => e.doi === doi) || twin(added)) skip("repeated", r, added.find((e) => e.doi === doi) ?? twin(added));
    else if (dois.has(doi)) skip("sameDoi", r, dois.get(doi));
    else if (twin(existing)) skip("sameTitleAuthor", r, twin(existing));
    else {
      const row = ["d", doi, flat(r.title), work.year, cut(r.venue?.name), cut(by, AUTHORS)];
      added.push(entry(row, doi, authorName(r.authors[0])));
      out.push(row);
      stats.added++;
    }
  }
  return { rows: out, stats, skipped };
}

export function buildIndex() {
  const existing = [...openalexEntries(), ...pubmedEntries(), ...arxivEntries()];
  const primary = mergePrimaryPapers(existing, readPrimaryPapers());
  const items = [...rows(existing), ...buildGutenberg(), ...buildWikisource(), ...buildYt(), ...primary.rows];
  return { v: 1, fields: ["kind", "id", "title", "year", "snippet", "by"], licenses: LICENSE, items, primary: primary.stats, skipped: primary.skipped };
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const { primary, skipped, ...index } = buildIndex();
  const body = JSON.stringify(index);
  const big = Buffer.byteLength(body) > LIMIT;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const target = big ? LOCAL : COMMITTED;
  fs.rmSync(big ? COMMITTED : LOCAL, { force: true });
  fs.writeFileSync(target, body);
  const counts = {};
  for (const it of index.items) counts[it[0]] = (counts[it[0]] ?? 0) + 1;
  console.log(`${path.relative(ROOT, target)} ${Buffer.byteLength(body)} bytes ${index.items.length} items`, counts, primary);
  for (const k of skipped) console.log(`skipped ${k.reason} ${k.doi || "no-doi"} ${JSON.stringify(k.title)}${k.match ? ` held as ${k.match}` : ""}`);
}
