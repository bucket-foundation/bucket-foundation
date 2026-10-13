import type SmilesDrawerType from "smiles-drawer";
import { atomColor } from "../../../../src/lib/explore/modes/chem";
import { circlePoint } from "./atom-circle";

export interface CircleNode {
  id: string;
  label: string;
  detail: string;
  color: string;
  symbol?: string;
  position: [number, number];
}

export interface CircleBond {
  from: string;
  to: string;
  order: number;
  aromatic: boolean;
}

export interface CircleGraph {
  title: string;
  nodes: CircleNode[];
  bonds: CircleBond[];
  phase?: "reactants" | "products";
}

interface ChemicalAtom {
  element: string;
  bracket?: { charge?: number; isotope?: number };
  countImplicitHydrogens(): number;
}

interface ChemicalGraph {
  vertices: { value: ChemicalAtom }[];
  edges: { sourceId: number; targetId: number; bondType: string; isPartOfAromaticRing: boolean }[];
}

let api: typeof SmilesDrawerType | null = null;
const cache = new Map<string, { atoms: { symbol: string; label: string }[]; bonds: { a: number; b: number; order: number; aromatic: boolean }[] }>();

export const circleChemReady = () => api !== null;

export async function loadCircleChem() {
  const module = await import("smiles-drawer");
  api = module.default ?? module;
}

export function parseCircleStructure(smiles: string) {
  if (!smiles || smiles.length > 5000) throw new Error("Use a SMILES string with 1 to 5000 characters.");
  if (!api) throw new Error("Loading molecule reader.");
  const cached = cache.get(smiles);
  if (cached) return cached;
  const drawer = new api.SvgDrawer({});
  const pre = drawer.preprocessor as unknown as {
    initDraw(tree: unknown, theme: string, infoOnly: boolean): void;
    processGraph(): void;
    graph: ChemicalGraph;
  };
  pre.initDraw(api.Parser.parse(smiles), "light", true);
  if (pre.graph.vertices.length > 1000) throw new Error("Circle views support up to 1000 atoms.");
  pre.processGraph();
  const atoms = pre.graph.vertices.map(({ value }) => {
    const charge = value.bracket?.charge ?? 0;
    const isotope = value.bracket?.isotope ?? 0;
    const suffix = charge ? `${Math.abs(charge) === 1 ? "" : Math.abs(charge)}${charge > 0 ? "+" : "−"}` : "";
    return { symbol: value.element, label: `${isotope || ""}${value.element}${suffix}` };
  });
  const bonds = pre.graph.edges.filter((edge) => edge.bondType !== ".").map((edge) => ({
    a: edge.sourceId, b: edge.targetId,
    order: edge.bondType === "=" ? 2 : edge.bondType === "#" ? 3 : edge.bondType === "$" ? 4 : 1,
    aromatic: edge.isPartOfAromaticRing || edge.bondType === ":",
  }));
  pre.graph.vertices.forEach(({ value }, index) => {
    const hydrogens = value.countImplicitHydrogens();
    if (!Number.isSafeInteger(hydrogens) || hydrogens < 0 || atoms.length + hydrogens > 1000) throw new Error("Circle views support up to 1000 atoms.");
    for (let hydrogen = 0; hydrogen < hydrogens; hydrogen++) {
      bonds.push({ a: index, b: atoms.length, order: 1, aromatic: false });
      atoms.push({ symbol: "H", label: "H" });
    }
  });
  const result = { atoms, bonds };
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  cache.set(smiles, result);
  return result;
}

export function chemicalCircle(title: string, structures: { smiles: string; prefix: string }[]): CircleGraph {
  const nodes: CircleNode[] = [];
  const bonds: CircleBond[] = [];
  for (const { smiles, prefix } of structures) {
    const structure = parseCircleStructure(smiles);
    if (nodes.length + structure.atoms.length > 1000) throw new Error("Circle views support up to 1000 atoms.");
    structure.atoms.forEach((atom, index) => nodes.push({ id: `${prefix}:${index}`, symbol: atom.symbol, label: atom.label, detail: `${atom.label} · atom ${index + 1} · ${smiles}`, color: atomColor(atom.symbol), position: [0, 0] }));
    structure.bonds.forEach((bond) => bonds.push({ from: `${prefix}:${bond.a}`, to: `${prefix}:${bond.b}`, order: bond.order, aromatic: bond.aromatic }));
  }
  return { title, nodes: nodes.map((node, index) => ({ ...node, position: circlePoint(index, nodes.length) })), bonds };
}
