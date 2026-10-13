import type { Hit } from "../search";
import { hitColor } from "./globe";
import type { ExploreMode, Guide, SceneLink, SceneNode, Vec3 } from "./types";

export type Family = "quark" | "lepton" | "gauge" | "scalar";

export interface Particle {
  id: string;
  name: string;
  family: Family;
  col: number;
  row: number;
  charge: string;
  spin: string;
  mass: string;
  aliases: string[];
}

export const FAMILY_COLOR: Record<Family, string> = {
  quark: "#C9B27A",
  lepton: "#6E8A7E",
  gauge: "#8E3E3E",
  scalar: "#8FA3B8",
};

export const PARTICLES: Particle[] = [
  { id: "up", name: "up", family: "quark", col: 0, row: 0, charge: "+2/3", spin: "1/2", mass: "2.2 MeV", aliases: ["up quark"] },
  { id: "charm", name: "charm", family: "quark", col: 1, row: 0, charge: "+2/3", spin: "1/2", mass: "1.27 GeV", aliases: ["charm quark"] },
  { id: "top", name: "top", family: "quark", col: 2, row: 0, charge: "+2/3", spin: "1/2", mass: "173 GeV", aliases: ["top quark"] },
  { id: "down", name: "down", family: "quark", col: 0, row: 1, charge: "-1/3", spin: "1/2", mass: "4.7 MeV", aliases: ["down quark"] },
  { id: "strange", name: "strange", family: "quark", col: 1, row: 1, charge: "-1/3", spin: "1/2", mass: "93 MeV", aliases: ["strange quark"] },
  { id: "bottom", name: "bottom", family: "quark", col: 2, row: 1, charge: "-1/3", spin: "1/2", mass: "4.18 GeV", aliases: ["bottom quark"] },
  { id: "electron", name: "electron", family: "lepton", col: 0, row: 2, charge: "-1", spin: "1/2", mass: "0.511 MeV", aliases: ["electrons"] },
  { id: "muon", name: "muon", family: "lepton", col: 1, row: 2, charge: "-1", spin: "1/2", mass: "105.7 MeV", aliases: ["muons"] },
  { id: "tau", name: "tau", family: "lepton", col: 2, row: 2, charge: "-1", spin: "1/2", mass: "1.777 GeV", aliases: ["tauon"] },
  { id: "nu_e", name: "electron neutrino", family: "lepton", col: 0, row: 3, charge: "0", spin: "1/2", mass: "< 0.8 eV", aliases: ["neutrino", "neutrinos"] },
  { id: "nu_mu", name: "muon neutrino", family: "lepton", col: 1, row: 3, charge: "0", spin: "1/2", mass: "< 0.17 MeV", aliases: [] },
  { id: "nu_tau", name: "tau neutrino", family: "lepton", col: 2, row: 3, charge: "0", spin: "1/2", mass: "< 18.2 MeV", aliases: [] },
  { id: "gluon", name: "gluon", family: "gauge", col: 3, row: 0, charge: "0", spin: "1", mass: "0", aliases: ["gluons", "strong force"] },
  { id: "photon", name: "photon", family: "gauge", col: 3, row: 1, charge: "0", spin: "1", mass: "0", aliases: ["photons", "light quanta"] },
  { id: "z", name: "Z boson", family: "gauge", col: 3, row: 2, charge: "0", spin: "1", mass: "91.19 GeV", aliases: ["z boson"] },
  { id: "w", name: "W boson", family: "gauge", col: 3, row: 3, charge: "±1", spin: "1", mass: "80.38 GeV", aliases: ["w boson", "weak force"] },
  { id: "higgs", name: "Higgs boson", family: "scalar", col: 4, row: 1.5, charge: "0", spin: "0", mass: "125.1 GeV", aliases: ["higgs field", "higgs"] },
];

export function mentions(h: Hit, p: Particle): boolean {
  const hay = `${h.title} ${h.text}`.toLowerCase();
  return [p.name, ...p.aliases].some((t) => new RegExp(`\\b${t.toLowerCase()}\\b`).test(hay));
}

export function isPhysics(h: Hit): boolean {
  return h.branch.startsWith("02-physics") || h.branch === "physics";
}

export function particleLayout(hits: Hit[]) {
  const nodes: SceneNode[] = [];
  const links: SceneLink[] = [];
  const guides: Guide[] = [];
  const pos = (p: Particle): Vec3 => [(p.col - 2) * 0.9, (1.5 - p.row) * 0.9, 0];
  for (const p of PARTICLES) {
    nodes.push({ id: `particle:${p.id}`, position: pos(p), color: FAMILY_COLOR[p.family], size: 0.2, label: `${p.name} · charge ${p.charge} · spin ${p.spin} · ${p.mass}` });
    guides.push({ kind: "text", position: [pos(p)[0], pos(p)[1] - 0.32, 0], text: p.name, color: "#B8AE94", size: 9 });
  }
  const physics = Array.from(new Map(hits.filter(isPhysics).map((h) => [h.id, h])).values());
  const placed = physics.filter((h) => PARTICLES.some((p) => mentions(h, p)));
  placed.forEach((h, i) => {
    nodes.push({ id: h.id, position: [(i % 8) * 0.75 - 2.6, -2.5 - Math.floor(i / 8) * 0.3, 0.4], color: hitColor(h), size: 0.07, label: h.title });
    for (const p of PARTICLES) if (mentions(h, p)) links.push({ from: h.id, to: `particle:${p.id}`, color: "#D9A43A" });
  });
  return { nodes, links, guides };
}

export const particleMode: ExploreMode = {
  id: "particle",
  label: "Particle",
  layout(hits, ctx) {
    const { nodes, links, guides } = particleLayout([...(ctx.extraHits ?? []), ...hits]);
    return {
      nodes,
      links,
      guides,
      legend: [
        { label: "quark", color: FAMILY_COLOR.quark },
        { label: "lepton", color: FAMILY_COLOR.lepton },
        { label: "gauge boson", color: FAMILY_COLOR.gauge },
        { label: "Higgs", color: FAMILY_COLOR.scalar },
        { label: "physics excerpt naming a particle", color: "#8E3E3E" },
      ],
      camera: [0, -0.6, 8.5],
      wheel: "zoom",
    };
  },
};
