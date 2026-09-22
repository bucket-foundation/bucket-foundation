/**
 * GET /api/research-os/node?slug=<slug>
 * Everything the node page needs in one read: the node, the viewer's
 * standing and evidence, prerequisites and dependents, directions, the
 * Learn target, productions on the node (the viewer's own and the public
 * nodes that extend, replicate, or review it), the viewer's verbs, the
 * assignments that target it in the viewer's classes, and for staff the
 * class holders by level. Signed out: public nodes, no standing.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService, inChunks, loadSubgraph, verifyLearnerIdentity } from "@/lib/research-os/db";
import { filterSubgraphForViewer, loadGrants, loadNodeAccess, loadViewerGroups } from "@/lib/research-os/access-db";
import { can, canView, type GrantRole, type Viewer } from "@/lib/research-os/access";
import { directionsFrom } from "@/lib/research-os/directions";
import { learnTargetFor } from "@/lib/research-os/learn-link";
import { listMyClasses } from "@/lib/research-os/classes";
import type { Stage } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });
const VERBS: GrantRole[] = ["view", "continue", "extend", "cite", "replicate", "review"];
const ACTING = ["extends", "replicates", "reviews", "answers"];

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const slug = (new URL(req.url).searchParams.get("slug") || "").trim();
  if (!slug || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/.test(slug)) return bad(400, "slug_required");
  const identity = await verifyLearnerIdentity(req);
  const viewerId = identity?.id ?? null;
  const svc = graphService();

  const { data: row, error } = await svc
    .from("nodes")
    .select("id,slug,title,kind,tier,branch,summary,labels,provenance,worked_example,visibility,owner_id,frontier_flag,created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return bad(500, "read_failed");
  if (!row) return bad(404, "node_not_found");
  const node = row as {
    id: string; slug: string; title: string; kind: string; tier: number; branch: string; summary: string | null;
    labels: Record<string, unknown> | null; provenance: Record<string, unknown> | null; worked_example: { text?: string; source?: string } | null;
    visibility: string | null; owner_id: string | null; frontier_flag: string | null; created_at: string;
  };
  const access = { id: node.id, visibility: ((node.visibility ?? "public") as "public" | "private" | "shared"), ownerId: node.owner_id };
  const viewer: Viewer = { id: viewerId, groups: viewerId ? await loadViewerGroups(viewerId) : [] };
  const grants = access.visibility === "public" ? [] : await loadGrants(node.id);
  if (!canView(access, viewer, grants)) return bad(404, "node_not_found");

  const [graph, standingRes, myClasses] = await Promise.all([
    // A failed graph read still serves the node itself, and the reply marks
    // the neighbourhood as unavailable so the page says so.
    loadSubgraph(node.branch, { externalFactors: true }).catch((err: unknown) => {
      console.error("[research-os/node] subgraph load failed:", err instanceof Error ? err.message : err);
      return { nodes: [], edges: [], failed: true as const };
    }),
    viewerId ? svc.from("learner_node_state").select("stage,evidence,updated_at").eq("learner_id", viewerId).eq("node_id", node.id).maybeSingle() : Promise.resolve({ data: null }),
    viewerId ? listMyClasses(viewerId) : Promise.resolve([]),
  ]);
  const visible = await filterSubgraphForViewer(graph.nodes, graph.edges, viewerId);
  const byId = new Map(visible.nodes.map((n) => [n.id, n]));
  const lite = (id: string) => {
    const n = byId.get(id);
    return n ? { id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, frontierFlag: n.frontierFlag ?? null } : null;
  };
  const prerequisites = visible.edges.filter((e) => e.kind === "prerequisite" && e.toId === node.id).map((e) => lite(e.fromId)).filter(Boolean);
  const dependents = visible.edges.filter((e) => e.kind === "prerequisite" && e.fromId === node.id).map((e) => lite(e.toId)).filter(Boolean);
  const related = visible.edges
    .filter((e) => e.kind !== "prerequisite" && (e.fromId === node.id || e.toId === node.id))
    .map((e) => ({ kind: e.kind, direction: e.fromId === node.id ? "out" : "in", node: lite(e.fromId === node.id ? e.toId : e.fromId) }))
    .filter((r) => r.node);
  const actingNodes = related.filter((r) => r.direction === "in" && ACTING.includes(r.kind));
  const inBranch = byId.has(node.id);
  const d = inBranch ? directionsFrom(node.id, visible.nodes, visible.edges) : { dependents: [], frontier: [], openQuestions: [], reach: [] };
  const dlite = (n: { id: string; slug: string; title: string; kind: string; frontierFlag?: string | null }) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, frontierFlag: n.frontierFlag ?? null });

  const standingRow = (standingRes as { data: { stage: Stage; evidence: unknown[]; updated_at: string } | null }).data;
  const evidence = Array.isArray(standingRow?.evidence) ? (standingRow!.evidence as Record<string, unknown>[]).slice(-12) : [];

  let productions: unknown[] = [];
  if (viewerId) {
    const { data } = await svc
      .from("productions")
      .select("id,kind,status,claim,related_node_id,target_node_id,node_id,updated_at")
      .eq("learner_id", viewerId)
      .or(`target_node_id.eq.${node.id},related_node_id.eq.${node.id}`)
      .order("updated_at", { ascending: false });
    productions = data || [];
  }

  const classIds = myClasses.map((c) => c.id);
  let assignments: unknown[] = [];
  let holders: { stage: string; count: number }[] | null = null;
  if (classIds.length) {
    const asg = await inChunks<{ id: string; class_id: string; title: string; due_at: string | null; requires_production: boolean }>(classIds, (chunk, page) =>
      svc.from("assignments").select("id,class_id,title,due_at,requires_production,closed_at").eq("target_node_id", node.id).in("class_id", chunk).is("closed_at", null).order("class_id").order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; class_id: string; title: string; due_at: string | null; requires_production: boolean }[] | null; error: { message: string } | null }>,
    ).catch(() => [] as { id: string; class_id: string; title: string; due_at: string | null; requires_production: boolean }[]);
    const nameOf = new Map(myClasses.map((c) => [c.id, c.name]));
    assignments = ((asg as { id: string; class_id: string; title: string; due_at: string | null; requires_production: boolean }[]) || []).map((a) => ({ id: a.id, classId: a.class_id, className: nameOf.get(a.class_id) ?? "", title: a.title, dueAt: a.due_at, requiresProduction: a.requires_production }));
    const staffClasses = myClasses.filter((c) => c.role === "teacher" || c.role === "librarian").map((c) => c.id);
    if (staffClasses.length) {
      // Many members per class, so this overflows the row cap on an
      // ordinary staff class list.
      const members = await inChunks<{ learner_id: string }>(staffClasses, (chunk, page) =>
        svc.from("class_members").select("learner_id").in("class_id", chunk).order("class_id").order("learner_id").range(page.from, page.to) as unknown as Promise<{ data: { learner_id: string }[] | null; error: { message: string } | null }>,
      ).catch(() => [] as { learner_id: string }[]);
      const learnerIds = Array.from(new Set(members.map((m) => m.learner_id)));
      if (learnerIds.length) {
        // Paging the member read above removed the bound this one used
        // to inherit: PostgREST capped that list at a thousand, so this
        // `in()` was short by construction. It is not any more, so it
        // chunks for the request line and pages for the row cap, and a
        // failure says so rather than counting nobody as opened.
        let st: { learner_id: string; stage: string }[];
        try {
          st = await inChunks<{ learner_id: string; stage: string }>(learnerIds, (chunk, page) =>
            svc.from("learner_node_state").select("learner_id,stage").eq("node_id", node.id).in("learner_id", chunk).order("learner_id").range(page.from, page.to) as unknown as Promise<{ data: { learner_id: string; stage: string }[] | null; error: { message: string } | null }>,
          );
        } catch (err) {
          console.error("[research-os/node] holder read failed:", err instanceof Error ? err.message : err);
          return bad(503, "node_read_failed");
        }
        const counts = new Map<string, number>();
        st.forEach((r) => counts.set(r.stage, (counts.get(r.stage) ?? 0) + 1));
        const opened = st.length;
        holders = [...["access", "awareness", "understanding", "internalization", "production"].map((s) => ({ stage: s, count: counts.get(s) ?? 0 })), { stage: "unopened", count: Math.max(0, learnerIds.length - opened) }];
      }
    }
  }

  const transferTarget = dependents[0] ?? related.find((r) => r.direction === "out")?.node ?? null;
  const transfer = {
    itemId: `${node.slug}::transfer-v1`,
    prompt: transferTarget
      ? `Use "${node.title}" to explain "${transferTarget.title}". Where does it carry over, and where does it stop applying?`
      : `Take "${node.title}" somewhere it was not taught: a case, a field, or a question outside this branch. Where does it hold, and where does it stop applying?`,
  };

  return NextResponse.json(
    {
      node: {
        id: node.id, slug: node.slug, title: node.title, kind: node.kind, tier: node.tier, branch: node.branch, summary: node.summary,
        provenance: node.provenance, workedExample: node.worked_example, visibility: access.visibility, ownerId: node.owner_id, isOwner: Boolean(viewerId && node.owner_id === viewerId),
        frontierFlag: node.frontier_flag, createdAt: node.created_at,
      },
      standing: standingRow ? { stage: standingRow.stage, updatedAt: standingRow.updated_at, evidence } : { stage: null, updatedAt: null, evidence: [] },
      ...("failed" in graph ? { graphUnavailable: true } : {}),
      prerequisites,
      dependents,
      related,
      acting: actingNodes,
      directions: { dependents: d.dependents.map(dlite), frontier: d.frontier.map(dlite), openQuestions: d.openQuestions.map(dlite), reach: d.reach },
      learn: learnTargetFor({ branch: node.branch, provenance: node.provenance }),
      productions,
      verbs: Object.fromEntries(VERBS.map((v) => [v, can(access, viewer, v, grants)])),
      classes: myClasses.map((c) => ({ id: c.id, name: c.name, role: c.role })),
      assignments,
      holders,
      transfer,
      signedIn: Boolean(viewerId),
    },
    NO_STORE
  );
}
