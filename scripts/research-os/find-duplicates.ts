import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../src/lib/research-os/paging";
import { findMergeCandidates, matchBundleParts, type DedupNode, type Refusal } from "../../src/lib/research-os/dedup";

const IDEA_KINDS = ["concept", "law", "derivation"];

function readAll<T>(svc: SupabaseClient, table: string, columns: string, orderBy: string, filter?: (q: any) => any): Promise<T[]> {
  return pagedRead<T>((page) => {
    let q = svc.from(table).select(columns).order(orderBy, { ascending: true }).range(page.from, page.to);
    if (filter) q = filter(q);
    return q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>;
  }).catch((err: unknown) => {
    throw new Error(`${table}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  type NodeRow = { id: string; slug: string; title: string | null; branch: string | null; kind: string; tier: number; provenance: { type?: string } | null };
  const rows = await readAll<NodeRow>(svc, "nodes", "id, slug, title, branch, kind, tier, provenance", "id", (q) =>
    q.eq("visibility", "public").is("superseded_by", null).in("kind", IDEA_KINDS),
  );
  const ideas = rows.filter((r) => r.slug && r.title && r.provenance?.type !== "canon_bridge");
  const live = new Set(ideas.map((r) => r.id));

  const degree = new Map<string, number>();
  const edges = await readAll<{ id: string; from_id: string; to_id: string }>(svc, "edges", "id, from_id, to_id", "id");
  for (const e of edges) {
    if (live.has(e.from_id)) degree.set(e.from_id, (degree.get(e.from_id) ?? 0) + 1);
    if (live.has(e.to_id)) degree.set(e.to_id, (degree.get(e.to_id) ?? 0) + 1);
  }
  const nodes: DedupNode[] = ideas.map((r) => ({ id: r.id, slug: r.slug, title: r.title as string, branch: r.branch ?? "", kind: r.kind, tier: r.tier, degree: degree.get(r.id) ?? 0 }));
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));

  const refusedRows = await readAll<{ id: string; from_slug: string; to_slug: string; justification: string; secondary_justification: string | null }>(
    svc, "edge_proposals", "id, from_slug, to_slug, justification, secondary_justification", "id", (q) => q.eq("verification", "refuted"),
  );
  const refusals: Refusal[] = refusedRows.map((r) => ({ fromSlug: r.from_slug, toSlug: r.to_slug, text: [r.justification, r.secondary_justification].filter(Boolean).join(" ") }));

  const candidates = findMergeCandidates(nodes, refusals);
  const existing = await readAll<{ id: string; keep_slug: string; drop_slug: string }>(svc, "merge_proposals", "id, keep_slug, drop_slug", "id");
  const seen = new Set(existing.flatMap((m) => [`${m.keep_slug}|${m.drop_slug}`, `${m.drop_slug}|${m.keep_slug}`]));
  const fresh = candidates.filter((c) => !seen.has(`${c.keepSlug}|${c.dropSlug}`));

  const byReason: Record<string, number> = {};
  for (const c of candidates) byReason[c.reason] = (byReason[c.reason] ?? 0) + 1;
  console.log(`[dedup] ${nodes.length} ideas; ${candidates.length} merge candidates ${JSON.stringify(byReason)}; ${fresh.length} new to the queue`);
  for (const c of candidates.slice(0, 20)) {
    const k = bySlug.get(c.keepSlug)!;
    const d = bySlug.get(c.dropSlug)!;
    console.log(`  ${c.reason.padEnd(18)} ${c.similarity.toFixed(2)}  keep ${k.title} [${k.branch}, ${k.degree} edges]  drop ${d.title} [${d.branch}, ${d.degree} edges]`);
  }

  type NodeProposal = { id: string; key: string; title: string; named_by: string[]; possible_duplicates: { slug: string; title: string; similarity: number }[] };
  const pending = await readAll<NodeProposal>(svc, "node_proposals", "id, key, title, named_by, possible_duplicates", "id", (q) => q.eq("status", "pending"));
  const bundleEdges: Record<string, unknown>[] = [];
  const annotate: { id: string; possible_duplicates: NodeProposal["possible_duplicates"] }[] = [];
  let bundles = 0;
  for (const p of pending) {
    const parts = matchBundleParts(p.title, nodes);
    if (parts.length === 0) continue;
    bundles += 1;
    const known = new Set((p.possible_duplicates ?? []).map((x) => x.slug));
    const added = parts.filter((x) => !known.has(x.slug)).map((x) => ({ slug: x.slug, title: x.nodeTitle, similarity: x.similarity }));
    if (added.length) annotate.push({ id: p.id, possible_duplicates: [...(p.possible_duplicates ?? []), ...added] });
    for (const part of parts) {
      for (const targetSlug of p.named_by ?? []) {
        const target = bySlug.get(targetSlug);
        const factor = bySlug.get(part.slug);
        if (!target || !factor || target.slug === factor.slug) continue;
        bundleEdges.push({
          from_slug: factor.slug,
          to_slug: target.slug,
          branch: target.branch,
          confidence: 0.5,
          confidence_source: "prime_decompose_llm",
          agreement: false,
          justification: `"${p.title}", named as missing by this idea, bundles "${part.part}", which the graph holds as "${factor.title}".`,
          model: "bundle-split",
          prompt_hash: `bundle:${createHash("sha256").update(`${p.key}|${part.slug}`).digest("hex").slice(0, 16)}`,
          origin: "missing_matched",
          verification: "unchecked",
          impact: 0,
          cross_branch: factor.branch !== target.branch,
        });
      }
    }
  }
  console.log(`[dedup] ${pending.length} pending node proposals; ${bundles} bundle ideas the graph holds; ${bundleEdges.length} factor proposals from their parts`);

  if (!apply) {
    console.log("[dedup] report only; rerun with --apply to write the queues");
    return;
  }
  if (fresh.length) {
    const { error } = await svc.from("merge_proposals").upsert(
      fresh.map((c) => ({ keep_slug: c.keepSlug, drop_slug: c.dropSlug, reason: c.reason, similarity: c.similarity, evidence: c.evidence })),
      { onConflict: "keep_slug,drop_slug", ignoreDuplicates: true },
    );
    if (error) throw new Error(`merge_proposals: ${error.message}`);
  }
  for (let i = 0; i < bundleEdges.length; i += 500) {
    const { error } = await svc.from("edge_proposals").upsert(bundleEdges.slice(i, i + 500), { onConflict: "from_slug,to_slug", ignoreDuplicates: true });
    if (error) throw new Error(`edge_proposals: ${error.message}`);
  }
  for (const a of annotate) {
    const { error } = await svc.from("node_proposals").update({ possible_duplicates: a.possible_duplicates }).eq("id", a.id).eq("status", "pending");
    if (error) throw new Error(`node_proposals: ${error.message}`);
  }
  console.log(`[dedup] wrote ${fresh.length} merge proposals, up to ${bundleEdges.length} factor proposals (existing pairs kept), ${annotate.length} node proposals annotated`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
