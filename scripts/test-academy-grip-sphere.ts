import { gripSphere, branchAngle, atomCurrentAndPeak } from "../src/lib/academy/grip-sphere";
import { BRANCH_ORDER } from "../src/components/canon-globe/projections";
import type { StoredEngineState } from "../src/lib/academy/mastery";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

const strong = { cards: { a1: { stability: 1e6 }, a2: { stability: 1e6 } } } as StoredEngineState;
const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);

{
  const g = gripSphere([]);
  ok(g.radius === 0 && g.atomWeighted === 0 && g.axes.length === 0, "empty input gives radius 0");
}
{
  const g = gripSphere([{ branch: "01-mathematics", atomIds: ids("m", 4), state: null }]);
  ok(g.radius === 0 && g.axes.length === 1 && g.axes[0].atoms === 4, "unstudied atoms count as zero");
}
{
  const g = gripSphere([{ branch: "01-mathematics", atomIds: ["a1", "a2"], state: strong }]);
  ok(near(g.radius, 1, 1e-6) && near(g.atomWeighted, 1, 1e-6), "all mastered gives radius 1");
}
{
  const g = gripSphere([
    { branch: "01-mathematics", atomIds: ["a1", "a2"], state: strong },
    { branch: "02-physics", atomIds: ids("p", 6), state: null },
  ]);
  ok(near(g.radius, 0.5, 1e-6), "radius is the equal-weight mean over branches");
  ok(near(g.atomWeighted, 0.25, 1e-6), "atom-weighted mean differs when branch sizes differ");
}
{
  const g = gripSphere([
    { branch: "01-mathematics", atomIds: ["a1", "a2"], state: strong },
    { branch: "deep-history", atomIds: [], state: null },
    { branch: "sacred-texts", atomIds: [], state: null },
    { branch: "00-learning-to-learn", atomIds: ["a1"], state: strong },
  ]);
  ok(g.axes.length === 1 && near(g.radius, 1, 1e-6), "branches with zero atoms and non-canon decks are excluded from the mean");
}
{
  const decayed = { cards: { x: { stability: 1 } }, prof: { x: { theta: 3, n: 5 } } } as StoredEngineState;
  const { current, peak } = atomCurrentAndPeak(decayed, "x");
  ok(peak > current && peak <= 1, "peak holds retention at 1 and exceeds decayed current");
  const g = gripSphere([{ branch: "02-physics", atomIds: ["x"], state: decayed }]);
  ok(g.peakRadius >= g.radius, "peak radius is at least current radius");
}
{
  const g = gripSphere([{ branch: "07-mind", atomIds: ["a1"], state: strong }]);
  ok(g.axes[0].index === BRANCH_ORDER.indexOf("mind") && near(g.axes[0].angle, branchAngle(6)), "axis angle follows BRANCH_ORDER on the circle");
  ok(near(branchAngle(1) - branchAngle(0), (2 * Math.PI) / BRANCH_ORDER.length), "branches are evenly spaced");
  ok(JSON.stringify(g) === JSON.stringify(gripSphere([{ branch: "07-mind", atomIds: ["a1"], state: strong }])), "output is deterministic");
}

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("grip-sphere: all passed");
