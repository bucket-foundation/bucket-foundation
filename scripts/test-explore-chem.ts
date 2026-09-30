import Module from "node:module";
import path from "node:path";

const esmEntry = path.join(process.cwd(), "node_modules/smiles-drawer/dist/smiles-drawer.min.mjs");
const resolver = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const original = resolver._resolveFilename;
resolver._resolveFilename = (request, ...rest) => (request === "smiles-drawer" ? esmEntry : original(request, ...rest));

import type * as Chem from "../src/lib/explore/modes/chem";
import { SAMPLE_HITS } from "./lib/explore-hits";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MOLECULES, REACTIONS, formula, moleculeLayout, parseStructure, reactionLayout, splitReaction } = require("../src/lib/explore/modes/chem") as typeof Chem;

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const acetic = parseStructure("CC(=O)O");
check("acetic acid has 4 heavy atoms and 3 bonds", acetic.atoms.length === 4 && acetic.bonds.length === 3);
check("acetic acid has one double bond", acetic.bonds.filter((b) => b.order === 2).length === 1);
check("formula orders carbon first", formula(acetic) === "C2O2");
const caffeine = parseStructure(MOLECULES.find((m) => m.id === "caffeine")!.smiles);
check("caffeine has 14 heavy atoms", caffeine.atoms.length === 14);
check("structure is centred", Math.abs(caffeine.atoms.reduce((s, a) => s + a.x, 0)) < 1e-6);
for (const m of MOLECULES) {
  const l = moleculeLayout(SAMPLE_HITS, m.id);
  check(`${m.id} lays out one node per atom plus a hub`, l.nodes.filter((n) => n.id.startsWith("atom:")).length === parseStructure(m.smiles).atoms.length && l.nodes.some((n) => n.id === `molecule:${m.id}`));
}
check("a hit naming ethanol attaches to the hub", moleculeLayout([{ ...SAMPLE_HITS[0], text: "ethanol is a solvent" }], "ethanol").links.length === 1);
const rx = REACTIONS.find((r) => r.id === "esterification")!;
const parts = splitReaction(rx.smiles);
check("esterification has 2 reactants and 2 products", parts.reactants.length === 2 && parts.products.length === 2);
const before = reactionLayout(SAMPLE_HITS, rx.id, 0);
const after = reactionLayout(SAMPLE_HITS, rx.id, 1200);
check("reactants shown at the start", before.nodes.some((n) => n.id.startsWith("reactant:")) && !before.nodes.some((n) => n.id.startsWith("product:")));
check("products shown at the end", after.nodes.some((n) => n.id.startsWith("product:")) && !after.nodes.some((n) => n.id.startsWith("reactant:")));
check("chemistry excerpts attach to the reaction hub", before.links.some((l) => l.from === `reaction:${rx.id}` && l.to === SAMPLE_HITS[2].id));
check("wheel runs the reaction", before.wheel === "scroll");

if (failed) process.exit(1);
