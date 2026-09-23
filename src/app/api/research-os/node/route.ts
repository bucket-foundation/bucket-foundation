import { NextResponse } from "next/server";
import { graphService, inChunks, loadSubgraph, verifyLearnerIdentity } from "@/lib/research-os/db";
import { authorizeVerbs } from "@/lib/research-os/read-access";
import { filterSubgraphForViewer, loadNodeAccess } from "@/lib/research-os/access-db";
import type { GrantRole } from "@/lib/research-os/access";
import { directionsFrom } from "@/lib/research-os/directions";
import { learnTargetFor } from "@/lib/research-os/learn-link";
import { listMyClasses } from "@/lib/research-os/classes";
import type { Stage } from "@/lib/research-os/types";
import { NO_STORE, bad, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VERBS: GrantRole[] = ["view", "continue", "extend", "cite", "replicate", "review"];
const ACTING = ["extends", "replicates", "reviews", "answers"];

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
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
  const readable = await authorizeVerbs(node.id, { id: viewerId }, ["view", ...VERBS] as Parameters<typeof authorizeVerbs>[2]);
  if (!readable.ok) {
    if (readable.reason === "unavailable") return bad(503, "access_unavailable");
    return bad(404, "node_not_found");
  }
  const access = readable.node;

  let graph: Awaited<ReturnType<typeof loadSubgraph>> | { nodes: never[]; edges: never[]; failed: true };
  let standingRes: { data: unknown; error?: { message: string } | null };
  let myClasses: Awaited<ReturnType<typeof listMyClasses>>;
  try {
    [graph, standingRes, myClasses] = await Promise.all([
    loadSubgraph(node.branch, { externalFactors: true }).catch((err: unknown) => {
      console.error("[research-os/node] subgraph load failed:", err instanceof Error ? err.message : err);
      return { nodes: [], edges: [], failed: true as const };
    }),
    viewerId ? svc.from("learner_node_state").select("stage,evidence,updated_at").eq("learner_id", viewerId).eq("node_id", node.id).maybeSingle() : Promise.resolve({ data: null }),
    viewerId ? listMyClasses(viewerId) : Promise.resolve([]),
    ]);
  } catch (err) {
    console.error("[research-os/node] class read failed:", err instanceof Error ? err.message : err);
    return bad(503, "node_read_failed");
  }
  const filtered = await filterSubgraphForViewer(graph.nodes, graph.edges, viewerId);
  if (!filtered.ok) return bad(503, "access_unavailable");
  const visible = filtered;
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

  if (standingRes.error) {
    console.error("[research-os/node] standing read failed:", standingRes.error.message);
    return bad(503, "node_read_failed");
  }
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
    try {
    const asg = await inChunks<{ id: string; class_id: string; title: string; due_at: string | null; requires_production: boolean }>(classIds, (chunk, page) =>
      svc.from("assignments").select("id,class_id,title,due_at,requires_production,closed_at").eq("target_node_id", node.id).in("class_id", chunk).is("closed_at", null).order("class_id").order("id").range(page.from, page.to) as unknown as Promise<{ data: { id: string; class_id: string; title: string; due_at: string | null; requires_production: boolean }[] | null; error: { message: string } | null }>,
    );
    const nameOf = new Map(myClasses.map((c) => [c.id, c.name]));
    assignments = ((asg as { id: string; class_id: string; title: string; due_at: string | null; requires_production: boolean }[]) || []).map((a) => ({ id: a.id, classId: a.class_id, className: nameOf.get(a.class_id) ?? "", title: a.title, dueAt: a.due_at, requiresProduction: a.requires_production }));
    const staffClasses = myClasses.filter((c) => c.role === "teacher" || c.role === "librarian").map((c) => c.id);
    if (staffClasses.length) {
      const members = await inChunks<{ learner_id: string }>(staffClasses, (chunk, page) =>
        svc.from("class_members").select("learner_id").in("class_id", chunk).order("class_id").order("learner_id").range(page.from, page.to) as unknown as Promise<{ data: { learner_id: string }[] | null; error: { message: string } | null }>,
      );
      const learnerIds = Array.from(new Set(members.map((m) => m.learner_id)));
      if (learnerIds.length) {
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
    } catch (err) {
      console.error("[research-os/node] class read failed:", err instanceof Error ? err.message : err);
      return bad(503, "node_read_failed");
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
      verbs: Object.fromEntries(VERBS.map((v) => [v, readable.allowed[v] === true])),
      classes: myClasses.map((c) => ({ id: c.id, name: c.name, role: c.role })),
      assignments,
      holders,
      transfer,
      signedIn: Boolean(viewerId),
    },
    NO_STORE
  );
});
