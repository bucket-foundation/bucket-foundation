import { checkRepoPath, isTranscriptPath } from "./paths";

export interface LineageNode {
  slug: string;
  kind: string;
  branch: string;
  provenance: Record<string, unknown>;
}

export type Lineage =
  | { status: "file"; repoPath: string; transcript: boolean }
  | { status: "directory"; repoPath: string; transcript: boolean }
  | { status: "upload" }
  | { status: "unknown"; reason: string };

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function file(repoPath: string | null, reason: string): Lineage {
  if (!repoPath) return { status: "unknown", reason };
  const checked = checkRepoPath(repoPath);
  if (!checked.ok) return { status: "unknown", reason: `path refused: ${checked.error}` };
  return { status: "file", repoPath, transcript: isTranscriptPath(repoPath) };
}

function directory(repoPath: string): Lineage {
  const checked = checkRepoPath(repoPath);
  if (!checked.ok) return { status: "unknown", reason: `path refused: ${checked.error}` };
  return { status: "directory", repoPath, transcript: isTranscriptPath(repoPath) };
}

export function lineageFor(node: LineageNode, seedSlugs: Map<string, Set<string>>): Lineage {
  const p = node.provenance ?? {};
  const type = str(p.type);
  const branch = str(p.branch) ?? node.branch;
  const concept = str(p.concept);
  switch (type) {
    case "academy_atom":
    case "mirror":
    case "canon_entry":
      return file(str(p.source), `${type} without a source file`);
    case "primary_source":
      return str(p.source) ? file(str(p.source), "") : fromSeed(node, seedSlugs, type);
    case "canon_paper":
      return file(concept ? `bucket-canon/${node.branch}/${concept}/primary-papers.yaml` : null, "canon_paper without a concept");
    case "source_excerpt": {
      const claim = str(p.claim_slug);
      return file(concept && claim ? `bucket-canon/${branch}/sub-claims/${concept}/${claim}.md` : null, "source_excerpt without a claim slug");
    }
    case "canon_concept":
      return concept ? directory(`bucket-canon/${branch}/sub-claims/${concept}/`) : { status: "unknown", reason: "canon_concept without a concept" };
    case "canon_bridge":
      return file("_intake/embeddings-v2/clusters.json", "");
    case "canon_figure":
      return file("canon-figures/figures.json", "");
    case "canon_site":
      return file("src/data/canon-sites.json", "");
    case "intake_digest":
    case "literature_paper":
      return file(str(p.file), `${type} without a file`);
    case "intake_paper": {
      const digest = str(p.digest);
      return file(digest ? `_intake/concept-digests/${digest}.md` : null, "intake_paper without a digest");
    }
    case "intake_target": {
      const folder = str(p.folder);
      return file(folder ? `${folder.replace(/\/+$/, "")}/README.md` : null, "intake_target without a folder");
    }
    case "import":
      return { status: "upload" };
    default:
      return fromSeed(node, seedSlugs, type);
  }
}

function fromSeed(node: LineageNode, seedSlugs: Map<string, Set<string>>, type: string | null): Lineage {
  for (const [seedFile, slugs] of Array.from(seedSlugs.entries())) {
    if (slugs.has(node.slug)) return file(seedFile, "");
  }
  return { status: "unknown", reason: `no bronze rule for provenance type ${type ?? "(none)"}` };
}
