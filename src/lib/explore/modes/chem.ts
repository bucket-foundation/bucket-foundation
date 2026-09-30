import type SmilesDrawerType from "smiles-drawer";
import type { Hit } from "../search";
import chem from "../fixtures/chem.json";
import elements from "../fixtures/elements.json";
import { hitColor } from "./globe";
import type { ExploreMode, Guide, SceneLayout, SceneLink, SceneNode, Vec3 } from "./types";

export interface Molecule {
  id: string;
  name: string;
  smiles: string;
}

export interface Reaction {
  id: string;
  name: string;
  smiles: string;
}

export interface Atom {
  element: string;
  x: number;
  y: number;
}

export interface Bond {
  a: number;
  b: number;
  order: number;
}

export interface Structure {
  atoms: Atom[];
  bonds: Bond[];
}

interface Vertex {
  value: { element: string };
  position: { x: number; y: number };
}

interface Edge {
  sourceId: number;
  targetId: number;
  bondType: string;
}

interface Pre {
  initDraw(tree: unknown, theme: string, infoOnly: boolean): void;
  processGraph(): void;
  graph: { vertices: Vertex[]; edges: Edge[] };
}

export type SmilesApi = typeof SmilesDrawerType;

let smilesApi: SmilesApi | null = null;

export function setSmilesApi(api: SmilesApi | null): void {
  smilesApi = api?.SvgDrawer ? api : null;
}

export function smilesReady(): boolean {
  return smilesApi !== null;
}

export async function loadSmiles(): Promise<void> {
  if (smilesApi) return;
  const mod = await import("smiles-drawer");
  setSmilesApi((mod.default ?? mod) as SmilesApi);
}

export const MOLECULES = chem.molecules as Molecule[];
export const REACTIONS = chem.reactions as Reaction[];
export const BOND_LENGTH = 30;
export const SCALE = 0.55;
export const ATOM_COLOR = "#909090";
export const BOND_COLOR = "#B8AE94";
export const HUB_COLOR = "#D9A43A";

const ORDER: Record<string, number> = { "-": 1, "=": 2, "#": 3, ":": 1 };
const BY_SYMBOL = new Map(elements.map((e) => [e.symbol, e]));

export const UPLOAD_PREFIX = "upload-";
let uploadCount = 0;

export function registerCustom(list: { id: string; name: string; smiles: string }[], item: { name: string; smiles: string }): string {
  const entry = { id: `${UPLOAD_PREFIX}${++uploadCount}`, name: item.name, smiles: item.smiles };
  const at = list.findIndex((m) => m.id.startsWith(UPLOAD_PREFIX));
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  return entry.id;
}

export function moleculeById(id: string | null | undefined): Molecule {
  return MOLECULES.find((m) => m.id === id) ?? MOLECULES[0];
}

export function reactionById(id: string | null | undefined): Reaction {
  return REACTIONS.find((r) => r.id === id) ?? REACTIONS[0];
}

export function parseStructure(smiles: string): Structure {
  if (!smilesApi) return { atoms: [], bonds: [] };
  const drawer = new smilesApi.SvgDrawer({});
  const pre = drawer.preprocessor as unknown as Pre;
  pre.initDraw(smilesApi.Parser.parse(smiles), "light", true);
  pre.processGraph();
  const atoms = pre.graph.vertices.map((v) => ({ element: v.value.element, x: v.position.x, y: v.position.y }));
  const cx = atoms.reduce((s, a) => s + a.x, 0) / (atoms.length || 1);
  const cy = atoms.reduce((s, a) => s + a.y, 0) / (atoms.length || 1);
  return {
    atoms: atoms.map((a) => ({ ...a, x: a.x - cx, y: a.y - cy })),
    bonds: pre.graph.edges.map((e) => ({ a: e.sourceId, b: e.targetId, order: ORDER[e.bondType] ?? 1 })),
  };
}

export function splitReaction(smiles: string): { reactants: string[]; products: string[] } {
  const [left, right] = smiles.split(">>");
  return { reactants: left.split("."), products: right.split(".") };
}

export function formula(s: Structure): string {
  const n = new Map<string, number>();
  for (const a of s.atoms) n.set(a.element, (n.get(a.element) ?? 0) + 1);
  return Array.from(n.entries())
    .sort(([a], [b]) => (a === "C" ? -1 : b === "C" ? 1 : a.localeCompare(b)))
    .map(([e, c]) => (c > 1 ? `${e}${c}` : e))
    .join("");
}

export function atomSize(element: string): number {
  return 0.06 + 0.045 * Math.cbrt(BY_SYMBOL.get(element)?.mass ?? 12);
}

export function atomColor(element: string): string {
  return BY_SYMBOL.get(element)?.color ?? ATOM_COLOR;
}

export function mentionsTerm(h: Hit, term: string): boolean {
  if (!term) return false;
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(`${h.title} ${h.text}`);
}

function place(prefix: string, s: Structure, origin: Vec3, nodes: SceneNode[], guides: Guide[]) {
  const at = (i: number): Vec3 => [origin[0] + (s.atoms[i].x / BOND_LENGTH) * SCALE, origin[1] - (s.atoms[i].y / BOND_LENGTH) * SCALE, origin[2]];
  s.atoms.forEach((a, i) => {
    nodes.push({ id: `${prefix}:${i}`, position: at(i), color: atomColor(a.element), size: atomSize(a.element), label: a.element });
  });
  for (const b of s.bonds) {
    const p = at(b.a);
    const q = at(b.b);
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const nx = (-(q[1] - p[1]) / len) * 0.035;
    const ny = ((q[0] - p[0]) / len) * 0.035;
    const offsets = b.order === 1 ? [0] : b.order === 2 ? [-1, 1] : [-2, 0, 2];
    for (const o of offsets) {
      guides.push({ kind: "line", points: [[p[0] + nx * o, p[1] + ny * o, p[2]], [q[0] + nx * o, q[1] + ny * o, q[2]]], color: BOND_COLOR });
    }
  }
}

export function moleculeLayout(hits: Hit[], id: string | null | undefined): SceneLayout {
  const mol = moleculeById(id);
  const s = parseStructure(mol.smiles);
  const nodes: SceneNode[] = [];
  const guides: Guide[] = [];
  const links: SceneLink[] = [];
  place("atom", s, [0, 0, 0], nodes, guides);
  const hubId = `molecule:${mol.id}`;
  nodes.push({ id: hubId, position: [0, 1.3, 0], color: HUB_COLOR, size: 0.09, label: `${mol.name} · ${formula(s)} · ${mol.smiles}` });
  const tagged = hits.filter((h) => mentionsTerm(h, mol.name) || mentionsTerm(h, formula(s)));
  tagged.forEach((h, i) => {
    nodes.push({ id: h.id, position: [(i - (tagged.length - 1) / 2) * 0.5, 1.7, 0], color: hitColor(h), size: 0.06, label: h.title });
    links.push({ from: hubId, to: h.id, color: HUB_COLOR });
  });
  return {
    nodes,
    links,
    guides,
    legend: [
      { label: "carbon", color: atomColor("C") },
      { label: "oxygen", color: atomColor("O") },
      { label: "nitrogen", color: atomColor("N") },
      { label: "hit that names the molecule", color: "#8E3E3E" },
    ],
    camera: [0, 0, 3.6],
    wheel: "zoom",
  };
}

export function reactionProgress(scroll: number): number {
  return Math.min(1, Math.max(0, scroll / 1200));
}

export function reactionLayout(hits: Hit[], id: string | null | undefined, scroll: number): SceneLayout {
  const rxn = reactionById(id);
  const { reactants, products } = splitReaction(rxn.smiles);
  const t = reactionProgress(scroll);
  const showProducts = t >= 0.5;
  const group = showProducts ? products : reactants;
  const structures = group.map(parseStructure);
  const spread = 2.4;
  const slot = (i: number) => (i - (structures.length - 1) / 2) * spread;
  const phase = showProducts ? (t - 0.5) * 2 : 1 - t * 2;
  const nodes: SceneNode[] = [];
  const guides: Guide[] = [];
  structures.forEach((s, i) => place(`${showProducts ? "product" : "reactant"}:${i}`, s, [slot(i) * phase, 0, 0], nodes, guides));
  guides.push({ kind: "text", position: [0, -1.8, 0], text: `${rxn.name}: ${showProducts ? "products" : "reactants"}`, color: "#B8AE94", size: 12 });
  const hubId = `reaction:${rxn.id}`;
  nodes.push({ id: hubId, position: [0, 2.2, 0], color: HUB_COLOR, size: 0.09, label: `${rxn.name} · ${rxn.smiles}` });
  const terms = [...reactants, ...products].map((smi) => formula(parseStructure(smi)));
  const chemistry = hits.filter((h) => h.branch.includes("chemistry") || mentionsTerm(h, rxn.name) || terms.some((f) => mentionsTerm(h, f)));
  const links: SceneLink[] = [];
  chemistry.slice(0, 8).forEach((h, i, arr) => {
    nodes.push({ id: h.id, position: [(i - (arr.length - 1) / 2) * 0.5, 2.7, 0], color: hitColor(h), size: 0.06, label: h.title });
    links.push({ from: hubId, to: h.id, color: HUB_COLOR });
  });
  return {
    nodes,
    links,
    guides,
    legend: [
      { label: `progress ${Math.round(t * 100)}%: wheel to run the reaction`, color: HUB_COLOR },
      { label: "canon chemistry excerpt", color: "#8E3E3E" },
    ],
    camera: [0, 0, 7],
    wheel: "scroll",
  };
}

export const moleculeMode: ExploreMode = {
  id: "molecule",
  label: "Molecule",
  layout: (hits, ctx) => moleculeLayout([...(ctx.extraHits ?? []), ...hits], ctx.molecule),
};

export const reactionMode: ExploreMode = {
  id: "reaction",
  label: "Reaction",
  layout: (hits, ctx) => reactionLayout([...(ctx.extraHits ?? []), ...hits], ctx.reaction, ctx.scroll),
};
