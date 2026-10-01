import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readCanonClaims, type CanonClaim } from "../../../../src/lib/canon-index-loader";
import { NO_CENTRALITY, type Centrality, type RawGraph } from "../../../../src/lib/canon-graph-core";
import { assertClean, BACKSTOP_PREFIXES, buildDenylist, denyRow, keepConnections, DENIED_NAME, marker, withDeniedFiles, type Denial, type Denylist } from "./rights";

export const CANON_PACK_BUDGET_BYTES = 6 * 1024 * 1024;
const EVIDENCE_FILE = "_intake/embeddings/claim-evidence.jsonl";
const GRAPH_FILE = "_intake/connections/graph.json";
const CENTRALITY_FILE = "_intake/connections/centrality.json";

export interface PackGraph {
  graph: RawGraph;
  centrality: Centrality;
}

export interface PackSource {
  title: string;
  url: string | null;
  timestamp: string | null;
}

export interface PackExcerpt {
  rowid: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  text: string;
  path: string;
  source: PackSource;
}

export interface PackPassage {
  score: number;
  kind: string;
  source_path: string;
  text: string;
  url: string | null;
  title: string;
  author: string | null;
}

export interface Licence {
  kind: string;
  name: string;
  terms: string;
  url: string | null;
  works: number;
}

export type Drop = "licence" | "noSource";

type Reasons = Record<Denial, number>;

export interface CanonCounts {
  videoIds: number;
  deniedFiles: number;
  unreadableFiles: number;
  excerpts: { total: number; kept: number; denied: Reasons };
  passages: {
    total: number;
    kept: number;
    denied: Reasons;
    namedInListedFolders: number;
    namedElsewhere: number;
    droppedWithExcerpt: number;
    dropped: Record<Drop, Record<string, number>>;
  };
  vectorRows: { total: number; kept: number };
  connections: { nodes: number; denied: number };
}

export interface CanonPack {
  version: string;
  sha256: string;
  source: string;
  excerpts: PackExcerpt[];
  evidence: Record<string, PackPassage[]>;
  licences: Licence[];
  graph: PackGraph;
  counts: CanonCounts;
}

export const NOTICE_KIND = "notice";
export const QUOTATION_NOTICE =
  "The pack holds short quotations from third-party talks, abstracts and texts with a link to each source. Whether these ship in a release is a founder decision recorded on bead bkt-6wjd.";
export const AUTHOR_DEATH_CUTOFF = 1955;

export const LICENCES: Omit<Licence, "works">[] = [
  { kind: "yt", name: "YouTube transcripts", terms: "Transcript excerpts of public videos on youtube.com. Copyright stays with each speaker and channel. Each excerpt names its video and channel and links to it.", url: "https://www.youtube.com" },
  { kind: "gutenberg", name: "Project Gutenberg", terms: "Books from gutenberg.org that Project Gutenberg marks as free of copyright in the United States. Each passage names its book and author.", url: "https://www.gutenberg.org/policy/permission.html" },
  {
    kind: "wikisource",
    name: "Wikisource",
    terms: "Pages from en.wikisource.org whose author died before 1955 or that the source data marks as public domain, licensed as marked on the Wikisource page. Each passage names its page and links to it. Wikisource text is offered under CC BY-SA 4.0: if you share or adapt a passage, credit the page and release your version under the same licence.",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  { kind: "pubmed", name: "PubMed abstracts", terms: "Abstracts indexed at pubmed.ncbi.nlm.nih.gov. Copyright stays with each publisher. Each passage names its paper and authors and links to its PubMed record.", url: "https://pubmed.ncbi.nlm.nih.gov" },
  { kind: "arxiv", name: "arXiv", terms: "Abstracts from arxiv.org. Each passage names its paper and authors and links to its arXiv record; see the arXiv record for its licence.", url: "https://arxiv.org" },
  { kind: "openalex", name: "OpenAlex", terms: "Records from openalex.org, released under CC0. Each passage names its work or author and links to its record.", url: "https://openalex.org" },
  { kind: "archive", name: "Internet Archive", terms: "Items from archive.org that carry a public domain mark. Each passage names its item and creator and gives its address.", url: null },
  { kind: "_intake", name: "Bucket Foundation notes", terms: "Working notes by Bucket Foundation, written from the sources in this table.", url: "https://bucket.foundation" },
  { kind: NOTICE_KIND, name: "About these quotations", terms: QUOTATION_NOTICE, url: null },
];

const KIND_ALIAS: Record<string, string> = { "openalex-fanout": "openalex", "openalex-citers": "openalex" };
const NO_REDISTRIBUTION = new Set(["blog"]);

const clean = (sourcePath: string) => sourcePath.replace(/^.*?\/bucket-foundation\//, "");

export function kindOf(sourcePath: string): string {
  const top = clean(sourcePath).split("/")[0];
  return KIND_ALIAS[top] ?? top;
}

export interface SourceMeta {
  title: string;
  url: string | null;
  author: string | null;
  permitted: boolean;
}

function infoFile(repo: string, sourcePath: string): string | null {
  const parts = clean(sourcePath).split("/");
  const candidates = parts.length >= 3 ? [join(repo, parts[0], parts[1], "info.md")] : [];
  if (parts[parts.length - 1].endsWith(".md")) candidates.push(join(repo, ...parts));
  if (parts[0] === "_intake" && parts.length >= 3) candidates.push(join(repo, parts[0], parts[1], "README.md"));
  return candidates.find((c) => existsSync(c)) ?? null;
}

function archivePermitted(repo: string, sourcePath: string): boolean {
  const meta = join(repo, ...clean(sourcePath).split("/").slice(0, 2), "metadata.json");
  if (!existsSync(meta)) return false;
  const d = JSON.parse(readFileSync(meta, "utf8")) as { licenseurl?: string; "possible-copyright-status"?: string };
  return /creativecommons\.org\/(licenses\/publicdomain|publicdomain\/)/.test(d.licenseurl ?? "") || d["possible-copyright-status"] === "NOT_IN_COPYRIGHT";
}

function wikisourcePermitted(repo: string, sourcePath: string): boolean {
  const meta = join(repo, ...clean(sourcePath).split("/").slice(0, 2), "metadata.json");
  if (!existsSync(meta)) return false;
  const d = JSON.parse(readFileSync(meta, "utf8")) as { author_death_year?: unknown; license?: unknown; licence?: unknown; copyright?: unknown };
  const died = typeof d.author_death_year === "number" && d.author_death_year < AUTHOR_DEATH_CUTOFF;
  return died || [d.license, d.licence, d.copyright].some((v) => typeof v === "string" && /public[ -]?domain/i.test(v));
}

export function sourceMeta(repo: string, sourcePath: string): SourceMeta | null {
  const kind = kindOf(sourcePath);
  const file = infoFile(repo, sourcePath);
  if (!file) return null;
  const head = readFileSync(file, "utf8").slice(0, 4000);
  const title = head.match(/^# (.+)$/m)?.[1].trim() ?? "";
  const url = head.match(/^- \*\*(?:URL|Wikisource)\*\*: (https:\/\/\S+)/m)?.[1] ?? null;
  const author = head.match(/^- \*\*(?:Authors|By|Creator|Channel)\*\*: (.+)$/m)?.[1].replace(/ — https?:\S+$/, "").trim() || null;
  if (!title || (kind !== "_intake" && !url)) return null;
  let permitted = !NO_REDISTRIBUTION.has(kind);
  if (kind === "archive") permitted = archivePermitted(repo, sourcePath);
  if (kind === "wikisource") permitted = wikisourcePermitted(repo, sourcePath);
  if (kind === "gutenberg") permitted = /^- \*\*Copyright\*\*: False\s*$/m.test(head);
  return { title, url, author, permitted };
}

interface ClaimMeta {
  source: PackSource;
  refs: string[];
}

export function claimMeta(raw: string): ClaimMeta {
  const src = raw.match(/^- \*\*Source\*\*: \[(.*)\]\((\S+)\)\s*$/m);
  const ts = raw.match(/^- \*\*Timestamp\*\*: `([^`]+)`/m);
  const refs = [...raw.matchAll(/^- (?:Video slug|Local path): `([^`]+)`/gm)].map((m) => m[1]);
  const original = raw.match(/^- Original URL: (\S+)/m);
  const url = src?.[2] ?? original?.[1] ?? null;
  return {
    source: { title: src?.[1] ?? "", url: url && /^https:\/\//.test(url) ? url : null, timestamp: ts?.[1] ?? null },
    refs: [src?.[2], original?.[1], ...refs].filter((r): r is string => !!r),
  };
}

interface EvidenceLine {
  concept: string;
  slug: string;
  evidence: { score: number; source_path: string; text: string }[];
}

export function readEvidence(repo: string): Map<string, EvidenceLine["evidence"]> {
  const out = new Map<string, EvidenceLine["evidence"]>();
  const p = join(repo, EVIDENCE_FILE);
  if (!existsSync(p)) throw new Error(`canon pack: ${EVIDENCE_FILE} is missing`);
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const d = JSON.parse(line) as EvidenceLine;
    out.set(`${d.concept}::${d.slug}`, d.evidence);
  }
  return out;
}

const zero = (): Reasons => ({ prefix: 0, video: 0, path: 0, file: 0, text: 0 });

export interface CanonInputs {
  repo: string;
  claims: (CanonClaim & { raw: string })[];
  evidence: Map<string, EvidenceLine["evidence"]>;
  graph: RawGraph;
  centrality: Centrality;
}

export function readInputs(repo: string): CanonInputs {
  const claims = readCanonClaims(repo).map((c) => ({ ...c, raw: readFileSync(join(repo, c.path), "utf8") }));
  if (claims.length === 0) throw new Error("canon pack: no excerpts under bucket-canon");
  const centPath = join(repo, CENTRALITY_FILE);
  return {
    repo,
    claims,
    evidence: readEvidence(repo),
    graph: JSON.parse(readFileSync(join(repo, GRAPH_FILE), "utf8")) as RawGraph,
    centrality: existsSync(centPath) ? (JSON.parse(readFileSync(centPath, "utf8")) as Centrality) : NO_CENTRALITY,
  };
}

export function keepGraph(deny: Denylist, raw: RawGraph, centrality: Centrality): { graph: PackGraph; denied: number } {
  const kept = keepConnections(deny, raw);
  const ids = new Set(kept.graph.nodes.map((n) => n.id));
  const only = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).filter(([k]) => ids.has(k)));
  return { graph: { graph: kept.graph, centrality: { degree: only(centrality.degree ?? {}), weighted: only(centrality.weighted ?? {}) } }, denied: kept.denied };
}

export function assemble(inputs: CanonInputs, deny: Denylist): CanonPack {
  const graph = keepGraph(deny, inputs.graph, inputs.centrality);
  const excerpts: PackExcerpt[] = [];
  const evidence: Record<string, PackPassage[]> = {};
  const counts: CanonCounts = {
    videoIds: deny.videoIds.size,
    deniedFiles: deny.files.size,
    unreadableFiles: deny.unreadable.size,
    excerpts: { total: inputs.claims.length, kept: 0, denied: zero() },
    passages: { total: 0, kept: 0, denied: zero(), namedInListedFolders: 0, namedElsewhere: 0, droppedWithExcerpt: 0, dropped: { licence: {}, noSource: {} } },
    vectorRows: { total: inputs.claims.length, kept: 0 },
    connections: { nodes: inputs.graph.nodes.length, denied: graph.denied },
  };
  const kinds = new Set<string>(["yt"]);
  const works: Record<string, Set<string>> = {};
  const markers = new Set<string>();
  const note = (text: string) => {
    const m = marker(text);
    if (m) markers.add(m);
  };
  inputs.claims.forEach((c, rowid) => {
    const meta = claimMeta(c.raw);
    const why = denyRow(deny, [c.path, ...meta.refs], c.text);
    const passages = inputs.evidence.get(`${c.concept}::${c.slug}`) ?? [];
    counts.passages.total += passages.length;
    const kept: PackPassage[] = [];
    for (const p of passages) {
      const pWhy = denyRow(deny, [p.source_path], p.text);
      if (pWhy) {
        if (pWhy !== "file") note(p.text);
        counts.passages.denied[pWhy]++;
        if ((pWhy === "text" || pWhy === "file") && DENIED_NAME.test(p.text)) counts.passages[BACKSTOP_PREFIXES.some((b) => p.source_path.startsWith(b)) ? "namedInListedFolders" : "namedElsewhere"]++;
      } else if (why) counts.passages.droppedWithExcerpt++;
      else {
        const kind = kindOf(p.source_path);
        const src = sourceMeta(inputs.repo, p.source_path);
        const drop: Drop | null = !src ? "noSource" : !src.permitted ? "licence" : null;
        if (drop) counts.passages.dropped[drop][kind] = (counts.passages.dropped[drop][kind] ?? 0) + 1;
        else kept.push({ score: p.score, kind, source_path: p.source_path, text: p.text, url: src!.url, title: src!.title, author: src!.author });
      }
    }
    if (why) {
      note(c.text.slice(c.title.length + 2));
      counts.excerpts.denied[why]++;
      return;
    }
    excerpts.push({ rowid, branch: c.branch, concept: c.concept, slug: c.slug, title: c.title, text: c.text, path: c.path, source: meta.source });
    evidence[String(rowid)] = kept;
    for (const p of kept) {
      kinds.add(p.kind);
      (works[p.kind] ??= new Set()).add(p.source_path.split("/").slice(0, 2).join("/"));
    }
    (works.yt ??= new Set()).add(meta.source.url ?? c.path);
    counts.passages.kept += kept.length;
  });
  counts.excerpts.kept = excerpts.length;
  counts.vectorRows.kept = excerpts.length;
  const allWorks = Object.values(works).reduce((n, w) => n + w.size, 0);
  const unlicensed = [...kinds].filter((k) => !LICENCES.some((l) => l.kind === k));
  if (unlicensed.length) throw new Error(`canon pack: no licence row for ${unlicensed.sort().join(", ")}`);
  const body = { source: "bucket-canon sub-claims", excerpts, evidence, graph: graph.graph, licences: LICENCES.filter((l) => kinds.has(l.kind) || l.kind === NOTICE_KIND).map((l) => ({ ...l, works: l.kind === NOTICE_KIND ? allWorks : (works[l.kind]?.size ?? 0) })), counts };
  const sha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const pack: CanonPack = { version: sha256.slice(0, 12), sha256, ...body };
  assertClean(deny, pack, "the canon pack", markers, [...excerpts.map((e) => e.text), ...Object.values(evidence).flatMap((ps) => ps.map((p) => p.text))]);
  return pack;
}

export function buildCanonPack(repo: string, base: Denylist = buildDenylist(repo)): CanonPack {
  const inputs = readInputs(repo);
  const paths = [...inputs.evidence.values()].flatMap((ps) => ps.map((p) => p.source_path));
  return assemble(inputs, withDeniedFiles(repo, base, paths));
}

export function describeCounts(c: CanonCounts): string[] {
  const reasons = (r: Reasons) => `prefix ${r.prefix}, video ${r.video}, path ${r.path}, file ${r.file}, text ${r.text}`;
  return [
    `denied videos: ${c.videoIds}; denied aggregate files: ${c.deniedFiles}, of which unreadable ${c.unreadableFiles}`,
    `excerpts: ${c.excerpts.kept} kept of ${c.excerpts.total}; denied ${reasons(c.excerpts.denied)}`,
    `passages: ${c.passages.kept} kept of ${c.passages.total}; denied ${reasons(c.passages.denied)}; text naming the denied author in the three listed folders ${c.passages.namedInListedFolders}, elsewhere ${c.passages.namedElsewhere}; dropped with a denied excerpt ${c.passages.droppedWithExcerpt}`,
    `passages dropped for licence: ${JSON.stringify(c.passages.dropped.licence)}; with no recoverable source: ${JSON.stringify(c.passages.dropped.noSource)}`,
    `vector rows: ${c.vectorRows.kept} kept of ${c.vectorRows.total}`,
    `connections: ${c.connections.denied} denied of ${c.connections.nodes} nodes`,
  ];
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../..");
  const pack = buildCanonPack(repo);
  const text = JSON.stringify(pack);
  if (Buffer.byteLength(text) > CANON_PACK_BUDGET_BYTES) throw new Error(`canon pack: ${Buffer.byteLength(text)} bytes is over the ${CANON_PACK_BUDGET_BYTES} byte budget`);
  const outDir = resolve(import.meta.dir, "../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "canon.json"), text);
  console.log(`canon pack ${pack.version}: ${Buffer.byteLength(text)} bytes`);
  for (const l of describeCounts(pack.counts)) console.log(`  ${l}`);
}
