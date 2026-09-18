/**
 * Learn to graph: when a person's mastery of an Academy atom crosses the
 * mastered threshold, the graph node ingested from that atom (provenance
 * type "academy_atom") moves to Understanding. Runs after every progress
 * write in /api/academy/progress, best-effort, so the Learn module and
 * the workspace read one state of the person.
 */
import { MASTERED_THRESHOLD, fusedConceptMastery, type StoredEngineState } from "../academy/mastery";
import { graphService, recordEvidence } from "./db";
import { onAcademyMastery } from "./stages";
import type { Stage } from "./types";

/** Atom ids whose fused mastery meets the threshold, from a stored progress blob. Pure. */
export function masteredAtomIds(data: unknown, threshold: number = MASTERED_THRESHOLD): { id: string; mastery: number }[] {
  const s = (data && typeof data === "object" ? data : {}) as StoredEngineState;
  const cards = s.cards ?? {};
  const prof = s.prof ?? {};
  const out: { id: string; mastery: number }[] = [];
  for (const id of Object.keys(cards)) {
    const m = fusedConceptMastery(cards[id], prof[id]).mastery;
    if (m >= threshold) out.push({ id, mastery: m });
  }
  return out;
}

export interface LearnSyncResult {
  considered: number;
  advanced: number;
}

export async function syncAcademyMastery(userId: string, branch: string, data: unknown): Promise<LearnSyncResult> {
  const mastered = masteredAtomIds(data);
  if (mastered.length === 0) return { considered: 0, advanced: 0 };
  const svc = graphService();
  const { data: nodes, error } = await svc
    .from("nodes")
    .select("id,provenance")
    .eq("provenance->>type", "academy_atom")
    .eq("provenance->>branch", branch)
    .in(
      "provenance->>atom_id",
      mastered.map((m) => m.id)
    );
  if (error || !nodes || nodes.length === 0) return { considered: mastered.length, advanced: 0 };
  const byAtom = new Map(mastered.map((m) => [m.id, m.mastery]));
  const nodeIds = (nodes as { id: string }[]).map((n) => n.id);
  const { data: states } = await svc.from("learner_node_state").select("node_id,stage").eq("learner_id", userId).in("node_id", nodeIds);
  const stageOf = new Map(((states as { node_id: string; stage: Stage }[]) || []).map((r) => [r.node_id, r.stage]));
  let advanced = 0;
  for (const n of nodes as { id: string; provenance: { atom_id?: string } | null }[]) {
    const atomId = n.provenance?.atom_id;
    if (!atomId) continue;
    const current = stageOf.get(n.id) ?? "access";
    const t = onAcademyMastery(current, { atomId, branch, mastery: byAtom.get(atomId) ?? 0, threshold: MASTERED_THRESHOLD });
    if (t.nextStage === current) continue;
    try {
      await recordEvidence(userId, n.id, t.nextStage, t.event as unknown as Record<string, unknown>);
      advanced++;
    } catch {
      // A failed write on one node never blocks the rest.
    }
  }
  return { considered: mastered.length, advanced };
}
