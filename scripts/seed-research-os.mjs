#!/usr/bin/env node
/* Research OS for K-12, Phase 0 seed loader (bkt-ros).
 *
 * Loads supabase/seed/research-os-sky-blue.json (the "why is the sky blue"
 * path, see _intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md section
 * 8) into graph.nodes / graph.edges. Mirrors the Academy corpus loading
 * pattern (a static JSON source of truth, a small script that pushes it to
 * where the app reads it), with Postgres as the destination: the graph is
 * server-queried at request time.
 *
 * Idempotent: nodes upsert on `slug` (onConflict), edges are deleted and
 * re-inserted for exactly the (from,to,kind) triples this seed defines, so
 * re-running converges to the same graph and never leaves stale edges behind
 * from a prior version of the seed file.
 *
 * Validates the fixture before writing anything (integrity checks matching
 * learning/app/validate.sh's spirit): unique slugs, every edge endpoint
 * resolves to a defined node, the prerequisite subgraph has no cycles, and
 * the target node is reachable from at least one prerequisite-root node.
 *
 * Requires the same server-only env vars as /api/academy/progress:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (unused here but
 *   validated for parity), SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run:
 *   node scripts/seed-research-os.mjs            # validate + write
 *   node scripts/seed-research-os.mjs --check     # validate only, no network
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = join(root, "supabase", "seed", "research-os-sky-blue.json");
const CHECK_ONLY = process.argv.includes("--check");

function loadSeed() {
  const raw = readFileSync(SEED_PATH, "utf8");
  const seed = JSON.parse(raw);
  if (!Array.isArray(seed.nodes) || !Array.isArray(seed.edges)) {
    throw new Error("seed file must have `nodes` and `edges` arrays");
  }
  return seed;
}

function validate(seed) {
  const slugs = seed.nodes.map((n) => n.slug);
  const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dup.length) throw new Error(`duplicate node slugs: ${[...new Set(dup)].join(", ")}`);

  const slugSet = new Set(slugs);
  for (const e of seed.edges) {
    if (!slugSet.has(e.from)) throw new Error(`edge references unknown node (from): ${e.from}`);
    if (!slugSet.has(e.to)) throw new Error(`edge references unknown node (to): ${e.to}`);
  }

  const KIND_OK = new Set(["fact", "concept", "law", "derivation", "primary_source", "artifact"]);
  for (const n of seed.nodes) {
    if (!KIND_OK.has(n.kind)) throw new Error(`node ${n.slug}: bad kind "${n.kind}"`);
    if (typeof n.tier !== "number") throw new Error(`node ${n.slug}: tier must be a number`);
  }
  const EDGE_KIND_OK = new Set(["prerequisite", "derives_from", "cites", "generalizes", "example_of", "contradicts"]);
  for (const e of seed.edges) {
    if (!EDGE_KIND_OK.has(e.kind)) throw new Error(`edge ${e.from}->${e.to}: bad kind "${e.kind}"`);
  }

  // Cycle check on the prerequisite subgraph only (that's what routing walks).
  const prereq = seed.edges.filter((e) => e.kind === "prerequisite");
  const forward = new Map(); // slug -> [slug...]
  for (const s of slugs) forward.set(s, []);
  for (const e of prereq) forward.get(e.from).push(e.to);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(slugs.map((s) => [s, WHITE]));
  const stack = [];
  function dfs(u) {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of forward.get(u)) {
      if (color.get(v) === GRAY) {
        throw new Error(`prerequisite cycle: ${stack.slice(stack.indexOf(v)).concat(v).join(" -> ")}`);
      }
      if (color.get(v) === WHITE) dfs(v);
    }
    stack.pop();
    color.set(u, BLACK);
  }
  for (const s of slugs) if (color.get(s) === WHITE) dfs(s);

  if (seed.target_slug && !slugSet.has(seed.target_slug)) {
    throw new Error(`target_slug "${seed.target_slug}" is not a defined node`);
  }

  // Reachability: the target must be reachable, walking prerequisite edges
  // BACKWARD, from at least one root (a node with no incoming prerequisite
  // edge) -- otherwise frontier-backward routing has nothing to backward-walk to.
  const hasIncoming = new Set(prereq.map((e) => e.to));
  const roots = slugs.filter((s) => !hasIncoming.has(s));
  if (roots.length === 0) throw new Error("prerequisite subgraph has no root nodes (every node has a prerequisite)");

  const backward = new Map(slugs.map((s) => [s, []]));
  for (const e of prereq) backward.get(e.to).push(e.from);
  const seen = new Set();
  const queue = seed.target_slug ? [seed.target_slug] : [];
  while (queue.length) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    for (const v of backward.get(u)) queue.push(v);
  }
  if (seed.target_slug && !roots.some((r) => seen.has(r))) {
    throw new Error(`target "${seed.target_slug}" cannot reach any root node by walking prerequisite edges backward`);
  }

  return { nodeCount: seed.nodes.length, edgeCount: seed.edges.length, roots, prereqCount: prereq.length };
}

async function write(seed) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[seed-research-os] SUPABASE env not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Nothing written.");
    process.exit(1);
  }
  const svc = createClient(url, serviceKey, { db: { schema: "graph" }, auth: { persistSession: false } });

  const rows = seed.nodes.map((n) => ({
    slug: n.slug,
    title: n.title,
    kind: n.kind,
    tier: n.tier,
    branch: n.branch,
    summary: n.summary ?? null,
    labels: n.labels ?? { en: { title: n.title, summary: n.summary ?? "" } },
    provenance: n.provenance ?? {},
  }));
  const { data: upserted, error: nodeErr } = await svc
    .from("nodes")
    .upsert(rows, { onConflict: "slug" })
    .select("id,slug");
  if (nodeErr) throw new Error(`node upsert failed: ${nodeErr.message}`);

  const idBySlug = new Map(upserted.map((r) => [r.slug, r.id]));

  // Idempotent edges: delete exactly the seed's (from,to,kind) triples, then
  // reinsert. Cheap at this graph size and avoids drift from a prior seed run.
  for (const e of seed.edges) {
    const fromId = idBySlug.get(e.from);
    const toId = idBySlug.get(e.to);
    const { error: delErr } = await svc.from("edges").delete().match({ from_id: fromId, to_id: toId, kind: e.kind });
    if (delErr) throw new Error(`edge delete failed (${e.from}->${e.to}): ${delErr.message}`);
  }
  const edgeRows = seed.edges.map((e) => ({
    from_id: idBySlug.get(e.from),
    to_id: idBySlug.get(e.to),
    kind: e.kind,
    weight: e.weight ?? null,
    provenance: e.provenance ?? {},
  }));
  const { error: edgeErr } = await svc.from("edges").insert(edgeRows);
  if (edgeErr) throw new Error(`edge insert failed: ${edgeErr.message}`);

  return { nodesWritten: rows.length, edgesWritten: edgeRows.length };
}

async function main() {
  const seed = loadSeed();
  const stats = validate(seed);
  console.log(
    `[seed-research-os] valid: ${stats.nodeCount} nodes, ${stats.edgeCount} edges (${stats.prereqCount} prerequisite), roots: ${stats.roots.join(", ")}`,
  );
  if (CHECK_ONLY) return;
  const result = await write(seed);
  console.log(`[seed-research-os] wrote ${result.nodesWritten} nodes, ${result.edgesWritten} edges to graph schema.`);
}

main().catch((err) => {
  console.error("[seed-research-os] FAILED:", err.message);
  process.exit(1);
});
