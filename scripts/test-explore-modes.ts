import { MODES, modeById } from "../src/lib/explore/modes";
import { GLOBE_RADIUS, excerptConcept, hitColor, hitLatLng } from "../src/lib/explore/modes/globe";
import { ALL_EVENTS, matchExcerptEvent } from "../src/lib/canon-explorer/markers";
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

const events = [
  { id: "planck-1900", title: "Max Planck (quantum hypothesis)", lat: 52.5, lng: 13.4, year: 1900, branch: "02-physics", kind: "canon-entry" },
  { id: "water-structure", title: "Structured water", lat: 47.6, lng: -122.3, year: 2003, branch: "05-biophysics", kind: "canon-entry" },
];
const planckHit: Hit = { ...SAMPLE_HITS[0], id: "excerpt:02-physics/radiation/p", title: "Planck on black body radiation" };
check("excerpt matched by surname sits on its event", JSON.stringify(hitLatLng(planckHit, 0, 1, events)) === JSON.stringify({ lat: 52.5, lng: 13.4 }));
const waterHit: Hit = { ...SAMPLE_HITS[1], id: "excerpt:05-biophysics/water/w", title: "Exclusion zones" };
check("excerpt matched by concept sits on its event", hitLatLng(waterHit, 0, 1, events).lat === 47.6);
check("match stays inside the excerpt branch", matchExcerptEvent({ title: "Planck", concept: "x", branch: "03-chemistry" }, events) === undefined);
const unmatched = hitLatLng(SAMPLE_HITS[2], 0, 3, events);
check("unmatched excerpt falls back to its branch band", unmatched.lat < 70 && unmatched.lat > -70);
check("advisors never take event positions", hitLatLng(SAMPLE_HITS[3], 0, 1, events).lat < hitLatLng(SAMPLE_HITS[0], 0, 1, []).lat);
check("excerpt concept parses from the hit id", excerptConcept(waterHit) === "water");

const real = ALL_EVENTS[0];
const realHit: Hit = { ...SAMPLE_HITS[0], id: `excerpt:${real.branch}/${real.id}/r`, title: "excerpt", branch: real.branch };
const found = matchExcerptEvent({ title: realHit.title, concept: real.id, branch: real.branch });
check("a real timeline event matches its excerpt", found !== undefined);
if (found) {
  const node = modeById("globe").layout([realHit], ctx).nodes[0];
  const target = globeProjection.position({ id: found.id, lat: found.lat, lng: found.lng, branch: found.branch }, { radius: GLOBE_RADIUS, theta: () => 0 });
  check("globe mode places a real excerpt at the CanonGlobeMount marker position", node.position.every((v, i) => Math.abs(v - target[i]) < 1e-9));
}

const spread = modeById("globe").layout(SAMPLE_HITS, ctx).nodes.map((n) => n.position.join(","));
check("globe nodes do not overlap", new Set(spread).size === spread.length);
check("globe node size grows with score", (() => {
  const l = modeById("globe").layout(SAMPLE_HITS, ctx).nodes;
  return l[0].size > l[2].size;
})());
check("globe legend lists only branches present", globe.legend.every((x) => ["physics", "biophysics", "chemistry", "advisor", "work"].includes(x.label)));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
