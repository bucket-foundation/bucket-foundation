import * as fs from "fs";
import * as path from "path";
import {
  BRANCH_COUNT,
  CIRCLE_OUTER,
  PROJECTIONS,
  buildThetaIndex,
  capBranchBalanced,
  circleProjection,
  globeProjection,
  markerScales,
  ringRadius,
  UNRANKED_RING,
  type ProjectionItem,
  type ThetaSort,
} from "../src/components/canon-globe/projections";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const ROOT = path.join(__dirname, "..");
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-timeline.json"), "utf8"));
const sites = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-sites.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-embeddings.json"), "utf8"));

const eventIds = new Set<string>(timeline.events.map((e: { id: string }) => e.id));
const universe: ProjectionItem[] = [
  ...timeline.events,
  ...sites.sites.map((s: ProjectionItem) => ({ ...s, id: eventIds.has(s.id) ? `site:${s.id}` : s.id })),
  { id: "unranked-x", lat: 10, lng: 20, branch: "earth" },
];
const rankTheta = new Map<string, number>(manifest.items.map((i: { id: string; theta: number }) => [i.id, i.theta]));
const RADIUS = 1.008;
const SORTS: ThetaSort[] = ["rank", "year", "branch"];

for (const sort of SORTS) {
  const idx = buildThetaIndex(universe, sort, rankTheta);
  const ctx = { radius: RADIUS, theta: (id: string) => idx.get(id) ?? 0 };
  for (const proj of Object.values(PROJECTIONS)) {
    const pts = universe.map((u) => proj.position(u, ctx));
    check(`${proj.id}/${sort}: finite`, pts.every((p) => p.every(Number.isFinite)));
    const maxR = Math.max(...pts.map((p) => Math.hypot(...p)));
    const bound = proj.id === "globe" ? RADIUS + 1e-9 : RADIUS * CIRCLE_OUTER + 1e-9;
    check(`${proj.id}/${sort}: bounded`, maxR <= bound, maxR.toFixed(4));
    const again = universe.map((u) => proj.position(u, ctx));
    check(`${proj.id}/${sort}: deterministic`, JSON.stringify(pts) === JSON.stringify(again));
  }
  check(`${sort}: theta in [0, 2pi)`, Array.from(idx.values()).every((t) => t >= 0 && t < Math.PI * 2));
  check(`${sort}: every item has theta`, universe.every((u) => idx.has(u.id)));
  const rebuilt = buildThetaIndex(universe, sort, rankTheta);
  check(`${sort}: index deterministic`, universe.every((u) => rebuilt.get(u.id) === idx.get(u.id)));

  const math = universe.filter((u) => u.branch === "mathematics");
  const shown = new Set(math.map((u) => u.id));
  const stable = universe.filter((u) => shown.has(u.id)).every((u) => {
    const a = circleProjection.position(u, ctx);
    const b = circleProjection.position(u, { radius: RADIUS, theta: (id: string) => (shown.has(id) ? idx.get(id)! : NaN) });
    return a[0] === b[0] && a[1] === b[1];
  });
  check(`${sort}: position of a shown item ignores hidden items`, math.length > 0 && stable);
}

const rankIdx = buildThetaIndex(universe, "rank", rankTheta);
const mathOnly = universe.filter((u) => u.branch === "mathematics");
const rankMath = buildThetaIndex(mathOnly, "rank", rankTheta);
check("rank stable under filter", mathOnly.every((u) => rankMath.get(u.id) === rankIdx.get(u.id)));
check("rank sort uses stored manifest theta", universe.filter((u) => rankTheta.has(u.id)).every((u) => rankIdx.get(u.id) === rankTheta.get(u.id)));

const yearIdx = buildThetaIndex(universe, "year", rankTheta);
const byYear = universe.filter((u) => u.year !== undefined).sort((a, b) => (yearIdx.get(a.id)! - yearIdx.get(b.id)!));
check("year sort: angle increases with year", byYear.every((u, i) => i === 0 || u.year! >= byYear[i - 1].year!));

const circleCtx = { radius: RADIUS, theta: () => 0 };
const ringSet = new Set(universe.map((u) => ringRadius(u.branch, RADIUS).toFixed(6)));
check("circle: one ring per branch", ringSet.size <= BRANCH_COUNT && ringSet.size >= 9, String(ringSet.size));
const p0 = circleProjection.position({ id: "a", lat: 0, lng: 0, branch: "mathematics" }, circleCtx);
check("circle: theta 0 sits at 12 o'clock", Math.abs(p0[0]) < 1e-9 && p0[1] > 0);
const g = globeProjection.position({ id: "np", lat: 90, lng: 0, branch: "physics" }, circleCtx);
check("globe: north pole on +y", Math.abs(g[1] - RADIUS) < 1e-9);

const front = markerScales({ lifted: false, lodScale: 1, facing: 0.8, globeWeight: 1 });
const back = markerScales({ lifted: false, lodScale: 1, facing: -0.5, globeWeight: 1 });
const backLifted = markerScales({ lifted: true, lodScale: 1, facing: 0.05, globeWeight: 1 });
const inCircle = markerScales({ lifted: false, lodScale: 1, facing: -0.5, globeWeight: 0 });
check("globe: front marker is hittable", front.hit > 0);
check("globe: far-side marker has zero hit scale", back.hit === 0 && backLifted.hit === 0);
check("globe: far-side marker drawn smaller", back.size < front.size && back.size > 0);
check("circle: facing ignored, every marker hittable", inCircle.hit > 0 && inCircle.size === front.size);

const unrankedIds = universe.filter((u) => !rankTheta.has(u.id)).map((u) => u.id).sort();
const rIdx = buildThetaIndex(universe, "rank", rankTheta);
check("rank: unranked items spaced evenly in id order", unrankedIds.every((id, i) => rIdx.get(id) === (2 * Math.PI * i) / unrankedIds.length));
const outer = circleProjection.position(universe[universe.length - 1], { radius: RADIUS, theta: () => 0, unranked: (id) => !rankTheta.has(id) });
check("circle: unranked items sit on the outer labeled ring", Math.abs(Math.hypot(...outer) - RADIUS * UNRANKED_RING) < 1e-9);
check("circle: outer ring lies outside every branch ring", UNRANKED_RING > CIRCLE_OUTER);

const big: ProjectionItem[] = [];
const branches = ["mathematics", "physics", "chemistry", "mind"];
for (let i = 0; i < 400; i++) big.push({ id: `m${i}`, lat: 0, lng: 0, branch: i < 340 ? "mathematics" : branches[1 + (i % 3)] });
const capped = capBranchBalanced(big, 250, (id) => Number(id.slice(1)), "m399");
check("cap: size 250", capped.length === 250);
check("cap: keeps active marker", capped.some((c) => c.id === "m399"));
check("cap: keeps every small branch whole", big.filter((b) => b.branch !== "mathematics").every((b) => capped.includes(b)));
check("cap: preserves input order", capped.every((c, i) => i === 0 || Number(c.id.slice(1)) > Number(capped[i - 1].id.slice(1))));
check("cap: no-op under cap", capBranchBalanced(big.slice(0, 10), 250, () => 0).length === 10);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
