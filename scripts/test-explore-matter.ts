import { ELEMENTS, atomLayout, atomMode, elementByZ, hitMentions } from "../src/lib/explore/modes/atom";
import { PARTICLES, particleLayout, particleMode } from "../src/lib/explore/modes/particle";
import { MODES } from "../src/lib/explore/modes";
import { SAMPLE_HITS } from "./lib/explore-hits";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

check("118 elements from the package", ELEMENTS.length === 118);
check("shell counts sum to Z", ELEMENTS.every((e) => e.shells.reduce((a, b) => a + b, 0) === e.z));
const carbon = atomLayout(SAMPLE_HITS, 6);
check("carbon has 6 electrons and 2 shells", carbon.nodes.filter((n) => n.id.startsWith("electron:")).length === 6 && carbon.guides.filter((g) => g.kind === "ring").length === 2);
check("hits naming carbon attach to the nucleus", carbon.links.length === 2 && carbon.links.every((l) => l.from === "element:C"));
check("hit mention needs a word match", !hitMentions({ ...SAMPLE_HITS[0], title: "Carbonate", text: "" }, elementByZ(6)));
check("unknown Z falls back to carbon", elementByZ(999).symbol === "C");
const og = atomLayout([], 118);
check("oganesson has 118 electrons", og.nodes.filter((n) => n.id.startsWith("electron:")).length === 118);

check("Standard Model chart has 17 entries", PARTICLES.length === 17);
const pl = particleLayout(SAMPLE_HITS);
check("physics excerpt naming photon and electron links to both", pl.links.filter((l) => l.from === SAMPLE_HITS[0].id).map((l) => l.to).sort().join() === "particle:electron,particle:photon");
check("non-physics excerpts are not placed", !pl.nodes.some((n) => n.id === SAMPLE_HITS[1].id));
check("modes registered", ["atom", "particle"].every((id) => MODES.some((m) => m.id === id)));
check("atom and particle layouts expose a legend", atomMode.layout([], { selected: null, scroll: 0 }).legend.length > 0 && particleMode.layout([], { selected: null, scroll: 0 }).legend.length > 0);

if (failed) process.exit(1);
