import { MODES, modeById } from "../src/lib/explore/modes";
import { GLOBE_RADIUS, hitColor } from "../src/lib/explore/modes/globe";
import { BRANCH_COLOR, globeProjection } from "../src/components/canon-globe/projections";
import { SAMPLE_HITS } from "./lib/explore-hits";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}


const ctx = { selected: null, scroll: 0 };

check("mode ids are unique", new Set(MODES.map((m) => m.id)).size === MODES.length);
check("unknown mode falls back to globe", modeById("nope").id === "globe");

for (const m of MODES) {
  const l = m.layout(SAMPLE_HITS, ctx);
  const ids = new Set(l.nodes.map((n) => n.id));
  check(`${m.id}: positions are finite`, l.nodes.every((n) => n.position.every(Number.isFinite)));
  check(`${m.id}: node ids unique`, ids.size === l.nodes.length);
  check(`${m.id}: links join known nodes`, l.links.every((x) => ids.has(x.from) && ids.has(x.to)));
  check(`${m.id}: legend is non-empty`, l.legend.length > 0);
  check(`${m.id}: empty hits lay out`, Array.isArray(m.layout([], ctx).nodes));
}

const globe = modeById("globe").layout(SAMPLE_HITS, ctx);
check("globe nodes sit on the canon globe radius", globe.nodes.every((n) => Math.abs(Math.hypot(...n.position) - GLOBE_RADIUS) < 1e-6));
check("globe uses the canon camera", globe.camera === globeProjection.camera);
check("excerpts use the canon branch palette", hitColor(SAMPLE_HITS[0]) === BRANCH_COLOR.physics);
check("globe draws the advisor to excerpt link", globe.links.some((x) => x.from === "excerpt:02-physics/quantum/a" && x.to === "advisor:2"));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
