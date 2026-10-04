import { moleculeById, reactionById, splitReaction } from "../../../../src/lib/explore/modes/chem";
import { FAMILY_COLOR, PARTICLES } from "../../../../src/lib/explore/modes/particle";
import type { Hit } from "../../../../src/lib/explore/search";
import type { ExploreMode, ModeContext } from "../../../../src/lib/explore/modes/types";
import { circlePoint } from "./atom-circle";
import { chemicalCircle, type CircleGraph } from "./chem-circle";
import type { DesktopLayout } from "./modesV2";

export function circleLayout(mode: ExploreMode, hits: Hit[], context: ModeContext): DesktopLayout {
  try {
    let circle: CircleGraph;
    if (mode.id === "particle") {
      circle = {
        title: "Particle types",
        nodes: PARTICLES.map((particle, index) => ({ id: `particle:${particle.id}`, label: particle.name, detail: `${particle.name} · ${particle.family} · charge ${particle.charge} · spin ${particle.spin} · ${particle.mass}`, color: FAMILY_COLOR[particle.family], position: circlePoint(index, PARTICLES.length) })),
        bonds: [],
      };
    } else if (mode.id === "molecule") {
      const molecule = moleculeById(context.molecule);
      circle = chemicalCircle(molecule.name, [{ smiles: molecule.smiles, prefix: "atom" }]);
    } else {
      const reaction = reactionById(context.reaction);
      const phase = context.scroll >= 600 ? "products" : "reactants";
      const side = phase === "products" ? "product" : "reactant";
      circle = { ...chemicalCircle(reaction.name, splitReaction(reaction.smiles)[phase].map((smiles, index) => ({ smiles, prefix: `${side}:${index}` }))), phase };
    }
    const base = mode.layout(hits, context);
    const physical = new Set(circle.nodes.map((node) => node.id));
    return {
      ...base, circle, guides: [],
      legend: mode.id === "particle" ? base.legend.filter((item) => item.label !== "physics excerpt naming a particle") : [...new Map(circle.nodes.map((node) => [node.symbol!, { label: node.symbol!, color: node.color }])).values()],
      nodes: [...new Map(base.nodes.filter((node) => !physical.has(node.id)).map((node) => [node.id, node])).values(), ...circle.nodes.map((node) => ({ id: node.id, label: node.detail, color: node.color, position: [node.position[0], node.position[1], 0] as [number, number, number], size: 0.1 }))],
    };
  } catch (error) {
    return { nodes: [], links: [], guides: [], legend: [], camera: [0, 0, 5], circleError: error instanceof Error ? error.message : "Could not read this molecule." };
  }
}
