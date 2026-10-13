import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import "./mocks";
import { live } from "./live-fake";
import { NextRequest } from "next/server";
import type { Atom } from "@/lib/academy/engine";
import { parseRosLive, ROS_LIVE_PATHS, ROS_LIVE_ROUTES, rosLiveLocal, type RosLiveRoute } from "@/lib/research-os/contract";
import { RosGraph, rosLiveRoutes, rosNodeId, syncRosGraph } from "../../bkt/src/ros";
import { newDataKey } from "../../bkt/src/crypto";
import { Store } from "../../bkt/src/store";
import atoms from "../../bkt/test/fixtures/ros-atoms.json";

const AT = Date.UTC(2026, 9, 1, 12);
const MOMENTUM = rosNodeId("02-physics", "momentum");
const FORCE = rosNodeId("02-physics", "force");
const GAME = { xp: 30, streakDays: 2, lastActiveDay: "2026-10-01", badges: [] };

let db: Database;
let local: ReturnType<typeof rosLiveRoutes>;

const WEB: Record<RosLiveRoute, () => Promise<{ GET?: (req: NextRequest, ctx: unknown) => Promise<Response>; POST?: (req: NextRequest, ctx: unknown) => Promise<Response> }>> = {
  graph: () => import("@/app/api/research-os/graph/route"),
  search: () => import("@/app/api/research-os/search/route"),
  node: () => import("@/app/api/research-os/node/route"),
  state: () => import("@/app/api/research-os/state/route"),
  directions: () => import("@/app/api/research-os/directions/route"),
  connections: () => import("@/app/api/research-os/connections/route"),
  loop: () => import("@/app/api/research-os/loop/route"),
  profile: () => import("@/app/api/research-os/profile/route"),
  modules: () => import("@/app/api/research-os/modules/route"),
  route: () => import("@/app/api/research-os/route/route"),
};

beforeAll(() => {
  db = new Store(":memory:", newDataKey()).db;
  syncRosGraph(db, "fixture", atoms as Record<string, Atom[]>);
  const insState = db.query("insert into ros_state (node_id, stage, evidence, updated_at) values (?, ?, '[]', ?)");
  insState.run(MOMENTUM, "awareness", AT);
  insState.run(FORCE, "understanding", AT);
  db.query("insert into ros_profile (id, role, birth_year_bucket, game, updated_at) values (1, 'independent', '18plus', ?, ?)").run(JSON.stringify(GAME), AT);
  local = rosLiveRoutes(new RosGraph(db), () => AT);
  type N = { id: string; slug: string; title: string; kind: string; tier: number; branch: string; summary: string | null; frontier_flag: string | null; provenance: string };
  live.tables = {
    nodes: db.query<N, []>("select * from ros_nodes order by id").all().map((n) => ({ ...n, provenance: JSON.parse(n.provenance), labels: null, worked_example: null, visibility: "public", owner_id: null, created_at: null })),
    edges: db.query<Record<string, unknown>, []>("select * from ros_edges order by id").all(),
    learning_items: db.query<{ body: string }, []>("select * from ros_items order by kind, ordinal").all().map((i) => ({ ...i, body: JSON.parse(i.body) })),
    learner_node_state: [
      { learner_id: "L1", node_id: MOMENTUM, stage: "awareness", confidence: null, evidence: [], updated_at: new Date(AT).toISOString() },
      { learner_id: "L1", node_id: FORCE, stage: "understanding", confidence: null, evidence: [], updated_at: new Date(AT).toISOString() },
    ],
    learner_profiles: [{ learner_id: "L1", role: "independent", birth_year_bucket: "18plus", consent_status: "self", updated_at: new Date(AT).toISOString() }],
    game: [GAME],
  };
  live.learner = "L1";
});
afterAll(() => {
  live.learner = null;
  live.tables = {};
});

async function both(route: RosLiveRoute, query: string) {
  const web = (await WEB[route]()).GET!(new NextRequest(new URL(`http://web.test${ROS_LIVE_PATHS[route].web}${query}`), { headers: { authorization: "Bearer t" } }), { params: {} });
  const url = new URL(`http://x${ROS_LIVE_PATHS[route].local}${query}`);
  const loc = local[`GET ${ROS_LIVE_PATHS[route].local}`](new Request(url), url);
  const [w, l] = await Promise.all([web, loc]);
  return { web: { status: w.status, body: await w.json() }, local: { status: l.status, body: await l.json() } };
}

const keys = (v: unknown): unknown => (Array.isArray(v) ? v.map(keys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, keys((v as Record<string, unknown>)[k])])) : typeof v);

const CASES: [RosLiveRoute, string][] = [
  ["graph", "?list=1"],
  ["graph", "?branch=02-physics"],
  ["search", "?q=momentum"],
  ["node", `?slug=${MOMENTUM}`],
  ["state", `?nodeIds=${MOMENTUM},${FORCE}`],
  ["directions", `?node=${FORCE}&branch=02-physics`],
  ["connections", ""],
  ["loop", ""],
  ["profile", ""],
  ["modules", `?node=${MOMENTUM}&kind=recall`],
  ["route", `?target=${rosNodeId("02-physics", "rocket")}&branch=02-physics`],
];

describe("live Research OS routes: web and local return the same shape for one fixture", () => {
  test("ten routes, each with a local path and a web path", () => {
    expect(ROS_LIVE_ROUTES.length).toBe(10);
    for (const r of ROS_LIVE_ROUTES) expect(rosLiveLocal(ROS_LIVE_PATHS[r].web)).toBe(ROS_LIVE_PATHS[r].local);
    expect(rosLiveLocal("/api/research-os/roster")).toBeUndefined();
  });

  for (const [route, query] of CASES)
    test(`${route}${query.split("&")[0]}`, async () => {
      const { web, local: loc } = await both(route, query);
      expect(web.status).toBe(200);
      expect(loc.status).toBe(200);
      expect(() => parseRosLive(route, web.body)).not.toThrow();
      expect(() => parseRosLive(route, loc.body)).not.toThrow();
      expect(keys(loc.body)).toEqual(keys(web.body));
    });

  test("graph, search, directions, connections and route agree on values", async () => {
    for (const [route, query] of CASES.filter(([r]) => ["graph", "search", "directions", "connections", "route"].includes(r))) {
      const { web, local: loc } = await both(route, query);
      expect(loc.body).toEqual(web.body);
    }
  });
});
