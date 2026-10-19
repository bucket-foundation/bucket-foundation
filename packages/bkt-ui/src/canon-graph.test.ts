import { describe, expect, test } from "bun:test";
import { buildCanonGraph, components, degree, excerptsByAuthor, layoutCanonGraph, matchNodes, neighbours, recordId, shortestPath, type RawGraph } from "@/lib/canon-graph-core";

const RAW: RawGraph = {
  nodes: [
    { id: "A1", name: "Roger Penrose", group: "author" },
    { id: "A2", name: "Stuart Hameroff", group: "author" },
    { id: "A3", name: "Stephen Hawking", group: "author" },
    { id: "A4", name: "Ananda K. Coomáraswámy", group: "author" },
    { id: "A5", name: "Alone Author", group: "author" },
    { id: "A6", name: "Carlo Rovelli", group: "author" },
    { id: "A7", name: "Lee Smolin", group: "author" },
  ],
  edges: [
    { source: "A1", target: "A2", weight: 15 },
    { source: "A1", target: "A3", weight: 11 },
    { source: "A6", target: "A7", weight: 12 },
    { source: "A4", target: "A6", weight: 1 },
    { source: "A1", target: "A9", weight: 3 },
    { source: "A3", target: "A3", weight: 2 },
  ],
};
const CENT = { degree: { A1: 2, A2: 1, A3: 1 }, weighted: { A1: 0.9, A2: 0.4 } };

describe("canon graph module", () => {
  test("degree counts distinct neighbours from the edges, and ignores self and dangling links", () => {
    const g = buildCanonGraph(RAW, CENT);
    expect(degree(g, "openalex:A1")).toBe(2);
    expect(degree(g, "openalex:A6")).toBe(2);
    expect(degree(g, "openalex:A3")).toBe(1);
    expect(degree(g, "openalex:A5")).toBe(0);
    const doubled = { ...g, edges: [...g.edges, { source: "openalex:A2", target: "openalex:A1", weight: 1 }] };
    expect(degree(doubled, "openalex:A1")).toBe(2);
  });

  test("shortest path walks edges both ways and stops at the component edge", () => {
    const g = buildCanonGraph(RAW, CENT);
    expect(shortestPath(g, "openalex:A2", "openalex:A3")).toEqual(["openalex:A2", "openalex:A1", "openalex:A3"]);
    expect(shortestPath(g, "openalex:A7", "openalex:A4")).toEqual(["openalex:A7", "openalex:A6", "openalex:A4"]);
    expect(shortestPath(g, "openalex:A1", "openalex:A1")).toEqual(["openalex:A1"]);
    expect(shortestPath(g, "openalex:A1", "openalex:A7")).toBeNull();
    expect(shortestPath(g, "openalex:A1", "openalex:A9")).toBeNull();
    const ring = buildCanonGraph({ nodes: ["A11", "A12", "A13", "A14"].map((id) => ({ id, name: id, group: "author" })), edges: [{ source: "A11", target: "A12", weight: 1 }, { source: "A12", target: "A14", weight: 1 }, { source: "A11", target: "A13", weight: 1 }, { source: "A13", target: "A14", weight: 1 }] });
    expect(shortestPath(ring, "openalex:A11", "openalex:A14")).toEqual(["openalex:A11", "openalex:A12", "openalex:A14"]);
  });

  test("keeps linked authors under record ids and drops loose and dangling links", () => {
    const g = buildCanonGraph(RAW, CENT);
    expect(g.nodes.map((n) => n.id)).toEqual(["openalex:A1", "openalex:A2", "openalex:A3", "openalex:A4", "openalex:A6", "openalex:A7"]);
    expect(g.edges.length).toBe(4);
    expect(g.nodes[0]).toEqual({ id: "openalex:A1", name: "Roger Penrose", group: "author", centrality: 0.9, edges: 2, excerpts: [] });
    expect(buildCanonGraph(RAW, CENT, { A1: [4] }).nodes[0].excerpts).toEqual([4]);
    expect(g.nodes[2].centrality).toBe(0);
    expect(recordId("A123")).toBe("openalex:A123");
    expect(recordId("openalex:A123")).toBe("openalex:A123");
    expect(buildCanonGraph({ nodes: [], edges: [] })).toEqual({ nodes: [], edges: [] });
  });

  test("neighbours come heaviest first, and components largest first", () => {
    const g = buildCanonGraph(RAW, CENT);
    expect(neighbours(g, "openalex:A1")).toEqual([
      { id: "openalex:A2", weight: 15 },
      { id: "openalex:A3", weight: 11 },
    ]);
    expect(neighbours(g, "openalex:A5")).toEqual([]);
    expect(components(g)).toEqual([
      ["openalex:A1", "openalex:A2", "openalex:A3"],
      ["openalex:A4", "openalex:A6", "openalex:A7"],
    ]);
  });

  test("excerpts tie to an author id by full name or first and last name, in text or byline", () => {
    const map = excerptsByAuthor(RAW.nodes, [
      { rowid: 3, text: "Roger Penrose on twistors.", authors: [] },
      { rowid: 1, text: "Consciousness and microtubules.", authors: ["Stuart Hameroff (and others)"] },
      { rowid: 2, text: "Ananda Coomaraswamy on art.", authors: [null] },
      { rowid: 5, text: "Penrose tiles.", authors: [] },
    ]);
    expect(map).toEqual({ A1: [3], A2: [1], A4: [2] });
  });

  test("search matches names with or without accents and ignores short words", () => {
    const g = buildCanonGraph(RAW, CENT);
    expect(matchNodes(g, "coomaraswamy")).toEqual(["openalex:A4"]);
    expect(matchNodes(g, "Penrose and Hawking")).toEqual(["openalex:A1", "openalex:A3"]);
    expect(matchNodes(g, "of a")).toEqual([]);
  });

  test("layout is the same on every run and keeps groups apart", () => {
    const g = buildCanonGraph(RAW, CENT);
    const a = layoutCanonGraph(g);
    expect(layoutCanonGraph(g)).toEqual(a);
    expect(a.size).toBe(6);
    for (const p of a.values()) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    const left = Math.max(...["openalex:A1", "openalex:A2", "openalex:A3"].map((id) => a.get(id)!.x));
    const right = Math.min(...["openalex:A4", "openalex:A6", "openalex:A7"].map((id) => a.get(id)!.x));
    expect(right - left).toBeGreaterThanOrEqual(120);
    const ps = Array.from(a.values());
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) expect(Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y)).toBeGreaterThan(10);
  });
});
