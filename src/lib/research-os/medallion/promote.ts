import { isGraphReviewer } from "../reviewer";
import { HIDE_BELOW, type SilverStatus } from "./silver";

export const IMPORTERS = ["academy-import", "canon-import"] as const;
export type Importer = (typeof IMPORTERS)[number];

export type Promoter =
  | { by: "reviewer"; identity: { id: string; email?: string | null } | null }
  | { by: "importer"; importer: string }
  | { by: "backfill" };

export interface GoldTarget {
  kind: string;
  provenanceType: string | null;
  provenanceSource: string | null;
}

export type PromotionSubject =
  | { silver: { status: SilverStatus; confidence: number }; node: GoldTarget }
  | { silver: { status: SilverStatus; confidence: number }; edge: { kind: string; from: GoldTarget } };

export type PromotionRefusal =
  | "not_a_reviewer"
  | "importer_not_allowed"
  | "importer_out_of_scope"
  | "silver_withdrawn"
  | "silver_rejected"
  | "below_floor"
  | "excerpt_rests_on_nothing";

export type PromotionCheck = { ok: true; row: { promoted_by: Promoter["by"]; importer: Importer | null; reviewer_id: string | null } } | { ok: false; error: PromotionRefusal };

const DEPENDENCY_EDGES = new Set(["derives_from", "prerequisite"]);

export function importerCovers(importer: Importer, target: GoldTarget): boolean {
  if (importer === "academy-import") return target.provenanceType === "academy_atom";
  return target.provenanceType === "canon_entry" || (target.provenanceType === "primary_source" && /\/primary-papers\.yaml$/.test(target.provenanceSource ?? ""));
}

function isImporter(name: string): name is Importer {
  return (IMPORTERS as readonly string[]).includes(name);
}

export function checkPromotion(promoter: Promoter, subject: PromotionSubject): PromotionCheck {
  if (subject.silver.status === "withdrawn") return { ok: false, error: "silver_withdrawn" };
  if (subject.silver.status === "rejected") return { ok: false, error: "silver_rejected" };
  if (subject.silver.confidence < HIDE_BELOW) return { ok: false, error: "below_floor" };
  const target = "node" in subject ? subject.node : subject.edge.from;
  if ("edge" in subject && subject.edge.from.kind === "excerpt" && DEPENDENCY_EDGES.has(subject.edge.kind)) return { ok: false, error: "excerpt_rests_on_nothing" };

  if (promoter.by === "reviewer") {
    const reviewer = isGraphReviewer(promoter.identity);
    if (!reviewer) return { ok: false, error: "not_a_reviewer" };
    return { ok: true, row: { promoted_by: "reviewer", importer: null, reviewer_id: reviewer.id } };
  }
  if (promoter.by === "importer") {
    if (!isImporter(promoter.importer)) return { ok: false, error: "importer_not_allowed" };
    if (!importerCovers(promoter.importer, target)) return { ok: false, error: "importer_out_of_scope" };
    return { ok: true, row: { promoted_by: "importer", importer: promoter.importer, reviewer_id: null } };
  }
  return { ok: true, row: { promoted_by: "backfill", importer: null, reviewer_id: null } };
}
