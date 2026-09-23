import type { RightsPolicy } from "../evidence/rights";
import { byteLength } from "../evidence/text";
import { bronzeRecord, directoryManifest, rightsForTypes, type BronzeRecord } from "./bronze";
import { lineageFor, type Lineage, type LineageNode } from "./lineage";
import { locateSpan, silverItem, type SilverDraft, type SilverKind } from "./silver";

export interface MedallionIO {
  readFile(repoPath: string): Uint8Array | null;
  listDir(repoPath: string): string[] | null;
}

export interface PlanNode extends LineageNode {
  title: string;
}

export interface PlanInput {
  nodes: PlanNode[];
  io: MedallionIO;
  policy: RightsPolicy;
  seedSlugs: Map<string, Set<string>>;
  parser: string;
  parserRevision: string;
}

export interface MedallionPlan {
  bronze: BronzeRecord[];
  silver: SilverDraft[];
  silverBySlug: Map<string, SilverDraft>;
  lineage: Map<string, Lineage>;
  unknown: { slug: string; provenanceType: string | null; reason: string }[];
  uploads: string[];
}

const CLAIM_KINDS = new Set(["excerpt", "primary_source", "fact"]);

export function silverKindFor(nodeKind: string): SilverKind {
  return CLAIM_KINDS.has(nodeKind) ? "claim" : "term";
}

function provenanceType(n: PlanNode): string | null {
  const t = n.provenance?.type;
  return typeof t === "string" ? t : null;
}

function locatorFor(n: PlanNode): string | null {
  const ts = n.provenance?.timestamp;
  return typeof ts === "string" && ts.length > 0 ? ts : null;
}

export function silverKey(s: Pick<SilverDraft, "source_id" | "source_revision" | "parser" | "parser_revision" | "kind" | "span_start" | "span_end">): string {
  return [s.source_id, s.source_revision, s.parser, s.parser_revision, s.kind, s.span_start, s.span_end].join(" ");
}

export function planMedallion(input: PlanInput): MedallionPlan {
  const lineage = new Map<string, Lineage>();
  const unknown: MedallionPlan["unknown"] = [];
  const uploads: string[] = [];
  const byPath = new Map<string, { directory: boolean; nodes: PlanNode[] }>();

  for (const n of input.nodes) {
    const l = lineageFor(n, input.seedSlugs);
    if (l.status === "unknown") {
      lineage.set(n.slug, l);
      unknown.push({ slug: n.slug, provenanceType: provenanceType(n), reason: l.reason });
      continue;
    }
    if (l.status === "upload") {
      lineage.set(n.slug, l);
      uploads.push(n.slug);
      continue;
    }
    lineage.set(n.slug, l);
    const group = byPath.get(l.repoPath) ?? { directory: l.status === "directory", nodes: [] };
    group.nodes.push(n);
    byPath.set(l.repoPath, group);
  }

  const bronze: BronzeRecord[] = [];
  const silverByKey = new Map<string, SilverDraft>();
  const silverBySlug = new Map<string, SilverDraft>();
  for (const [repoPath, group] of Array.from(byPath.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    let bytes: Uint8Array | null;
    if (group.directory) {
      const names = input.io.listDir(repoPath);
      bytes = names ? Buffer.from(directoryManifest(names), "utf8") : null;
    } else {
      bytes = input.io.readFile(repoPath);
    }
    if (!bytes) {
      for (const n of group.nodes) {
        const reason = `bronze file missing: ${repoPath}`;
        lineage.set(n.slug, { status: "unknown", reason });
        unknown.push({ slug: n.slug, provenanceType: provenanceType(n), reason });
      }
      continue;
    }
    const rights = rightsForTypes(
      input.policy,
      group.nodes.map((n) => ({ slug: n.slug, provenanceType: provenanceType(n) })),
      input.seedSlugs,
    );
    const b = bronzeRecord(repoPath, bytes, rights);
    bronze.push(b);
    for (const n of group.nodes) {
      const found = locateSpan(b.text, n.title);
      const span = found ?? { start: 0, end: byteLength(b.text) };
      const item = silverItem(b, span, {
        kind: silverKindFor(n.kind),
        locator: locatorFor(n),
        parser: input.parser,
        parserRevision: input.parserRevision,
        confidenceParts: { parse: 1, match: found ? 1 : 0.5 },
        proposal: { slug: n.slug, kind: n.kind, title: n.title, branch: n.branch },
      });
      const key = silverKey(item);
      const kept = silverByKey.get(key) ?? item;
      silverByKey.set(key, kept);
      silverBySlug.set(n.slug, kept);
    }
  }

  return { bronze, silver: Array.from(silverByKey.values()), silverBySlug, lineage, unknown, uploads };
}
