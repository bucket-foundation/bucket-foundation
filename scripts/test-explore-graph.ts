import { BRIDGES, GRAPH_RADIUS, bridgeLinks, bridgeMembers, forceLayout, graphMode, type BridgeRecord } from "../src/lib/explore/modes/graph";
import { modeById } from "../src/lib/explore/modes";
import { SAMPLE_HITS } from "./lib/explore-hits";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const ctx = { selected: null, scroll: 0 };
const lightBridge: BridgeRecord = { id: "bridge:light", title: "Light", tier: "secondary", mass: 10, branches: ["physics", "biophysics"] };
const detected: BridgeRecord = { id: "bridge:detected-x", title: "X", tier: "detected", mass: 3, branches: ["physics", "chemistry"], members: [{ branch: "physics", concept: "quantum" }, { branch: "chemistry", concept: "carbon" }] };
const lonely: BridgeRecord = { id: "bridge:lonely", title: "Zebra", tier: "secondary", mass: 1, branches: ["physics"] };

check("bundled bridge data loads", BRIDGES.length >= 12 && BRIDGES.every((b) => b.id.startsWith("bridge:") && b.branches.length > 0));
check("curated bridge matches by title word inside its branches", bridgeMembers(lightBridge, SAMPLE_HITS).join() === "excerpt:05-biophysics/light/b");
check("detected bridge matches by branch and concept", bridgeMembers(detected, SAMPLE_HITS).join() === "excerpt:02-physics/quantum/a,excerpt:03-chemistry/carbon/c");
check("bridges with under two members are dropped", bridgeLinks(SAMPLE_HITS, [lonely, lightBridge, detected]).bridges.map((b) => b.id).join() === detected.id);
check("bridge links point at hits", bridgeLinks(SAMPLE_HITS, [detected]).links.every((l) => l.from === detected.id && SAMPLE_HITS.some((h) => h.id === l.to)));

const ids = ["a", "b", "c", "d"];
const edges: [string, string][] = [["a", "b"], ["b", "c"]];
const p1 = forceLayout(ids, edges);
const p2 = forceLayout(ids, edges);
check("force layout is deterministic", JSON.stringify(Array.from(p1)) === JSON.stringify(Array.from(p2)));
check("force layout stays finite and bounded", Array.from(p1.values()).every((v) => v.every(Number.isFinite) && Math.hypot(...v) < GRAPH_RADIUS * 2));
const dist = (x: string, y: string) => Math.hypot(...p1.get(x)!.map((v, i) => v - p1.get(y)![i]) as [number, number, number]);
check("linked nodes sit closer than unlinked ones", dist("a", "b") < dist("a", "d"));
check("single node lays out", forceLayout(["solo"], []).size === 1);

const layout = graphMode.layout(SAMPLE_HITS, ctx);
const nodeIds = new Set(layout.nodes.map((n) => n.id));
check("graph has a node per hit", SAMPLE_HITS.every((h) => nodeIds.has(h.id)));
check("graph keeps hit links", layout.links.some((l) => l.from === "excerpt:02-physics/quantum/a" && l.to === "advisor:2"));
check("graph links join known nodes", layout.links.every((l) => nodeIds.has(l.from) && nodeIds.has(l.to)));
check("graph registers as a mode", modeById("graph").id === "graph");
check("graph handles no hits", graphMode.layout([], ctx).nodes.length === 0);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
