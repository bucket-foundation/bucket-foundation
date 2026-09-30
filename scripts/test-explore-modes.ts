import { MODES, modeById } from "../src/lib/explore/modes";
import { GLOBE_RADIUS, hitColor } from "../src/lib/explore/modes/globe";
import { BRANCH_COLOR, globeProjection } from "../src/components/canon-globe/projections";
import type { Hit } from "../src/lib/explore/search";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

export const SAMPLE_HITS: Hit[] = [
  { id: "excerpt:02-physics/quantum/a", type: "excerpt", title: "Photon", subtitle: "", text: "photon quantum carbon MTHFR", score: 0.9, branch: "02-physics", year: null, url: null, links: ["advisor:2"] },
  { id: "excerpt:05-biophysics/light/b", type: "excerpt", title: "Light", subtitle: "", text: "light water oxygen", score: 0.7, branch: "05-biophysics", year: null, url: null, links: ["advisor:1"] },
  { id: "excerpt:03-chemistry/carbon/c", type: "excerpt", title: "Carbon", subtitle: "", text: "carbon bond hydrogen electron", score: 0.5, branch: "03-chemistry", year: null, url: null, links: [] },
  { id: "advisor:2", type: "advisor", title: "Sample Advisor B", subtitle: "physics", text: "quantum photon", score: 0.8, branch: "physics", year: 1985, url: null, links: ["excerpt:02-physics/quantum/a"] },
  { id: "advisor:1", type: "advisor", title: "Sample Advisor A", subtitle: "biophysics", text: "light", score: 0.6, branch: "biophysics", year: 1998, url: null, links: ["excerpt:05-biophysics/light/b"] },
  { id: "work:02-physics/quantum", type: "work", title: "quantum", subtitle: "", text: "", score: 0.85, branch: "02-physics", year: null, url: null, links: ["excerpt:02-physics/quantum/a"] },
];

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
