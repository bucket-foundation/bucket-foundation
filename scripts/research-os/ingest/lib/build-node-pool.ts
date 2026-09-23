import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPrimaryPapers, authorsShort, type PrimaryPaper } from "../../../../src/lib/canon-primary";
import { buildAcademyImport, academyNodeSlug } from "../../../../src/lib/research-os/ingest/academy";
import { buildCanonImport, type AcademyAtomRef, type CanonAtomMap, type CanonPaperLike } from "../../../../src/lib/research-os/ingest/canon";
import { pairKey } from "../../../../src/lib/research-os/ingest/infer";
import type { IngestNodeDraft } from "../../../../src/lib/research-os/ingest/types";
import { loadAcademyCorpusFiles } from "./load-academy-corpus";

export { academyNodeSlug };

const ROOT = resolve(__dirname, "..", "..", "..", "..");
const SEED_PATH = join(ROOT, "supabase", "seed", "research-os-sky-blue.json");
export const CANON_BRANCH = "02-physics";

interface SeedNode {
  slug: string;
  title: string;
  kind: IngestNodeDraft["kind"];
  tier: number;
  branch: string;
  summary: string | null;
}
interface SeedEdge {
  from: string;
  to: string;
  kind: string;
}
interface SeedFile {
  nodes: SeedNode[];
  edges: SeedEdge[];
}

function loadSeed(): SeedFile {
  return JSON.parse(readFileSync(SEED_PATH, "utf8")) as SeedFile;
}

function loadOverrideMap(mapPath: string): CanonAtomMap {
  const raw = JSON.parse(readFileSync(mapPath, "utf8")) as Record<string, unknown>;
  const map: CanonAtomMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("_")) continue;
    map[key] = value as CanonAtomMap[string];
  }
  return map;
}

function toAtomIndex(): AcademyAtomRef[] {
  const files = loadAcademyCorpusFiles(ROOT);
  const out: AcademyAtomRef[] = [];
  for (const file of files) {
    for (const atom of file.atoms) {
      out.push({ branch: file.branch, sourceFile: file.sourceFile, atomId: atom.id, title: atom.title });
    }
  }
  return out;
}

function toCanonPaperLike(p: PrimaryPaper): CanonPaperLike {
  return {
    id: p.id,
    branch: p.branch,
    concept: p.concept,
    title: p.title,
    year: p.year,
    venueName: p.venueName,
    doi: p.doi,
    canonicalUrl: p.canonicalUrl,
    canonScore: p.canonScore,
  };
}

export interface NodePool {
  nodes: IngestNodeDraft[];
  existingPrerequisitePairs: Set<string>;
}

export function buildNodePool(canonAtomMapPath: string = join(ROOT, "scripts", "research-os", "ingest", "canon-atom-map.json")): NodePool {
  const academyFiles = loadAcademyCorpusFiles(ROOT);
  const academy = buildAcademyImport(academyFiles);

  const allPapers = loadPrimaryPapers();
  const papers = allPapers.filter((p) => p.branch === CANON_BRANCH).map(toCanonPaperLike);
  const authorsLabelByPaperId = new Map(allPapers.filter((p) => p.branch === CANON_BRANCH).map((p) => [p.id, authorsShort(p)]));
  const canon = buildCanonImport({ papers, authorsLabelByPaperId, atomIndex: toAtomIndex(), overrideMap: loadOverrideMap(canonAtomMapPath) });

  const seed = loadSeed();
  const seedNodes: IngestNodeDraft[] = seed.nodes.map((n) => ({
    slug: n.slug,
    title: n.title,
    kind: n.kind,
    tier: n.tier,
    branch: n.branch,
    summary: n.summary,
    labels: { en: { title: n.title } },
    provenance: {},
  }));

  const byId = new Map<string, IngestNodeDraft>();
  for (const n of [...academy.nodes, ...canon.nodes, ...seedNodes]) byId.set(n.slug, n);

  const existingPrerequisitePairs = new Set<string>();
  for (const e of academy.edges) {
    if (e.kind === "prerequisite") existingPrerequisitePairs.add(pairKey(e.fromSlug, e.toSlug));
  }
  for (const e of seed.edges) {
    if (e.kind === "prerequisite") existingPrerequisitePairs.add(pairKey(e.from, e.to));
  }

  return { nodes: Array.from(byId.values()), existingPrerequisitePairs };
}
