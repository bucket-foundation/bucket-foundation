import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readCanonClaims, type CanonClaim } from "../../../../src/lib/canon-index-loader";
import { assertClean, BACKSTOP_PREFIXES, buildDenylist, denyRow, keepConnections, DENIED_NAME, marker, withDeniedFiles, type Denial, type Denylist, type GraphLike } from "./rights";

export const CANON_PACK_BUDGET_BYTES = 6 * 1024 * 1024;
const EVIDENCE_FILE = "_intake/embeddings/claim-evidence.jsonl";
const GRAPH_FILE = "_intake/connections/graph.json";

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
}

export interface Licence {
  kind: string;
  name: string;
  terms: string;
  url: string | null;
}

type Reasons = Record<Denial, number>;

export interface CanonCounts {
  videoIds: number;
  deniedFiles: number;
  unreadableFiles: number;
  excerpts: { total: number; kept: number; denied: Reasons };
  passages: { total: number; kept: number; denied: Reasons; namedInListedFolders: number; namedElsewhere: number; droppedWithExcerpt: number };
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
  counts: CanonCounts;
}

export const LICENCES: Licence[] = [
  { kind: "yt", name: "YouTube transcripts", terms: "Transcript excerpts of public videos. Copyright stays with each speaker and channel. Each excerpt links to its video.", url: "https://www.youtube.com" },
  { kind: "gutenberg", name: "Project Gutenberg", terms: "Public domain in the United States.", url: "https://www.gutenberg.org/policy/permission.html" },
  { kind: "wikisource", name: "Wikisource", terms: "CC BY-SA 4.0 or public domain, as marked on each page.", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { kind: "pubmed", name: "PubMed abstracts", terms: "Copyright stays with each publisher. Each passage carries its PMID.", url: "https://pubmed.ncbi.nlm.nih.gov" },
  { kind: "arxiv", name: "arXiv", terms: "The licence each author chose. Each passage carries its arXiv id.", url: "https://arxiv.org/help/license" },
  { kind: "openalex", name: "OpenAlex", terms: "CC0.", url: "https://openalex.org" },
  { kind: "archive", name: "Internet Archive", terms: "Rights vary by item. Each passage carries its item id.", url: "https://archive.org" },
  { kind: "blog", name: "Web articles", terms: "Copyright stays with each author. Short quoted passages.", url: null },
  { kind: "_intake", name: "Bucket Foundation notes", terms: "Working notes written from the sources in this table.", url: "https://bucket.foundation" },
];

const KIND_ALIAS: Record<string, string> = { "openalex-fanout": "openalex", "openalex-citers": "openalex" };

export function kindOf(sourcePath: string): string {
  const top = sourcePath.replace(/^.*?\/bucket-foundation\//, "").split("/")[0];
  return KIND_ALIAS[top] ?? top;
}

export function sourceUrl(sourcePath: string): string | null {
  const [top, name = ""] = sourcePath.replace(/^.*?\/bucket-foundation\//, "").split("/");
  let m: RegExpMatchArray | null;
  if (top === "yt" && (m = name.match(/^([A-Za-z0-9_-]{11})-/))) return `https://www.youtube.com/watch?v=${m[1]}`;
  if (top === "pubmed" && (m = name.match(/^PMID-(\d+)/))) return `https://pubmed.ncbi.nlm.nih.gov/${m[1]}/`;
  if (top === "gutenberg" && (m = name.match(/^PG-(\d+)/))) return `https://www.gutenberg.org/ebooks/${m[1]}`;
  if (top === "arxiv" && (m = name.match(/^(\d{4}\.\d{4,5})/))) return `https://arxiv.org/abs/${m[1]}`;
  if (top === "arxiv" && (m = name.match(/^([a-z-]+)_(\d{7})/))) return `https://arxiv.org/abs/${m[1]}/${m[2]}`;
  if (top.startsWith("openalex") && (m = name.match(/^([AW]\d+)/))) return `https://openalex.org/${m[1]}`;
  return null;
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
  claims: (CanonClaim & { raw: string })[];
  evidence: Map<string, EvidenceLine["evidence"]>;
  graph: GraphLike;
}

export function readInputs(repo: string): CanonInputs {
  const claims = readCanonClaims(repo).map((c) => ({ ...c, raw: readFileSync(join(repo, c.path), "utf8") }));
  if (claims.length === 0) throw new Error("canon pack: no excerpts under bucket-canon");
  return { claims, evidence: readEvidence(repo), graph: JSON.parse(readFileSync(join(repo, GRAPH_FILE), "utf8")) as GraphLike };
}

export function assemble(inputs: CanonInputs, deny: Denylist): CanonPack {
  const excerpts: PackExcerpt[] = [];
  const evidence: Record<string, PackPassage[]> = {};
  const counts: CanonCounts = {
    videoIds: deny.videoIds.size,
    deniedFiles: deny.files.size,
    unreadableFiles: deny.unreadable.size,
    excerpts: { total: inputs.claims.length, kept: 0, denied: zero() },
    passages: { total: 0, kept: 0, denied: zero(), namedInListedFolders: 0, namedElsewhere: 0, droppedWithExcerpt: 0 },
    vectorRows: { total: inputs.claims.length, kept: 0 },
    connections: { nodes: inputs.graph.nodes.length, denied: keepConnections(deny, inputs.graph).denied },
  };
  const kinds = new Set<string>(["yt"]);
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
      else kept.push({ score: p.score, kind: kindOf(p.source_path), source_path: p.source_path, text: p.text, url: sourceUrl(p.source_path) });
    }
    if (why) {
      note(c.text.slice(c.title.length + 2));
      counts.excerpts.denied[why]++;
      return;
    }
    excerpts.push({ rowid, branch: c.branch, concept: c.concept, slug: c.slug, title: c.title, text: c.text, path: c.path, source: meta.source });
    evidence[String(rowid)] = kept;
    for (const p of kept) kinds.add(p.kind);
    counts.passages.kept += kept.length;
  });
  counts.excerpts.kept = excerpts.length;
  counts.vectorRows.kept = excerpts.length;
  const unlicensed = [...kinds].filter((k) => !LICENCES.some((l) => l.kind === k));
  if (unlicensed.length) throw new Error(`canon pack: no licence row for ${unlicensed.sort().join(", ")}`);
  const body = { source: "bucket-canon sub-claims", excerpts, evidence, licences: LICENCES.filter((l) => kinds.has(l.kind)), counts };
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
