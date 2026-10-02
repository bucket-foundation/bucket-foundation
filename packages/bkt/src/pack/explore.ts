import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readCanonClaims } from "../../../../src/lib/canon-index-loader";
import { CANON_FILES } from "../../../../src/lib/explore/canon-files";
import { parseTalk, type Talk } from "../../../../src/lib/explore/talks";
import { parseReferenceBasis, type ReferenceBasis } from "../../../../src/lib/explore/reference-core";
import { SOURCE_LABEL, sourceUrl, type SourceIndex, type SourceKind } from "../../../../src/lib/explore/source-index";
import type { Licence } from "./canon";
import { assertClean, buildDenylist, denyRow, marker, type Denial, type Denylist } from "./rights";

export const EXPLORE_PACK_BUDGET_BYTES = 4 * 1024 * 1024;
export const SOURCES_FILE = "src/data/explore-sources.json";
export const FOUNDING_FILE = "src/data/founding-works.json";
export const REFERENCE_FILE = "src/data/explore/reference-basis.json";
export const TIMELINE_FILE = "src/data/canon-timeline.json";
export const FOUNDING_SCHEMA = "bucket.founding-works/1";

export type PackSourceRow = [kind: SourceKind, id: string, title: string, year: number | null, by: string];

type Reasons = Record<Denial, number>;
type PerKind = Record<SourceKind, number>;

export interface ExploreCounts {
  videoIds: number;
  sources: { total: number; kept: number; denied: Reasons; keptByKind: PerKind; deniedByKind: PerKind };
  years: { total: number; kept: number };
  foundingWorks: { total: number; approved: number };
  referenceTerms: number;
  talks: { total: number; kept: number };
}

export interface FoundingRow {
  reviewer?: unknown;
  basis_verified?: unknown;
  disputed?: unknown;
  [key: string]: unknown;
}

export interface FoundingWorks {
  schema: string;
  rows: FoundingRow[];
  [key: string]: unknown;
}

export function approvedFoundingRows(works: FoundingWorks): FoundingRow[] {
  return works.rows.filter((r) => typeof r.reviewer === "string" && r.reviewer.trim() !== "" && r.basis_verified === true && r.disputed !== true);
}

export interface ExplorePack {
  version: string;
  sha256: string;
  source: string;
  sources: PackSourceRow[];
  years: Record<string, number>;
  foundingWorks: FoundingRow[];
  referenceBasis: ReferenceBasis;
  talks: Record<string, Talk>;
  licences: Licence[];
  counts: ExploreCounts;
}

export const EXPLORE_LICENCES: Record<SourceKind, Omit<Licence, "works" | "kind">> = {
  o: { name: SOURCE_LABEL.o, terms: "Titles, authors and years from openalex.org, released under CC0. Each row links to its OpenAlex record.", url: "https://openalex.org" },
  p: { name: SOURCE_LABEL.p, terms: "Titles, authors and years from pubmed.ncbi.nlm.nih.gov, citation data of the US National Library of Medicine. Each row links to its PubMed record.", url: "https://pubmed.ncbi.nlm.nih.gov" },
  a: { name: SOURCE_LABEL.a, terms: "Titles, authors and years from arxiv.org, whose metadata is released under CC0. Each row links to its arXiv record.", url: "https://arxiv.org" },
  g: { name: SOURCE_LABEL.g, terms: "Titles and authors of books at gutenberg.org. Each row links to its book page.", url: "https://www.gutenberg.org" },
  w: { name: SOURCE_LABEL.w, terms: "Titles of pages at en.wikisource.org. Each row links to its page, and the page text stays on Wikisource under CC BY-SA 4.0.", url: "https://en.wikisource.org" },
  y: { name: SOURCE_LABEL.y, terms: "Titles, channel names and years of public videos on youtube.com. The pack holds no transcript and no description text. Each row links to its video.", url: "https://www.youtube.com" },
  d: { name: SOURCE_LABEL.d, terms: "Titles, authors and years of primary papers from Crossref and OpenAlex, released under CC0. Each row links to its DOI.", url: "https://doi.org" },
};

const KINDS = Object.keys(EXPLORE_LICENCES) as SourceKind[];
const zero = (): Reasons => ({ prefix: 0, video: 0, path: 0, file: 0, text: 0 });
const perKind = (): PerKind => ({ o: 0, p: 0, a: 0, g: 0, w: 0, y: 0, d: 0 });

export interface ExploreInputs {
  index: SourceIndex;
  timeline: { events: { id: string; title?: string; year: number }[] };
  foundingWorks: FoundingWorks;
  referenceBasis: ReferenceBasis;
  talks?: Record<string, Talk>;
}

export function readTalks(repo: string): Record<string, Talk> {
  const out: Record<string, Talk> = {};
  for (const c of readCanonClaims(repo)) {
    let talk: Talk | null = null;
    try {
      talk = parseTalk(readFileSync(join(repo, c.path), "utf8").slice(0, 2000));
    } catch {
      talk = null;
    }
    if (talk) out[c.path] = talk;
  }
  return out;
}

function readJson(repo: string, file: string): unknown {
  return JSON.parse(readFileSync(join(repo, file), "utf8"));
}

export function readExploreInputs(repo: string): ExploreInputs {
  const index = readJson(repo, SOURCES_FILE) as SourceIndex;
  if (index?.v !== 1 || !Array.isArray(index.items) || index.items.length === 0) throw new Error(`explore pack: ${SOURCES_FILE} holds no rows`);
  const foundingWorks = readJson(repo, FOUNDING_FILE) as FoundingWorks;
  if (foundingWorks?.schema !== FOUNDING_SCHEMA || !Array.isArray(foundingWorks.rows)) throw new Error(`explore pack: ${FOUNDING_FILE} is not a ${FOUNDING_SCHEMA} file`);
  return { index, timeline: readJson(repo, TIMELINE_FILE) as ExploreInputs["timeline"], foundingWorks, referenceBasis: parseReferenceBasis(readJson(repo, REFERENCE_FILE)), talks: readTalks(repo) };
}

export interface ExploreSplit {
  kept: PackSourceRow[];
  denied: { row: SourceIndex["items"][number]; why: Denial }[];
}

export function splitSources(index: SourceIndex, deny: Denylist): ExploreSplit {
  const out: ExploreSplit = { kept: [], denied: [] };
  for (const row of index.items) {
    const [kind, id, title, year, snippet, by] = row;
    if (!KINDS.includes(kind)) throw new Error(`explore pack: no licence row for source kind ${kind}`);
    const why = denyRow(deny, [sourceUrl(kind, id)], `${title} ${snippet} ${by}`);
    if (why) out.denied.push({ row, why });
    else out.kept.push([kind, id, title, year, by]);
  }
  return out;
}

export function deniedSourceMarkers(split: ExploreSplit): string[] {
  const out = new Set<string>();
  for (const { row } of split.denied) {
    if (row[0] === "y") out.add(row[1]);
    const m = marker(row[2]);
    if (m) out.add(m);
  }
  return [...out];
}

export function assembleExplore(inputs: ExploreInputs, deny: Denylist): ExplorePack {
  const split = splitSources(inputs.index, deny);
  const approved = approvedFoundingRows(inputs.foundingWorks);
  const counts: ExploreCounts = {
    videoIds: deny.videoIds.size,
    sources: { total: inputs.index.items.length, kept: split.kept.length, denied: zero(), keptByKind: perKind(), deniedByKind: perKind() },
    years: { total: inputs.timeline.events.length, kept: 0 },
    foundingWorks: { total: inputs.foundingWorks.rows.length, approved: approved.length },
    referenceTerms: inputs.referenceBasis.vocab.length,
    talks: { total: 0, kept: 0 },
  };
  const talks: Record<string, Talk> = {};
  for (const [path, t] of Object.entries(inputs.talks ?? {})) {
    counts.talks.total++;
    if (denyRow(deny, [path, `https://www.youtube.com/watch?v=${t.id}`], t.title)) continue;
    talks[path] = t;
    counts.talks.kept++;
  }
  for (const r of split.kept) counts.sources.keptByKind[r[0]]++;
  for (const d of split.denied) {
    counts.sources.denied[d.why]++;
    counts.sources.deniedByKind[d.row[0]]++;
  }
  const years: Record<string, number> = {};
  for (const e of inputs.timeline.events) if (!denyRow(deny, [e.id], e.title ?? "")) years[e.id] = e.year;
  counts.years.kept = Object.keys(years).length;
  const licences = KINDS.filter((k) => counts.sources.keptByKind[k] > 0).map((k) => ({ kind: k, ...EXPLORE_LICENCES[k], works: counts.sources.keptByKind[k] }));
  const body = { source: "explore source index", sources: split.kept, years, foundingWorks: approved, referenceBasis: inputs.referenceBasis, talks, licences, counts };
  const sha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const pack: ExplorePack = { version: sha256.slice(0, 12), sha256, ...body };
  const { referenceBasis, ...rest } = pack;
  assertClean(deny, rest, "the explore pack", deniedSourceMarkers(split), split.kept.map((r) => r[2]));
  assertClean(deny, { vocab: referenceBasis.vocab, stop_words: referenceBasis.stop_words, components: referenceBasis.components }, "the explore reference basis");
  assertClean(deny, CANON_FILES, "the canon file list");
  return pack;
}

export function buildExplorePack(repo: string, deny: Denylist = buildDenylist(repo)): ExplorePack {
  return assembleExplore(readExploreInputs(repo), deny);
}

export function describeExploreCounts(c: ExploreCounts): string[] {
  const s = c.sources;
  return [
    `sources: ${s.kept} kept of ${s.total}; denied prefix ${s.denied.prefix}, video ${s.denied.video}, path ${s.denied.path}, file ${s.denied.file}, text ${s.denied.text}`,
    `kept by kind: ${JSON.stringify(s.keptByKind)}; denied by kind: ${JSON.stringify(s.deniedByKind)}`,
    `timeline years: ${c.years.kept} kept of ${c.years.total}; founding works: ${c.foundingWorks.approved} approved of ${c.foundingWorks.total}; reference terms: ${c.referenceTerms}; talk titles: ${c.talks.kept} kept of ${c.talks.total}`,
  ];
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../..");
  const pack = buildExplorePack(repo);
  const text = JSON.stringify(pack);
  const bytes = Buffer.byteLength(text);
  if (bytes > EXPLORE_PACK_BUDGET_BYTES) throw new Error(`explore pack: ${bytes} bytes is over the ${EXPLORE_PACK_BUDGET_BYTES} byte budget`);
  const outDir = resolve(import.meta.dir, "../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "explore.json"), text);
  console.log(`explore pack ${pack.version}: ${bytes} bytes`);
  for (const l of describeExploreCounts(pack.counts)) console.log(`  ${l}`);
}
