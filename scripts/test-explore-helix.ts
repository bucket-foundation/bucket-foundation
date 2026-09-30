import { axisOrder, helixFrame, helixMode, helixPoint, HELIX_RADIUS, strandOf } from "../src/lib/explore/modes/helix";
import { SAMPLE_HITS } from "./lib/explore-hits";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const order = axisOrder(SAMPLE_HITS);
check("dated hits come first in year order", order[0].year === 1985 && order[1].year === 1998);
check("undated hits follow by score", order[2].score >= order[3].score);

const l0 = helixMode.layout(SAMPLE_HITS, { selected: null, scroll: 0 });
const pos = new Map(l0.nodes.map((n) => [n.id, n.position]));
const ys = order.map((h) => pos.get(h.id)![1]);
check("axis position rises with year order", ys.every((y, i) => i === 0 || y > ys[i - 1]));
for (const h of SAMPLE_HITS) {
  const p = pos.get(h.id)!;
  const r = Math.hypot(p[0], p[2]);
  const s = strandOf(h);
  check(`${h.id} sits on its strand`, s === null ? r < 1e-9 : Math.abs(r - HELIX_RADIUS) < 1e-9);
}
const a = helixPoint(3, 6, 0, helixFrame(0));
const b = helixPoint(3, 6, 1, helixFrame(0));
check("strands are opposite at one slot", Math.abs(a[0] + b[0]) < 1e-9 && Math.abs(a[2] + b[2]) < 1e-9 && a[1] === b[1]);
check("base pairs join excerpt and advisor", l0.links.length > 0 && l0.links.every((x) => x.from.split(":")[0] !== x.to.split(":")[0]));
check("wheel walks the axis", l0.wheel === "scroll");

const l1 = helixMode.layout(SAMPLE_HITS, { selected: null, scroll: 500 });
const p0 = l0.nodes[0].position;
const p1 = l1.nodes[0].position;
check("scroll moves nodes down the axis", p1[1] < p0[1]);
check("scroll rotates the helix", Math.abs(p1[0] - p0[0]) > 1e-6 || Math.abs(p1[2] - p0[2]) > 1e-6);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
