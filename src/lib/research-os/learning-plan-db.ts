import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fusedConceptMastery, MASTERED_THRESHOLD, type ProficiencyState, type StoredCard } from "@/lib/academy/mastery";
import { graphService } from "./db";
import { filterSubgraphForViewer } from "./access-db";
import { learnTargetFor } from "./learn-link";
import { MAX_CLOSURE_EDGES, MAX_CLOSURE_NODES, planPath, type PlanResult } from "./learning-plan";
import type { Visibility } from "./access";

export const CHUNK = 200;
export const EDGE_PAGE = 1000;

export interface PlanNode {
  id: string;
  slug: string;
  title: string;
  tier: number;
  branch: string;
  learnHref: string | null;
  atom: { branchFile: string; atomId: string } | null;
}

export interface ClosureNodeRow {
  id: string;
  slug: string;
  title: string;
  tier: number;
  branch: string;
  provenance: Record<string, unknown> | null;
  visibility: string | null;
  owner_id: string | null;
}

export interface PlanStore {
  nodeBySlug(slug: string): Promise<ClosureNodeRow | null>;
  nodesByIds(ids: string[]): Promise<ClosureNodeRow[]>;
  prerequisiteParents(ids: string[]): Promise<{ from_id: string; to_id: string }[]>;
  practiceProgress(learnerId: string): Promise<Record<string, unknown>>;
  filterForViewer(nodes: ClosureNodeRow[], viewerId: string | null): Promise<{ ok: true; ids: Set<string> } | { ok: false }>;
}

export type LoadedPlan =
  | { status: "not_found" }
  | { status: "unavailable" }
  | { status: "limit"; target: PlanNode }
  | { status: "plan"; target: PlanNode; plan: PlanResult; nodes: Record<string, PlanNode> };

function toPlanNode(r: ClosureNodeRow): PlanNode {
  const learn = learnTargetFor({ branch: r.branch, provenance: r.provenance });
  const p = r.provenance ?? {};
  const atom = p.type === "academy_atom" && typeof p.atom_id === "string" && learn ? { branchFile: learn.branchFile, atomId: p.atom_id } : null;
  return { id: r.id, slug: r.slug, title: r.title, tier: r.tier, branch: r.branch, learnHref: learn?.atomId ? learn.href : null, atom };
}

export function practiceMastered(nodes: PlanNode[], progress: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  for (const n of nodes) {
    if (!n.atom) continue;
    for (const key of Array.from(new Set([n.branch, n.atom.branchFile]))) {
      const state = progress[key] as { cards?: Record<string, StoredCard>; prof?: Record<string, ProficiencyState> } | undefined;
      const card = state?.cards?.[n.atom.atomId];
      if (card && fusedConceptMastery(card, state?.prof?.[n.atom.atomId]).mastery >= MASTERED_THRESHOLD) out.add(n.id);
    }
  }
  return out;
}

export async function loadPlan(store: PlanStore, slug: string, viewerId: string | null, limits = { nodes: MAX_CLOSURE_NODES, edges: MAX_CLOSURE_EDGES }): Promise<LoadedPlan> {
  const targetRow = await store.nodeBySlug(slug);
  if (!targetRow) return { status: "not_found" };
  const visibleTarget = await store.filterForViewer([targetRow], viewerId);
  if (!visibleTarget.ok) return { status: "unavailable" };
  if (!visibleTarget.ids.has(targetRow.id)) return { status: "not_found" };
  const target = toPlanNode(targetRow);

  const parents = new Map<string, string[]>([[targetRow.id, []]]);
  let frontier = [targetRow.id];
  let edgeCount = 0;
  while (frontier.length > 0) {
    const rows: { from_id: string; to_id: string }[] = [];
    for (let i = 0; i < frontier.length; i += CHUNK) rows.push(...(await store.prerequisiteParents(frontier.slice(i, i + CHUNK))));
    edgeCount += rows.length;
    if (edgeCount > limits.edges) return { status: "limit", target };
    const next: string[] = [];
    for (const e of rows) {
      const list = parents.get(e.to_id) ?? [];
      if (!list.includes(e.from_id)) list.push(e.from_id);
      parents.set(e.to_id, list);
      if (!parents.has(e.from_id)) {
        parents.set(e.from_id, []);
        next.push(e.from_id);
      }
    }
    if (parents.size > limits.nodes) return { status: "limit", target };
    frontier = next;
  }

  const ids = Array.from(parents.keys());
  const rows: ClosureNodeRow[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) rows.push(...(await store.nodesByIds(ids.slice(i, i + CHUNK))));
  if (rows.length !== ids.length) return { status: "unavailable" };
  const visible = await store.filterForViewer(rows, viewerId);
  if (!visible.ok || visible.ids.size !== ids.length) return { status: "unavailable" };

  const nodes = rows.map(toPlanNode);
  const mastery = viewerId ? practiceMastered(nodes, await store.practiceProgress(viewerId)) : new Set<string>();
  const plan = planPath(parents, targetRow.id, mastery, limits.nodes);
  if (plan.status === "limit") return { status: "limit", target };
  return { status: "plan", target, plan, nodes: Object.fromEntries(nodes.map((n) => [n.id, n])) };
}

const NODE_COLUMNS = "id,slug,title,tier,branch,provenance,visibility,owner_id";

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`learning-plan: ${what} failed: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

let bucketSvc: SupabaseClient | null = null;
function bucketService(): SupabaseClient {
  if (bucketSvc) return bucketSvc;
  bucketSvc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return bucketSvc;
}

export const dbPlanStore: PlanStore = {
  async nodeBySlug(slug) {
    const res = await graphService().from("nodes").select(NODE_COLUMNS).eq("slug", slug).maybeSingle();
    if (res.error) throw new Error(`learning-plan: target read failed: ${res.error.message}`);
    return (res.data as ClosureNodeRow | null) ?? null;
  },
  async nodesByIds(ids) {
    return must(await graphService().from("nodes").select(NODE_COLUMNS).in("id", ids).limit(ids.length), "node read") as ClosureNodeRow[];
  },
  async prerequisiteParents(ids) {
    const out: { from_id: string; to_id: string }[] = [];
    for (let from = 0; from <= MAX_CLOSURE_EDGES; from += EDGE_PAGE) {
      const page = must(
        await graphService().from("edges").select("from_id,to_id").eq("kind", "prerequisite").in("to_id", ids).order("to_id").order("from_id").range(from, from + EDGE_PAGE - 1),
        "edge read",
      ) as { from_id: string; to_id: string }[];
      out.push(...page);
      if (page.length < EDGE_PAGE) break;
    }
    return out;
  },
  async practiceProgress(learnerId) {
    const rows = must(await bucketService().from("academy_progress").select("branch,data").eq("user_id", learnerId), "progress read") as { branch: string; data: unknown }[];
    return Object.fromEntries(rows.map((r) => [r.branch, r.data]));
  },
  async filterForViewer(nodes, viewerId) {
    const r = await filterSubgraphForViewer(
      nodes.map((n) => ({ id: n.id, visibility: (n.visibility ?? "public") as Visibility, ownerId: n.owner_id })),
      [] as { fromId: string; toId: string }[],
      viewerId,
    );
    return r.ok ? { ok: true, ids: new Set(r.nodes.map((n) => n.id)) } : { ok: false };
  },
};
