import { beforeAll, describe, expect, test } from "bun:test";
import SmilesDrawer from "smiles-drawer";
import { setSmilesApi, REACTIONS, splitReaction } from "../../../src/lib/explore/modes/chem";
import { loadCircleChem, parseCircleStructure, chemicalCircle } from "./explore/chem-circle";
import { modeById, type DesktopLayout } from "./explore/modesV2";
import { SAMPLE_HITS } from "../../../scripts/lib/explore-hits";

beforeAll(async () => { setSmilesApi(SmilesDrawer); await loadCircleChem(); });
const counts = (smiles: string[]) => {
  const result: Record<string, number> = {};
  for (const item of smiles) for (const atom of parseCircleStructure(item).atoms) result[atom.symbol] = (result[atom.symbol] ?? 0) + 1;
  return result;
};

describe("chemical circles", () => {
  test("hydrogens include bracket counts and preserve explicit vertices", () => {
    expect(counts(["CCO"])).toEqual({ C: 2, H: 6, O: 1 });
    expect(counts(["[H]O[H]"])).toEqual({ H: 2, O: 1 });
    expect(counts(["[NH4+]"])).toEqual({ N: 1, H: 4 });
    expect(counts(["N[C@@H](C)C(=O)O"])).toEqual({ N: 1, C: 3, H: 7, O: 2 });
    expect(parseCircleStructure("[NH4+]").atoms[0].label).toBe("N+");
    expect(parseCircleStructure("[13CH4]").atoms[0].label).toBe("13C");
  });

  test("aromatic bonds and disconnected salts retain their connectivity", () => {
    expect(counts(["c1ccccc1"])).toEqual({ C: 6, H: 6 });
    expect(counts(["n1ccccc1"])).toEqual({ N: 1, C: 5, H: 5 });
    expect(parseCircleStructure("c1ccccc1").bonds.filter((bond) => bond.aromatic)).toHaveLength(6);
    const salt = parseCircleStructure("[Na+].[Cl-]");
    expect(salt.bonds).toEqual([]);
    expect(salt.atoms.map((atom) => atom.label)).toEqual(["Na+", "Cl−"]);
    expect(parseCircleStructure("O=C=O").bonds.map((bond) => bond.order)).toEqual([2, 2]);
    expect(parseCircleStructure("N#N").bonds[0].order).toBe(3);
  });

  test("stock reactions conserve the element multiset", () => {
    for (const reaction of REACTIONS) {
      const sides = splitReaction(reaction.smiles);
      expect(counts(sides.reactants)).toEqual(counts(sides.products));
    }
  });

  test("atom nodes share a circle and remain selectable in both reaction phases", () => {
    const molecule = chemicalCircle("ethanol", [{ smiles: "CCO", prefix: "atom" }]);
    expect(molecule.nodes).toHaveLength(9);
    expect(molecule.nodes.every((node) => Math.abs(Math.hypot(...node.position) - 180) < 1e-9)).toBe(true);
    for (const scroll of [0, 1200]) {
      const layout = modeById("reaction").layout(SAMPLE_HITS, { selected: null, scroll }) as DesktopLayout;
      expect(layout.circle?.phase).toBe(scroll ? "products" : "reactants");
      for (const node of layout.circle!.nodes) expect(layout.nodes.find((entry) => entry.id === node.id)?.label).toBe(node.detail);
    }
    const particles = modeById("particle").layout(SAMPLE_HITS, { selected: null, scroll: 0 }) as DesktopLayout;
    expect(particles.circle?.nodes).toHaveLength(17);
    expect(particles.circle?.bonds).toEqual([]);
  });

  test("invalid and oversized structures fail within the circle view", () => {
    expect(() => parseCircleStructure("invalid?")).toThrow();
    expect(() => parseCircleStructure("C".repeat(5001))).toThrow("5000");
    expect(() => parseCircleStructure("C".repeat(400))).toThrow("1000 atoms");
  });
});
