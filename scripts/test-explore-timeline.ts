import { modeById } from "../src/lib/explore/modes";
import { ERA_BANDS, LANES, eraEventCount, eraOf, laneOf, laneY, timelineMode, timelinePositions, undatedX, yearX } from "../src/lib/explore/modes/timeline";
import { ALL_EVENTS } from "../src/lib/canon-explorer/markers";
import type { Hit } from "../src/lib/explore/search";
import { SAMPLE_HITS } from "./lib/explore-hits";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const ctx = { selected: null, scroll: 0 };
check("era bands are contiguous", ERA_BANDS.every((b, i) => i === 0 || b.from === ERA_BANDS[i - 1].to));
check("era bands cover every canon timeline event", ALL_EVENTS.every((e) => e.year >= ERA_BANDS[0].from && e.year <= ERA_BANDS[ERA_BANDS.length - 1].to));
check("era counts sum to the event total", ERA_BANDS.reduce((n, b) => n + eraEventCount(b), 0) === ALL_EVENTS.length);
check("year picks its era", eraOf(-10000).id === "deep" && eraOf(1687).id === "early-modern" && eraOf(2013).id === "contemporary");
check("year axis rises with year", [-17000, -500, 400, 1200, 1687, 1900, 2020].every((y, i, a) => i === 0 || yearX(y) > yearX(a[i - 1])));
check("era boundary is continuous", Math.abs(yearX(1499.999) - yearX(1500)) < 1e-3);
check("undated column sits right of the axis", undatedX(0, 3) > yearX(2020));
check("lanes cover branches, advisors and works", LANES.includes("advisor") && LANES.includes("work") && LANES.includes("physics"));

const layout = timelineMode.layout(SAMPLE_HITS, ctx);
const pos = new Map(layout.nodes.map((n) => [n.id, n.position]));
const advisorA = pos.get("advisor:2")!;
const advisorB = pos.get("advisor:1")!;
check("earlier advisor sits left of later advisor", advisorA[0] < advisorB[0]);
check("dated hits sit on their lane", Math.abs(advisorA[1] - laneY(laneOf(SAMPLE_HITS[3]))) < 0.2);
check("undated hits sit right of every dated hit", pos.get("excerpt:02-physics/quantum/a")![0] > advisorB[0]);
check("the axis stays flat", layout.nodes.every((n) => Math.abs(n.position[2]) < 0.05));
check("nodes do not overlap", new Set(layout.nodes.map((n) => n.position.join(","))).size === layout.nodes.length);
check("era bands render as guides", layout.guides.filter((g) => g.kind === "text").length >= ERA_BANDS.length);

const crowd: Hit[] = Array.from({ length: 6 }, (_, i) => ({ ...SAMPLE_HITS[3], id: `advisor:c${i}`, year: 1900 }));
check("same-year hits in one lane stack apart", new Set(Array.from(timelinePositions(crowd).values()).map((p) => p.join(","))).size === crowd.length);
check("axis is labelled as eras, not to scale", layout.guides.some((g) => g.kind === "text" && g.text.startsWith("Eras, not to scale") && g.text.includes("Bucket")));
check("timeline registers as a mode", modeById("timeline").id === "timeline");
check("timeline handles no hits", timelineMode.layout([], ctx).nodes.length === 0);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
