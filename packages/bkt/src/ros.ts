import type { Database } from "bun:sqlite";
import type { Atom } from "../../../src/lib/academy/engine";
import { computeAncestorClosure } from "../../../src/lib/research-os/closure";
import { crossBranchConnections } from "../../../src/lib/research-os/connections";
import { parseRos, ROS_LIVE_PATHS, ROS_PATHS, type RosPayloads, type RosResource } from "../../../src/lib/research-os/contract";
import { directionsFrom } from "../../../src/lib/research-os/directions";
import { findFrontierEngineTargets } from "../../../src/lib/research-os/engine-frontier";
import { computeFrontier } from "../../../src/lib/research-os/frontier";
import { applyTransition, summarize, type GameState } from "../../../src/lib/research-os/game";
import { computeGuidanceLevel } from "../../../src/lib/research-os/guidance-level";
import { learnTargetFor } from "../../../src/lib/research-os/learn-link";
import type { LoopResponse } from "../../../src/lib/research-os/loop-shape";
import { generateModule, generateModules, MODULE_KINDS, type CtxItem, type ModuleContext, type ModuleKind } from "../../../src/lib/research-os/modules/generate";
import { validateProfileInput } from "../../../src/lib/research-os/profile";
import { rankNodes, tokenize } from "../../../src/lib/research-os/search";
import { onNodeOpened } from "../../../src/lib/research-os/stages";
import { stageAtLeast, type GraphEdge, type GraphNode, type Stage } from "../../../src/lib/research-os/types";
import staff from "../content/staff-ros.json" with { type: "json" };
import type { Route } from "./serve";

export type RosLoader<K extends RosResource> = () => RosPayloads[K] | null;

export type RosLoaders = { [K in RosResource]?: RosLoader<K> };

export function bundledRos(data: Record<string, unknown> = staff): RosLoaders {
  const pick = <K extends RosResource>(k: K): RosLoader<K> | undefined => (k in data ? () => data[k] as RosPayloads[K] : undefined);
  return { solvability: pick("solvability"), software: pick("software"), patents: pick("patents") };
}

export const BUNDLED_ROS: RosLoaders = bundledRos();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function rosRoutes(loaders: RosLoaders = BUNDLED_ROS, onError: (e: Error) => void = () => {}): Record<string, Route> {
  const routes: Record<string, Route> = {};
  for (const resource of Object.keys(ROS_PATHS) as RosResource[]) {
    routes[`GET ${ROS_PATHS[resource].local}`] = () => {
      const load = loaders[resource] as RosLoader<typeof resource> | undefined;
      const data = load ? load() : null;
      if (data === null) return json({ error: `no ${resource} source on this computer` }, 404);
      try {
        return json(parseRos(resource, data));
      } catch (e) {
        onError(e as Error);
        return json({ error: "contract_broken" }, 500);
      }
    };
  }
  return routes;
}

export const ROS_GRAPH_META_KEY = "ros_graph_version";

const NODE_KINDS = new Set(["fact", "concept", "law", "derivation", "primary_source", "artifact", "hypothesis", "extension", "replication", "peer_review", "production", "figure", "site", "excerpt"]);
const TIER: Record<string, number> = { prereq: 1, nucleus: 2, frontier: 3 };
const SAFE = /[^A-Za-z0-9._-]/g;

export const rosNodeId = (deck: string, atom: string) => `${deck.replace(SAFE, "-")}:${atom.replace(SAFE, "-")}`;

export function syncRosGraph(db: Database, version: string, atoms: Record<string, Atom[]>): boolean {
  const current = db.query<{ v: string }, [string]>("select v from meta where k = ?").get(ROS_GRAPH_META_KEY)?.v;
  if (current === version) return false;
  db.transaction(() => {
    db.run("delete from ros_items; delete from ros_edges; delete from ros_nodes;");
    const node = db.query("insert or ignore into ros_nodes (id, slug, title, kind, tier, branch, summary, frontier_flag, provenance) values (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const edge = db.query("insert or ignore into ros_edges (id, from_id, to_id, kind) values (?, ?, ?, 'prerequisite')");
    const item = db.query("insert or ignore into ros_items (id, node_id, kind, ordinal, body) values (?, ?, ?, ?, ?)");
    for (const [deck, list] of Object.entries(atoms)) {
      const ids = new Set(list.map((a) => a.id));
      for (const a of list) {
        const id = rosNodeId(deck, a.id);
        const kind = a.type && NODE_KINDS.has(a.type) ? a.type : "concept";
        node.run(id, id, a.title, kind, TIER[a.shell ?? ""] ?? 2, deck, a.summary ?? null, a.shell === "frontier" ? "frontier" : null, JSON.stringify({ type: "academy_atom", atom_id: a.id, branch: deck }));
        for (const r of a.requires ?? []) if (ids.has(r)) edge.run(`${rosNodeId(deck, r)}>${id}`, rosNodeId(deck, r), id);
        if (a.lesson) item.run(`${id}#lesson`, id, "lesson", 0, JSON.stringify({ markdown: a.lesson }));
        (a.quiz ?? []).forEach((q, n) => item.run(`${id}#quiz${n}`, id, "quiz", n, JSON.stringify({ level: q.level ?? "recall", prompt: q.prompt, answer: q.answer })));
      }
    }
    db.query("insert into meta (k, v) values (?, ?) on conflict (k) do update set v = excluded.v").run(ROS_GRAPH_META_KEY, version);
  })();
  return true;
}

type NodeRow = { id: string; slug: string; title: string; kind: string; tier: number; branch: string; summary: string | null; frontier_flag: string | null; provenance: string };
type StateRow = { node_id: string; stage: Stage; confidence: number | null; evidence: string; updated_at: number };

const toNode = (r: NodeRow): GraphNode => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  kind: r.kind as GraphNode["kind"],
  tier: r.tier,
  branch: r.branch,
  summary: r.summary,
  provenance: JSON.parse(r.provenance),
  visibility: "public",
  ownerId: null,
  frontierFlag: (r.frontier_flag as GraphNode["frontierFlag"]) ?? null,
});

const iso = (ms: number) => new Date(ms).toISOString();
const bad = (status: number, error: string) => json({ error }, status);
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;
const EMPTY_GAME: GameState = { xp: 0, streakDays: 0, lastActiveDay: null, badges: [] };

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = (await req.json()) as unknown;
    return typeof b === "object" && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export class RosGraph {
  constructor(private db: Database) {}

  branches(): { id: string; nodes: number }[] {
    return this.db.query<{ id: string; nodes: number }, []>("select branch as id, count(*) as nodes from ros_nodes group by branch order by branch").all();
  }

  subgraph(branch: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes = this.db.query<NodeRow, [string]>("select * from ros_nodes where branch = ? order by id").all(branch).map(toNode);
    const edges = this.db
      .query<{ id: string; from_id: string; to_id: string; kind: string }, [string]>(
        "select e.* from ros_edges e join ros_nodes n on n.id = e.to_id where n.branch = ? order by e.id",
      )
      .all(branch)
      .map((e) => ({ id: e.id, fromId: e.from_id, toId: e.to_id, kind: e.kind as GraphEdge["kind"] }));
    return { nodes, edges };
  }

  bySlug(slug: string): GraphNode | null {
    const r = this.db.query<NodeRow, [string]>("select * from ros_nodes where slug = ?").get(slug);
    return r ? toNode(r) : null;
  }

  byId(id: string): GraphNode | null {
    const r = this.db.query<NodeRow, [string]>("select * from ros_nodes where id = ?").get(id);
    return r ? toNode(r) : null;
  }

  all(): GraphNode[] {
    return this.db.query<NodeRow, []>("select * from ros_nodes order by id").all().map(toNode);
  }

  touching(ids: string[]): GraphEdge[] {
    if (!ids.length) return [];
    const set = new Set(ids);
    return this.db
      .query<{ id: string; from_id: string; to_id: string; kind: string }, []>("select * from ros_edges where kind != 'prerequisite' order by id")
      .all()
      .filter((e) => set.has(e.from_id) || set.has(e.to_id))
      .map((e) => ({ id: e.id, fromId: e.from_id, toId: e.to_id, kind: e.kind as GraphEdge["kind"] }));
  }

  items(nodeId: string): CtxItem[] {
    return this.db
      .query<{ id: string; kind: string; ordinal: number; body: string }, [string]>("select id, kind, ordinal, body from ros_items where node_id = ? order by kind, ordinal")
      .all(nodeId)
      .map((i) => ({ id: i.id, kind: i.kind, ordinal: i.ordinal, body: JSON.parse(i.body) }));
  }

  states(): StateRow[] {
    return this.db.query<StateRow, []>("select * from ros_state order by node_id").all();
  }

  state(nodeId: string): StateRow | null {
    return this.db.query<StateRow, [string]>("select * from ros_state where node_id = ?").get(nodeId) ?? null;
  }

  record(nodeId: string, stage: Stage, event: Record<string, unknown>, now: number) {
    const prev = this.state(nodeId);
    const evidence = [...(prev ? (JSON.parse(prev.evidence) as unknown[]) : []), event].slice(-50);
    this.db
      .query("insert into ros_state (node_id, stage, evidence, updated_at) values (?, ?, ?, ?) on conflict (node_id) do update set stage = excluded.stage, evidence = excluded.evidence, updated_at = excluded.updated_at")
      .run(nodeId, stage, JSON.stringify(evidence), now);
    const game = applyTransition(this.game() ?? EMPTY_GAME, nodeId, prev?.stage ?? null, stage, new Date(now));
    this.db
      .query("insert into ros_profile (id, game, updated_at) values (1, ?, ?) on conflict (id) do update set game = excluded.game")
      .run(JSON.stringify(game), now);
  }

  profileRow(): { role: string | null; birth_year_bucket: string | null; game: string | null; updated_at: number } | null {
    return this.db.query<{ role: string | null; birth_year_bucket: string | null; game: string | null; updated_at: number }, []>("select role, birth_year_bucket, game, updated_at from ros_profile where id = 1").get() ?? null;
  }

  game(): GameState | null {
    const g = this.profileRow()?.game;
    return g ? (JSON.parse(g) as GameState) : null;
  }

  saveProfile(role: string, bucket: string, now: number) {
    this.db
      .query("insert into ros_profile (id, role, birth_year_bucket, updated_at) values (1, ?, ?, ?) on conflict (id) do update set role = excluded.role, birth_year_bucket = excluded.birth_year_bucket, updated_at = excluded.updated_at")
      .run(role, bucket, now);
  }

  forget() {
    this.db.run("delete from ros_state; update ros_profile set game = null;");
  }
}

const lite = (n: GraphNode) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, frontierFlag: n.frontierFlag ?? null });
const dlite = (n: GraphNode) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, frontierFlag: n.frontierFlag ?? null });
const VERBS = ["view", "continue", "extend", "cite", "replicate", "review"];
const ACTING = ["extends", "replicates", "reviews", "answers"];

export function rosLiveRoutes(g: RosGraph, now: () => number = Date.now): Record<string, Route> {
  const P = ROS_LIVE_PATHS;
  const standing = () => new Map(g.states().map((s) => [s.node_id, s]));
  return {
    [`GET ${P.graph.local}`]: (_req, url) => {
      if (url.searchParams.get("list")) return json({ branches: g.branches() });
      const branch = (url.searchParams.get("branch") || "02-physics").trim();
      if (!BRANCH.test(branch)) return bad(400, "bad_branch");
      const { nodes, edges } = g.subgraph(branch);
      const st = standing();
      const mine: Record<string, string> = {};
      for (const n of nodes) {
        const s = st.get(n.id);
        if (s) mine[n.id] = s.stage;
      }
      return json({
        branch,
        nodes: nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, frontierFlag: n.frontierFlag ?? null, visibility: "public", source: String(n.provenance?.type ?? "") })),
        edges: edges.map((e) => ({ fromId: e.fromId, toId: e.toId, kind: e.kind })),
        standing: mine,
        assignments: [],
        holders: null,
        learners: 0,
        signedIn: true,
      });
    },
    [`GET ${P.search.local}`]: (_req, url) => {
      const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
      const branch = (url.searchParams.get("branch") || "").trim();
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
      if (!q || tokenize(q).length === 0) return json({ q, results: [] });
      const nodes = g.all().filter((n) => !branch || n.branch === branch);
      const st = standing();
      const ranked = rankNodes(nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, summary: n.summary })), q, limit);
      return json({ q, results: ranked.map((r) => ({ id: r.id, slug: r.slug, title: r.title, kind: r.kind, tier: r.tier, branch: r.branch, summary: r.summary ? r.summary.slice(0, 160) : null, stage: st.get(r.id)?.stage ?? null })) });
    },
    [`GET ${P.node.local}`]: (_req, url) => {
      const slug = (url.searchParams.get("slug") || "").trim();
      if (!SLUG.test(slug)) return bad(400, "slug_required");
      const node = g.bySlug(slug);
      if (!node) return bad(404, "node_not_found");
      const { nodes, edges } = g.subgraph(node.branch);
      const byId = new Map(nodes.map((n) => [n.id, n]));
      const pick = (id: string) => (byId.has(id) ? lite(byId.get(id)!) : null);
      const prerequisites = edges.filter((e) => e.kind === "prerequisite" && e.toId === node.id).map((e) => pick(e.fromId)).filter(Boolean);
      const dependents = edges.filter((e) => e.kind === "prerequisite" && e.fromId === node.id).map((e) => pick(e.toId)).filter(Boolean);
      const related = g
        .touching([node.id])
        .map((e) => ({ kind: e.kind, direction: e.fromId === node.id ? "out" : "in", node: pick(e.fromId === node.id ? e.toId : e.fromId) }))
        .filter((r) => r.node);
      const d = directionsFrom(node.id, nodes, edges);
      const row = g.state(node.id);
      const target = dependents[0] ?? related.find((r) => r.direction === "out")?.node ?? null;
      return json({
        node: { id: node.id, slug: node.slug, title: node.title, kind: node.kind, tier: node.tier, branch: node.branch, summary: node.summary, provenance: node.provenance, workedExample: null, visibility: "public", ownerId: null, isOwner: false, frontierFlag: node.frontierFlag ?? null, createdAt: null },
        standing: row ? { stage: row.stage, updatedAt: iso(row.updated_at), evidence: (JSON.parse(row.evidence) as unknown[]).slice(-12) } : { stage: null, updatedAt: null, evidence: [] },
        prerequisites,
        dependents,
        related,
        acting: related.filter((r) => r.direction === "in" && ACTING.includes(r.kind)),
        directions: { dependents: d.dependents.map(dlite), frontier: d.frontier.map(dlite), openQuestions: d.openQuestions.map(dlite), reach: d.reach },
        learn: learnTargetFor({ branch: node.branch, provenance: node.provenance }),
        productions: [],
        verbs: Object.fromEntries(VERBS.map((v) => [v, v === "view" || v === "continue"])),
        classes: [],
        assignments: [],
        holders: null,
        transfer: {
          itemId: `${node.slug}::transfer-v1`,
          prompt: target
            ? `Use "${node.title}" to explain "${target.title}". Where does it carry over, and where does it stop applying?`
            : `Take "${node.title}" somewhere it was not taught: a case, a field, or a question outside this branch. Where does it hold, and where does it stop applying?`,
        },
        signedIn: true,
      });
    },
    [`GET ${P.state.local}`]: (_req, url) => {
      const ids = (url.searchParams.get("nodeIds") || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (!ids.length) return json({ states: [] });
      return json({ states: ids.map((id) => g.state(id)).filter((r): r is StateRow => r !== null).map((r) => ({ nodeId: r.node_id, stage: r.stage, confidence: r.confidence, updatedAt: iso(r.updated_at) })) });
    },
    [`POST ${P.state.local}`]: async (req) => {
      const b = await readBody(req);
      if (!b) return bad(400, "bad_request");
      const nodeId = typeof b.nodeId === "string" ? b.nodeId.trim() : "";
      if (!nodeId) return bad(400, "nodeId is required");
      if (b.action !== "open") return bad(400, "unknown action");
      if (!g.byId(nodeId)) return bad(404, "node_not_found");
      const at = now();
      const t = onNodeOpened(g.state(nodeId)?.stage ?? "access", { sessionId: typeof b.sessionId === "string" ? b.sessionId : undefined }, iso(at));
      g.record(nodeId, t.nextStage, t.event as unknown as Record<string, unknown>, at);
      return json({ stage: t.nextStage, event: t.event });
    },
    [`GET ${P.directions.local}`]: (_req, url) => {
      const nodeId = (url.searchParams.get("node") || "").trim();
      const branch = (url.searchParams.get("branch") || "02-physics").trim();
      if (!nodeId) return bad(400, "node_required");
      const { nodes, edges } = g.subgraph(branch);
      if (!nodes.some((n) => n.id === nodeId)) return bad(404, "node_not_found");
      const d = directionsFrom(nodeId, nodes, edges);
      const l = (n: GraphNode) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, frontierFlag: n.frontierFlag ?? null });
      return json({ dependents: d.dependents.map(l), frontier: d.frontier.map(l), openQuestions: d.openQuestions.map(l), reach: d.reach });
    },
    [`GET ${P.connections.local}`]: () => json(connectionsOf(g)),
    [`GET ${P.loop.local}`]: () => {
      const states = g.states();
      const at = (s: Stage) => states.filter((r) => stageAtLeast(r.stage, s)).length;
      const c = connectionsOf(g);
      const decks = new Set(states.map((s) => g.byId(s.node_id)?.branch).filter(Boolean)).size;
      const body: LoopResponse = {
        access: { owned: 0, imports: 0, pendingRequests: 0 },
        awareness: { opened: states.length, atLeastAwareness: at("awareness") },
        understanding: { nodes: at("understanding"), decksStarted: decks },
        internalization: { nodes: at("internalization"), held: c.held.length, bridges: c.bridges.length, nextBridge: c.bridges[0]?.next ?? null },
        production: { drafts: 0, submitted: 0, accepted: 0, returned: 0, nodes: 0, latest: null },
        empty: states.length === 0,
      };
      return json(body);
    },
    [`GET ${P.profile.local}`]: () => {
      const row = g.profileRow();
      const game = g.game();
      return json({
        profile: row?.role ? { role: row.role, birthYearBucket: row.birth_year_bucket, consentStatus: "self", updatedAt: iso(row.updated_at) } : null,
        game: game ? summarize(game) : null,
      });
    },
    [`POST ${P.profile.local}`]: async (req) => {
      const b = await readBody(req);
      if (!b) return bad(400, "bad_request");
      const v = validateProfileInput(b);
      if (!v.ok) return bad(400, v.error);
      const at = now();
      const deleted = v.value.birthYearBucket === "under13";
      if (deleted) g.forget();
      g.saveProfile(v.value.role, v.value.birthYearBucket, at);
      return json({ profile: { role: v.value.role, birthYearBucket: v.value.birthYearBucket, consentStatus: "self", updatedAt: iso(at) }, deleted });
    },
    [`GET ${P.modules.local}`]: (_req, url) => {
      const slug = (url.searchParams.get("node") || "").trim();
      if (!SLUG.test(slug)) return bad(400, "node_required");
      const kind = url.searchParams.get("kind");
      if (kind && !(MODULE_KINDS as readonly string[]).includes(kind)) return bad(400, "bad_kind");
      const node = g.bySlug(slug);
      if (!node) return bad(404, "node_not_found");
      const { nodes, edges } = g.subgraph(node.branch);
      const ctxNodes = nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, summary: n.summary, tier: n.tier, origin: typeof n.provenance?.type === "string" ? n.provenance.type : null }));
      const ctx: ModuleContext = {
        node: ctxNodes.find((n) => n.id === node.id)!,
        items: g.items(node.id),
        nodes: ctxNodes,
        prerequisites: edges.filter((e) => e.kind === "prerequisite").map((e) => ({ id: e.id ?? `${e.fromId}>${e.toId}`, fromId: e.fromId, toId: e.toId })),
      };
      const modules = kind ? [generateModule(ctx, kind as ModuleKind)] : generateModules(ctx);
      return json({ node: { id: node.id, slug: node.slug, title: node.title }, modules });
    },
    [`GET ${P.route.local}`]: (_req, url) => {
      const targetSlug = (url.searchParams.get("target") || "").trim();
      if (!targetSlug) return bad(400, "target is required");
      const target = g.bySlug(targetSlug);
      if (!target) return bad(404, "target_not_found");
      const branch = (url.searchParams.get("branch") || target.branch).trim();
      const { nodes, edges } = g.subgraph(branch);
      if (!nodes.some((n) => n.id === target.id)) return bad(404, "target_not_found");
      const ids = new Set(nodes.map((n) => n.id));
      const states = g.states().filter((s) => ids.has(s.node_id)).map((s) => ({ nodeId: s.node_id, stage: s.stage, confidence: s.confidence }));
      const result = computeFrontier(nodes, edges, states, target.id, computeAncestorClosure(nodes, edges).filter((r) => r.nodeId === target.id));
      return json({
        target: result.target,
        frontier: result.frontier,
        chain: result.chain,
        gap: result.gap,
        lowConfidenceFlags: result.lowConfidenceFlags,
        engineFrontier: findFrontierEngineTargets(nodes, edges, states),
        openQuestions: nodes.filter((n) => n.frontierFlag === "open_question").map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier })),
        guidance: computeGuidanceLevel(result.chain.slice(0, 2).map((s) => g.state(s.node.id)?.stage ?? "access")),
        llmEnabled: false,
        learner: "self",
      });
    },
  };
}

function connectionsOf(g: RosGraph) {
  const states = g.states().filter((s) => stageAtLeast(s.stage, "understanding")).map((s) => ({ nodeId: s.node_id, stage: s.stage }));
  if (!states.length) return { held: [], bridges: [] };
  const edges = g.touching(states.map((s) => s.nodeId));
  const nodes = Array.from(new Set(edges.flatMap((e) => [e.fromId, e.toId])))
    .map((id) => g.byId(id))
    .filter((n): n is GraphNode => n !== null)
    .map((n) => ({ id: n.id, slug: n.slug, title: n.title, branch: n.branch, kind: n.kind }));
  return crossBranchConnections(states, nodes, edges.map((e) => ({ fromId: e.fromId, toId: e.toId, kind: e.kind })));
}
