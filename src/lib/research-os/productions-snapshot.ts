export const PRODUCTION_STATUSES = ["returned", "submitted", "draft", "accepted"] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export interface SnapshotProduction {
  id: string;
  kind: string;
  status: ProductionStatus;
  claim: string | null;
  target_node_id: string;
  related_node_id: string | null;
  node_id: string | null;
  notes: { at: string; decision?: string; reason?: string | null }[];
  updated_at: string;
}

export interface ProductionsSnapshot {
  productions: SnapshotProduction[];
  nodes: Record<string, { slug: string; title: string; kind: string }>;
}

export const MAX_PRODUCTIONS = 5000;

export class SnapshotError extends Error {}

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, n = 4000): string | null => (typeof v === "string" ? v.slice(0, n) : null);

export function parseProductionsSnapshot(raw: unknown): ProductionsSnapshot {
  if (!obj(raw) || !Array.isArray(raw.productions) || !obj(raw.nodes)) throw new SnapshotError("expected the productions JSON saved from the web: { productions, nodes }");
  if (raw.productions.length > MAX_PRODUCTIONS) throw new SnapshotError(`more than ${MAX_PRODUCTIONS} productions`);
  const productions: SnapshotProduction[] = [];
  for (const p of raw.productions) {
    if (!obj(p)) continue;
    const id = str(p.id, 64);
    const target = str(p.target_node_id, 64);
    const updated = str(p.updated_at, 40);
    if (!id || !target || !updated || !(PRODUCTION_STATUSES as readonly unknown[]).includes(p.status)) continue;
    productions.push({
      id,
      kind: str(p.kind, 40) ?? "production",
      status: p.status as ProductionStatus,
      claim: str(p.claim),
      target_node_id: target,
      related_node_id: str(p.related_node_id, 64),
      node_id: str(p.node_id, 64),
      notes: Array.isArray(p.notes)
        ? p.notes.filter(obj).slice(0, 50).map((n) => ({ at: str(n.at, 40) ?? "", decision: str(n.decision, 40) ?? undefined, reason: str(n.reason, 2000) }))
        : [],
      updated_at: updated,
    });
  }
  const nodes: ProductionsSnapshot["nodes"] = {};
  for (const [k, v] of Object.entries(raw.nodes).slice(0, 20_000)) {
    if (obj(v) && typeof v.title === "string") nodes[k.slice(0, 64)] = { slug: str(v.slug, 200) ?? "", title: v.title.slice(0, 400), kind: str(v.kind, 40) ?? "" };
  }
  return { productions, nodes };
}
