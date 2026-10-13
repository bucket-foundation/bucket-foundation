import { axisAngles, cosine, nearestAdvisors, project, termVector, type MapAxis, type MapModel } from "../src/lib/explore/map";
import { mapLayout, nearestExcerpts, YOU_ID } from "../src/lib/explore/modes/map";
import { MODES, modeById } from "../src/lib/explore/modes";
import { advisorSources, loadAdvisors, primeAxes } from "../src/lib/explore/advisors";
import { parseAdvisorReview, parsePrimeDirections } from "../src/lib/research-os/advisor-review";
import sampleReview from "../src/lib/explore/fixtures/advisors.sample.json";
import samplePrime from "../src/lib/explore/fixtures/prime.sample.json";
import type { Hit } from "../src/lib/explore/search";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const axes: MapAxis[] = [
  { label: "light", angle: 0, terms: ["light", "water"] },
  { label: "quantum", angle: 90, terms: ["quantum", "field"] },
  { label: "genes", angle: 180, terms: ["gene", "protein"] },
  { label: "entropy", angle: 270, terms: ["entropy", "information"] },
];
const angles = axisAngles(axes);

check("angles convert degrees to radians", near(angles[1], Math.PI / 2));
check("equal angles spread axes evenly", axisAngles(axes.map((a) => ({ ...a, angle: 0 })))[2] === Math.PI);
const [px, py] = project([1, 0, 0, 0], angles);
check("a pure axis vector lands on that axis", near(px, 1) && near(py, 0));
const [mx, my] = project([1, 1, 0, 0], angles);
check("mixed vectors land between axes", near(mx, 0.5) && near(my, 0.5));
check("zero vector lands at the origin", project([0, 0, 0, 0], angles).every((v) => v === 0));
check("opposite axes cancel", near(project([1, 0, 1, 0], angles)[0], 0));
check("cosine of parallel vectors is one", near(cosine([1, 2], [2, 4]), 1) && cosine([0, 0], [1, 1]) === 0);

const tv = termVector("Light and water. Light, light: quantum.", axes);
check("term vector peaks on the matching axis", tv[0] === 1 && tv[1] > 0 && tv[1] < 1 && tv[2] === 0);
check("text with no prime terms gives a zero vector", termVector("nothing relevant here", axes).every((v) => v === 0));

const review = parseAdvisorReview(sampleReview);
const prime = parsePrimeDirections(samplePrime);
const sources = advisorSources(review, prime);
check("advisor sources carry star_prime", sources[0].star?.length === 4);
const sampleAxes = primeAxes(review, prime);
check("prime axes carry labels, angles and terms", sampleAxes.length === 4 && sampleAxes[0].label === "light and water" && sampleAxes[1].angle === 90 && sampleAxes[0].terms.includes("light"));
process.env.BUCKET_ADVISOR_REVIEW = "/nonexistent/review.json";
check("loadAdvisors exposes the prime axes", loadAdvisors({ ...process.env, NODE_ENV: "test" }).axes.length === 4);

const model: MapModel = {
  axes: sampleAxes,
  advisors: sources.map((s) => ({ id: `advisor:${s.rank}`, name: s.name, field: s.field, score: s.score, star: s.star ?? [] })),
};
const base = mapLayout(model, [], undefined);
check("map without a statement shows only advisors", base.nodes.length === 6 && !base.nodes.some((n) => n.id === YOU_ID) && base.links.length === 0);
check("advisor A sits nearer the light axis than advisor B", (() => {
  const a = base.nodes.find((n) => n.id === "advisor:1")!.position;
  const b = base.nodes.find((n) => n.id === "advisor:2")!.position;
  return a[0] > b[0] && b[1] > a[1];
})());
check("legend states the method", base.legend.some((l) => l.label.includes("term overlap with prime directions, not fit-me")));
check("axis guides carry labels", base.guides.filter((g) => g.kind === "text").length === 4);
check("empty model gives an empty layout", mapLayout(null, [], "x").nodes.length === 0);

const hits: Hit[] = [
  { id: "excerpt:05-biophysics/light/a", type: "excerpt", title: "Light and water", subtitle: "", text: "mitochondria light water", score: 1, branch: "05-biophysics", year: null, url: null, links: [] },
  { id: "excerpt:02-physics/q/b", type: "excerpt", title: "Quantum fields", subtitle: "", text: "quantum field photon", score: 1, branch: "02-physics", year: null, url: null, links: [] },
  { id: "advisor:1", type: "advisor", title: "Sample Advisor A", subtitle: "", text: "light", score: 1, branch: "x", year: null, url: null, links: [] },
];
const statement = "I study light and water inside mitochondria, and how light moves water in cells.";
const withYou = mapLayout(model, hits, statement);
const you = withYou.nodes.find((n) => n.id === YOU_ID);
check("uploaded statement becomes a you node", !!you && you.color === "#F2C14E");
check("you node sits on the light side", !!you && you.position[0] > 0.5);
const linked = withYou.links.filter((l) => l.from === YOU_ID).map((l) => l.to);
check("you links to the nearest advisor", linked[0] === "advisor:1" || linked.includes("advisor:1"));
check("you links to the nearest canon excerpt only", linked.includes("excerpt:05-biophysics/light/a") && !linked.includes("excerpt:02-physics/q/b"));
check("every link ends on a node", withYou.links.every((l) => withYou.nodes.some((n) => n.id === l.to) && withYou.nodes.some((n) => n.id === l.from)));
check("nearestAdvisors ranks by cosine", nearestAdvisors(termVector(statement, sampleAxes), model.advisors, 1)[0].id === "advisor:1");
check("nearestExcerpts skips non-excerpts", nearestExcerpts(statement, hits).every((h) => h.type === "excerpt"));
check("map mode is registered and resolves by id", MODES.some((m) => m.id === "map") && modeById("map").label === "Map");
check("map mode layout reads the context", modeById("map").layout(hits, { selected: null, scroll: 0, map: model, youText: statement }).nodes.some((n) => n.id === YOU_ID));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
