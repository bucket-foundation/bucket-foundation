import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import type { Atom } from "../../../src/lib/academy/engine";
import { parseRosLive, ROS_LIVE_PATHS, ROS_LIVE_ROUTES, type RosLiveRoute } from "../../../src/lib/research-os/contract";
import { newDataKey } from "../src/crypto";
import { RosGraph, rosLiveRoutes, rosNodeId, syncRosGraph } from "../src/ros";
import { Store } from "../src/store";
import atoms from "./fixtures/ros-atoms.json";

let db: Database;
let routes: ReturnType<typeof rosLiveRoutes>;
const NOW = Date.UTC(2026, 9, 1, 12);

beforeEach(() => {
  db = new Store(":memory:", newDataKey()).db;
  syncRosGraph(db, "v1", atoms as Record<string, Atom[]>);
  routes = rosLiveRoutes(new RosGraph(db), () => NOW);
});

async function call(route: RosLiveRoute, query = "", method: "GET" | "POST" = "GET", body?: unknown) {
  const path = ROS_LIVE_PATHS[route].local;
  const url = new URL(`http://x${path}${query}`);
  const res = await routes[`${method} ${path}`](new Request(url, method === "POST" ? { method, body: JSON.stringify(body) } : {}), url);
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

const MOMENTUM = rosNodeId("02-physics", "momentum");

describe("local Research OS graph", () => {
  test("every live route has a GET handler, and POST where the web takes one", () => {
    for (const r of ROS_LIVE_ROUTES) for (const m of ROS_LIVE_PATHS[r].methods) expect(routes[`${m} ${ROS_LIVE_PATHS[r].local}`]).toBeDefined();
  });

  test("sync builds nodes, prerequisite edges and items once per version, skipping unknown requirements", () => {
    expect(syncRosGraph(db, "v1", atoms as Record<string, Atom[]>)).toBe(false);
    expect(db.query("select count(*) as n from ros_nodes").get()).toEqual({ n: 4 });
    expect(db.query("select from_id, to_id from ros_edges order by id").all()).toEqual([
      { from_id: rosNodeId("02-physics", "force"), to_id: MOMENTUM },
      { from_id: MOMENTUM, to_id: rosNodeId("02-physics", "rocket") },
    ]);
    expect(db.query("select count(*) as n from ros_items").get()).toEqual({ n: 4 });
  });

  test("graph lists branches and returns a branch with standing", async () => {
    expect((await call("graph", "?list=1")).body).toEqual({ branches: [{ id: "02-physics", nodes: 3 }, { id: "07-mind", nodes: 1 }] });
    await call("state", "", "POST", { nodeId: MOMENTUM, action: "open" });
    const g = await call("graph", "?branch=02-physics");
    expect(g.body.nodes.map((n: { slug: string }) => n.slug)).toEqual([rosNodeId("02-physics", "force"), MOMENTUM, rosNodeId("02-physics", "rocket")]);
    expect(g.body.standing).toEqual({ [MOMENTUM]: "awareness" });
    expect((await call("graph", "?branch=../x")).status).toBe(400);
  });

  test("opening a node moves it to awareness, earns XP and shows in state and profile", async () => {
    const opened = await call("state", "", "POST", { nodeId: MOMENTUM, action: "open" });
    expect(opened.body.stage).toBe("awareness");
    expect((await call("state", `?nodeIds=${MOMENTUM}`)).body.states).toEqual([{ nodeId: MOMENTUM, stage: "awareness", confidence: null, updatedAt: new Date(NOW).toISOString() }]);
    expect((await call("profile")).body.game.xp).toBeGreaterThan(0);
    expect((await call("state", "", "POST", { nodeId: "nope", action: "open" })).status).toBe(404);
    expect((await call("state", "", "POST", { nodeId: MOMENTUM, action: "fly" })).status).toBe(400);
  });

  test("node, search, directions, modules and route answer for a seeded node", async () => {
    const n = await call("node", `?slug=${MOMENTUM}`);
    expect(n.body.prerequisites.map((p: { title: string }) => p.title)).toEqual(["Force"]);
    expect(n.body.dependents.map((p: { title: string }) => p.title)).toEqual(["Rocket motion"]);
    expect(n.body.learn).toEqual({ branchFile: "02-physics", atomId: "momentum", href: "/research-os/learn/02-physics/momentum" });
    expect((await call("search", "?q=momentum")).body.results[0].slug).toBe(MOMENTUM);
    expect((await call("directions", `?node=${MOMENTUM}&branch=02-physics`)).body.dependents.map((d: { title: string }) => d.title)).toContain("Rocket motion");
    expect((await call("modules", `?node=${MOMENTUM}&kind=recall`)).body.modules[0].items.length).toBeGreaterThan(0);
    const r = await call("route", `?target=${rosNodeId("02-physics", "rocket")}`);
    expect(r.body.chain.length).toBeGreaterThan(0);
    expect((await call("node", "?slug=missing")).status).toBe(404);
  });

  test("profile saves a role, and the under-13 band clears progress", async () => {
    expect((await call("profile")).body).toEqual({ profile: null, game: null });
    expect((await call("profile", "", "POST", { role: "pilot", birthYearBucket: "18plus" })).status).toBe(400);
    await call("state", "", "POST", { nodeId: MOMENTUM, action: "open" });
    const saved = await call("profile", "", "POST", { role: "independent", birthYearBucket: "under13" });
    expect(saved.body.deleted).toBe(true);
    expect((await call("profile")).body.profile.role).toBe("independent");
    expect((await call("loop")).body.empty).toBe(true);
  });

  test("every success payload passes the shared contract", async () => {
    await call("state", "", "POST", { nodeId: MOMENTUM, action: "open" });
    const cases: [RosLiveRoute, string][] = [
      ["graph", "?list=1"], ["graph", "?branch=02-physics"], ["search", "?q=force"], ["node", `?slug=${MOMENTUM}`], ["state", `?nodeIds=${MOMENTUM}`],
      ["directions", `?node=${MOMENTUM}&branch=02-physics`], ["connections", ""], ["loop", ""], ["profile", ""], ["modules", `?node=${MOMENTUM}`], ["route", `?target=${MOMENTUM}`],
    ];
    for (const [r, q] of cases) {
      const res = await call(r, q);
      expect(res.status).toBe(200);
      expect(() => parseRosLive(r, res.body)).not.toThrow();
    }
  });
});
