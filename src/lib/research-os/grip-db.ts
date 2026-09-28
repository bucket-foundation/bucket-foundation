import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { graphService, pagedRead } from "./db";
import { learnTargetFor } from "./learn-link";
import { GRIP_BRANCHES, type AssessVerdict, type GripEdge, type GripNode } from "./grip";

export const MAX_ASSESS_EVENTS = 5000;

interface NodeRow {
  id: string;
  slug: string;
  title: string;
  branch: string;
  provenance: Record<string, unknown> | null;
}

export function toGripNode(r: NodeRow): GripNode | null {
  const p = r.provenance ?? {};
  if (p.type !== "academy_atom" || typeof p.atom_id !== "string") return null;
  const learn = learnTargetFor({ branch: r.branch, provenance: r.provenance });
  if (!learn) return null;
  return { id: r.id, slug: r.slug, title: r.title, branch: r.branch, atomKey: `${r.branch}/${p.atom_id}`, learnHref: learn.atomId ? learn.href : null };
}

export const DECK_BRANCH_ALIASES: Record<string, string> = { biophysics: "05-biophysics" };

export function deckBranch(branch: string): string {
  return DECK_BRANCH_ALIASES[branch] ?? branch;
}

export function verdictsFromEvents(rows: { props: unknown; created_at: string }[]): AssessVerdict[] {
  const out: AssessVerdict[] = [];
  for (const r of rows) {
    const props = r.props as { branch?: unknown; items?: unknown } | null;
    if (!props || typeof props.branch !== "string" || !Array.isArray(props.items)) continue;
    props.items.forEach((it, i) => {
      const item = it as { atomId?: unknown; correct?: unknown; autoGraded?: unknown };
      if (typeof item.atomId !== "string" || typeof item.correct !== "boolean" || typeof item.autoGraded !== "boolean") return;
      out.push({ atomKey: `${deckBranch(props.branch as string)}/${item.atomId}`, correct: item.correct, autoGraded: item.autoGraded, at: r.created_at, order: i });
    });
  }
  return out;
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

export async function loadAssessVerdicts(learnerId: string): Promise<AssessVerdict[]> {
  const { data, error } = await bucketService()
    .from("learn_events")
    .select("props,created_at")
    .eq("user_id", learnerId)
    .eq("name", "assess_done")
    .order("created_at", { ascending: false })
    .limit(MAX_ASSESS_EVENTS);
  if (error) throw new Error(`grip: assess read failed: ${error.message}`);
  return verdictsFromEvents((data ?? []) as { props: unknown; created_at: string }[]);
}

export async function loadGripCatalog(): Promise<{ nodes: GripNode[]; edges: GripEdge[] }> {
  const rows = await pagedRead<NodeRow>((page) =>
    graphService()
      .from("nodes")
      .select("id,slug,title,branch,provenance")
      .eq("provenance->>type", "academy_atom")
      .in("branch", Array.from(GRIP_BRANCHES))
      .order("id")
      .range(page.from, page.to) as unknown as Promise<{ data: NodeRow[] | null; error: { message: string } | null }>,
  );
  const nodes = rows.map(toGripNode).filter((n): n is GripNode => n !== null);
  const ids = nodes.map((n) => n.id);
  const edges: GripEdge[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const got = await pagedRead<{ from_id: string; to_id: string }>((page) =>
      graphService().from("edges").select("from_id,to_id").eq("kind", "prerequisite").in("to_id", chunk).order("to_id").order("from_id").range(page.from, page.to) as unknown as Promise<{
        data: { from_id: string; to_id: string }[] | null;
        error: { message: string } | null;
      }>,
    );
    edges.push(...got.map((e) => ({ fromId: e.from_id, toId: e.to_id })));
  }
  return { nodes, edges };
}
