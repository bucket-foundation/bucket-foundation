import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LIMIT = 5 * 1024 * 1024;
const PER_AUTHOR = 4;
const SNIPPET = 150;
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
const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
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

export function buildOpenalex() {
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
      out.push(["o", id, flat(w.title), w.publication_year ?? null, cut(abstractOf(w.abstract_inverted_index) || venue), cut(`${first}${more}`, 60)]);
    }
  }
  return out;
}

export function buildPubmed() {
  const out = [];
  for (const d of dirs("pubmed")) {
    const m = readJson(path.join(ROOT, "pubmed", d, "metadata.json"));
    if (!m?.title || !m.pmid) continue;
    const first = m.authors?.[0] ?? "";
    const more = (m.authors?.length ?? 0) > 1 ? " et al." : "";
    out.push(["p", String(m.pmid), flat(m.title), yearOf(m.year), cut(m.abstract || m.journal), cut(`${first}${more}`, 60)]);
  }
  return out;
}

export function buildArxiv() {
  const out = [];
  for (const d of dirs("arxiv")) {
    const m = readJson(path.join(ROOT, "arxiv", d, "metadata.json"));
    if (!m?.title || !m.id) continue;
    const first = m.authors?.[0] ?? "";
    const more = (m.authors?.length ?? 0) > 1 ? " et al." : "";
    out.push(["a", m.id, flat(m.title), yearOf(m.published), cut(m.summary), cut(`${first}${more}`, 60)]);
  }
  return out;
}

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

export function buildIndex() {
  const items = [...buildOpenalex(), ...buildPubmed(), ...buildArxiv(), ...buildGutenberg(), ...buildWikisource(), ...buildYt()];
  return { v: 1, fields: ["kind", "id", "title", "year", "snippet", "by"], items };
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const index = buildIndex();
  const body = JSON.stringify(index);
  const big = Buffer.byteLength(body) > LIMIT;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const target = big ? LOCAL : COMMITTED;
  fs.rmSync(big ? COMMITTED : LOCAL, { force: true });
  fs.writeFileSync(target, body);
  const counts = {};
  for (const it of index.items) counts[it[0]] = (counts[it[0]] ?? 0) + 1;
  console.log(`${path.relative(ROOT, target)} ${Buffer.byteLength(body)} bytes ${index.items.length} items`, counts);
}
