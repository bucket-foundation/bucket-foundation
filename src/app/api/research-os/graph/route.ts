/**
 * GET /api/research-os/graph?branch=<slug>
 * One branch of the graph for the map: the nodes the viewer may see, the
 * edges among them, the viewer's standing per node, the assignments in
 * the viewer's classes that target them, and for staff the class holders
 * per node by level (the heatmap). Signed out: public nodes, no standing.
 */
import { NextRequest, NextResponse } from "next/server";
import { IN_CHUNK, configured, graphService, inChunks, loadSubgraph, verifyLearner } from "@/lib/research-os/db";
import { authorizeNode } from "@/lib/research-os/read-access";
import { readVisibility } from "@/lib/research-os/access";
import { filterSubgraphForViewer } from "@/lib/research-os/access-db";
import { listMyClasses } from "@/lib/research-os/classes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });
const STAGES = ["access", "awareness", "understanding", "internalization", "production"];

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const url = new URL(req.url);
  if (url.searchParams.get("list")) {
    // PostgREST pages at 1,000 rows; walk the pages.
    const counts = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      // This answers before identity, so it counts the public graph
      // alone: a private node's existence is not a branch statistic
      // (Bucket critic C23).
      // Ordered, because an unordered page can serve one node twice and
      // skip another, and these rows are counted.
      const { data, error } = await graphService().from("nodes").select("id,branch").eq("visibility", "public").order("id").range(from, from + 999);
      if (error) return bad(503, "graph_read_failed");
      const rows = (data as { id: string; branch: string }[]) || [];
      rows.forEach((r) => counts.set(r.branch, (counts.get(r.branch) ?? 0) + 1));
      if (rows.length < 1000) break;
    }
    const branches = Array.from(counts.entries()).map(([id, nodes]) => ({ id, nodes })).sort((a, b) => a.id.localeCompare(b.id));
    return NextResponse.json({ branches }, NO_STORE);
  }
  const branch = (url.searchParams.get("branch") || "02-physics").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(branch)) return bad(400, "bad_branch");
  const viewerId = await verifyLearner(req);
  let graph;
  try {
    graph = await loadSubgraph(branch);
  } catch {
    return bad(500, "graph_load_failed");
  }
  const filtered = await filterSubgraphForViewer(graph.nodes, graph.edges, viewerId);
  // An access-store failure is an outage: serving an empty graph would
  // tell a learner their branch has nothing in it.
  if (!filtered.ok) return bad(503, "access_unavailable");
  const { nodes, edges } = filtered;
  const ids = nodes.map((n) => n.id);
  const svc = graphService();
  const standing: Record<string, string> = {};
  let assignments: { nodeId: string; title: string; className: string; dueAt: string | null }[] = [];
  let holders: Record<string, Record<string, number>> | null = null;
  let learners = 0;
  if (viewerId && ids.length) {
    // A read that failed is not a learner who has opened nothing. Serving
    // an empty standing map behind a 200 told them exactly that, and it
    // now also swallowed the PagingError the page guard raises (Bucket
    // critic C53).
    let st: { node_id: string; stage: string }[];
    let classes: Awaited<ReturnType<typeof listMyClasses>>;
    try {
      [st, classes] = await Promise.all([
        inChunks<{ node_id: string; stage: string }>(ids, (chunk, page) => svc.from("learner_node_state").select("node_id,stage").eq("learner_id", viewerId).in("node_id", chunk).order("node_id").range(page.from, page.to) as unknown as Promise<{ data: { node_id: string; stage: string }[] | null; error: { message: string } | null }>),
        listMyClasses(viewerId),
      ]);
    } catch (err) {
      console.error("[research-os/graph] standing read failed:", err instanceof Error ? err.message : err);
      return bad(503, "graph_read_failed");
    }
    st.forEach((r) => (standing[r.node_id] = r.stage));
    const classIds = classes.map((c) => c.id);
    if (classIds.length) {
      // Chunked and paged, which dev had and this merge dropped when it
      // took the branch's side of the whole block. A class list of any
      // size puts more than a thousand assignments here, and the limit
      // above truncated them silently.
      let asg: { target_node_id: string; title: string; class_id: string; due_at: string | null }[];
      try {
        asg = await inChunks<{ target_node_id: string; title: string; class_id: string; due_at: string | null }>(classIds, (chunk, page) =>
          svc.from("assignments").select("target_node_id,title,class_id,due_at").in("class_id", chunk).is("closed_at", null).order("class_id").order("target_node_id").order("id").range(page.from, page.to) as unknown as Promise<{ data: { target_node_id: string; title: string; class_id: string; due_at: string | null }[] | null; error: { message: string } | null }>,
        );
      } catch (err) {
        console.error("[research-os/graph] assignment read failed:", err instanceof Error ? err.message : err);
        return bad(503, "graph_read_failed");
      }
      const nameOf = new Map(classes.map((c) => [c.id, c.name]));
      const idSet = new Set(ids);
      assignments = ((asg as { target_node_id: string; title: string; class_id: string; due_at: string | null }[]) || []).filter((a) => idSet.has(a.target_node_id)).map((a) => ({ nodeId: a.target_node_id, title: a.title, className: nameOf.get(a.class_id) ?? "", dueAt: a.due_at }));
      const staffIds = classes.filter((c) => c.role === "teacher" || c.role === "librarian").map((c) => c.id);
      if (staffIds.length) {
        // Many members per class, so this overflows the row cap on an
        // ordinary staff class list, and the order has to be total.
        // class_members' primary key is (class_id, learner_id), so one
        // learner enrolled in two classes of the chunk appears twice and
        // learner_id alone leaves a tie group. A page boundary landing
        // inside one repeats a row and skips another, and the skipped
        // learner is missing from the roster count with no error.
        let members: { learner_id: string }[];
        try {
          members = await inChunks<{ learner_id: string }>(staffIds, (chunk, page) =>
            svc.from("class_members").select("learner_id").in("class_id", chunk).order("class_id").order("learner_id").range(page.from, page.to) as unknown as Promise<{ data: { learner_id: string }[] | null; error: { message: string } | null }>,
          );
        } catch (err) {
          console.error("[research-os/graph] roster read failed:", err instanceof Error ? err.message : err);
          return bad(503, "graph_read_failed");
        }
        const learnerIds = Array.from(new Set(members.map((m) => m.learner_id)));
        learners = learnerIds.length;
        if (learnerIds.length) {
          const rows: { node_id: string; stage: string }[] = [];
          try {
            // Both lists are chunked. Taking the first IN_CHUNK learners
            // counted a heatmap over 60 of them while `learners` above
            // reported the true total, so the map under-reported every
            // stage for any class past that with no sign it had
            // (Bucket critic C63).
            for (let i = 0; i < learnerIds.length; i += IN_CHUNK) {
              const someLearners = learnerIds.slice(i, i + IN_CHUNK);
              rows.push(
                ...(await inChunks<{ node_id: string; stage: string }>(ids, (chunk, page) => svc.from("learner_node_state").select("node_id,stage").in("learner_id", someLearners).in("node_id", chunk).order("learner_id").order("node_id").range(page.from, page.to) as unknown as Promise<{ data: { node_id: string; stage: string }[] | null; error: { message: string } | null }>)),
              );
            }
          } catch (err) {
            console.error("[research-os/graph] heatmap read failed:", err instanceof Error ? err.message : err);
            return bad(503, "graph_read_failed");
          }
          holders = {};
          rows.forEach((r) => {
            const h = (holders![r.node_id] = holders![r.node_id] ?? Object.fromEntries(STAGES.map((s) => [s, 0])));
            h[r.stage] = (h[r.stage] ?? 0) + 1;
          });
        }
      }
    }
  }
  return NextResponse.json(
    {
      branch,
      nodes: nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, frontierFlag: n.frontierFlag ?? null, visibility: readVisibility(n.visibility), source: String((n.provenance as { type?: string } | undefined)?.type ?? "") })),
      edges: edges.map((e) => ({ fromId: e.fromId, toId: e.toId, kind: e.kind })),
      standing,
      assignments,
      holders,
      learners,
      signedIn: Boolean(viewerId),
    },
    NO_STORE
  );
}
