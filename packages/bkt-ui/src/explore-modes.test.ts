import { describe, expect, test } from "bun:test";
import { MODES as originals } from "../../../src/lib/explore/modes";
import { DNA_SLOTS } from "../../../src/lib/explore/modes/dna";
import { axisOrder, helixPoint, helixFrame } from "../../../src/lib/explore/modes/helix";
import { bridgeLinks } from "../../../src/lib/explore/modes/graph";
import { hitKind } from "../../../src/lib/explore/saved";
import { coverage, HIT_TYPES, tokens, unify, type Hit } from "../../../src/lib/explore/search";
import { SAMPLE_HITS } from "../../../scripts/lib/explore-hits";
import { assembleRowSet } from "../../bkt/src/pack/row-sets/contract";
import { fixtureContext, fixtureDraft } from "../../bkt/src/pack/row-sets/test-fixtures";
import { expandRows } from "./explore/rows";
import { FORCE_NODE_CAP, MODES, modeById, dnaRibbon, NO_ROWS, ROW_MODE_IDS, type DesktopLayout } from "./explore/modesV2";

describe("desktop helix direction", () => {
  const context = { selected: null, scroll: 0 };
  const original = originals.find((mode) => mode.id === "helix")!;

  test("years increase from left to right and labels share their axis", () => {
    const layout = modeById("helix").layout(SAMPLE_HITS, context);
    const order = axisOrder(SAMPLE_HITS);
    expect(layout.nodes.map((node) => node.id)).toEqual(order.map((hit) => hit.id));
    for (let index = 1; index < layout.nodes.length; index++) {
      expect(layout.nodes[index].position[0]).toBeGreaterThan(layout.nodes[index - 1].position[0]);
    }
    for (const guide of layout.guides) {
      if (guide.kind !== "text") continue;
      const node = layout.nodes.find((node) => node.label?.endsWith(` · ${guide.text}`));
      expect(node).toBeDefined();
      expect(guide.position[0]).toBe(node!.position[0]);
      expect(guide.position[1]).toBeLessThan(0);
    }
  });

  test("rotation preserves connections, distances and the source layout", () => {
    const source = original.layout(SAMPLE_HITS, context);
    const before = JSON.stringify(source);
    const rotated = modeById("helix").layout(SAMPLE_HITS, context);
    expect(rotated.links).toEqual(source.links);
    expect(rotated.camera).toEqual(source.camera);
    for (let index = 0; index < source.nodes.length; index++) {
      const [x, y, z] = source.nodes[index].position;
      expect(rotated.nodes[index].position).toEqual([y, -x, z]);
      expect(Math.hypot(...rotated.nodes[index].position)).toBeCloseTo(Math.hypot(x, y, z), 12);
    }
    expect(JSON.stringify(original.layout(SAMPLE_HITS, context))).toBe(before);
  });

  test("scroll moves along the horizontal axis and keeps zoom disabled", () => {
    const start = modeById("helix").layout(SAMPLE_HITS, context);
    const scrolled = modeById("helix").layout(SAMPLE_HITS, { ...context, scroll: 500 });
    expect(scrolled.wheel).toBe("scroll");
    expect(scrolled.camera).toEqual(start.camera);
    for (let index = 0; index < start.nodes.length; index++) {
      expect(scrolled.nodes[index].position[0] - start.nodes[index].position[0]).toBeCloseTo(-2, 12);
    }
  });

  test("all other modes keep their existing geometry", () => {
    for (const mode of originals.filter((mode) => !["helix", "dna", "particle", "molecule", "reaction", "globe", "earth", "map", "graph", "timeline"].includes(mode.id))) {
      expect(JSON.stringify(modeById(mode.id).layout(SAMPLE_HITS, context))).toBe(JSON.stringify(mode.layout(SAMPLE_HITS, context)));
    }
    expect(modeById("missing")).toBe(MODES[0]);
  });
});


test("DNA surface joins both strands and keeps markers on the horizontal axis", () => {
  for (const scroll of [0, 250]) {
    const ribbon = dnaRibbon(scroll);
    const row = ribbon.across + 1;
    expect(ribbon.index.length).toBe(ribbon.steps * ribbon.across * 6);
    expect(ribbon.index.every((index) => index >= 0 && index < ribbon.positions.length)).toBe(true);
    expect(ribbon.positions.every((point) => point.every(Number.isFinite))).toBe(true);
    for (const step of [0, 60, ribbon.steps]) {
      const slot = step / ribbon.steps * (DNA_SLOTS - 1);
      const [x, y, z] = helixPoint(slot, DNA_SLOTS, 0, helixFrame(scroll));
      expect(ribbon.positions[step * row + ribbon.across]).toEqual([y, -x, z]);
      const opposite = ribbon.positions[step * row];
      expect(opposite[0]).toBeCloseTo(y, 12);
      expect(opposite[1]).toBeCloseTo(x, 12);
      expect(opposite[2]).toBeCloseTo(-z, 12);
      const center = ribbon.positions[step * row + ribbon.across / 2];
      expect(center[0]).toBe(y);
      expect(Math.hypot(center[1], center[2])).toBe(0);
    }
    const context = { selected: null, scroll };
    const original = originals.find((mode) => mode.id === "dna")!.layout(SAMPLE_HITS, context);
    const horizontal = modeById("dna").layout(SAMPLE_HITS, context) as DesktopLayout;
    expect(horizontal.helicoid).toEqual(ribbon);
    expect(horizontal.links).toEqual(original.links);
    original.nodes.forEach((node, index) => {
      const [x, y, z] = node.position;
      expect(horizontal.nodes[index]).toEqual({ ...node, position: [y, -x, z] });
    });
  }
});


test("Canon globe styling preserves each Explore projection and source links", () => {
  for (const id of ["globe", "earth"]) {
    const context = { selected: null, scroll: 0 };
    const original = originals.find((mode) => mode.id === id)!.layout(SAMPLE_HITS, context);
    const desktop = modeById(id).layout(SAMPLE_HITS, context) as DesktopLayout;
    expect(desktop.canonEarth).toBe(true);
    expect(desktop.nodes).toEqual(original.nodes);
    expect(desktop.links).toEqual(original.links);
    expect(desktop.guides).toEqual([]);
    expect(desktop.camera).toEqual(original.camera);
  }
});


test("Desktop markers stay selectable with native search scores", () => {
  for (const id of ["globe", "earth", "helix", "graph", "timeline"]) {
    for (const score of [-10, 0, 0.5, 1, 5387382, Number.NaN, Number.POSITIVE_INFINITY]) {
      const hits = SAMPLE_HITS.map((hit) => ({ ...hit, title: "France", score }));
      const context = { selected: null, scroll: 0 };
      const desktop = modeById(id).layout(hits, context);
      const original = originals.find((mode) => mode.id === id)!.layout(hits, context);
      expect(desktop.nodes.length).toBeGreaterThan(0);
      expect(desktop.links).toEqual(original.links);
      desktop.nodes.forEach((node, index) => {
        expect(node.position).toEqual(id === "helix" ? [original.nodes[index].position[1], -original.nodes[index].position[0], original.nodes[index].position[2]] : original.nodes[index].position);
        expect(node.id).toBe(original.nodes[index].id);
        expect(node.size).toBeGreaterThanOrEqual(0.018);
        expect(node.size).toBeLessThanOrEqual(0.07);
      });
    }
  }
});


test("Graph and Timeline preserve geometry for unit-range source scores", () => {
  for (const id of ["graph", "timeline"]) {
    const context = { selected: null, scroll: 0 };
    expect(modeById(id).layout(SAMPLE_HITS, context)).toEqual(originals.find((mode) => mode.id === id)!.layout(SAMPLE_HITS, context));
  }
});


test("Native score bounds preserve source ranking and bridge markers", () => {
  const hits = SAMPLE_HITS.map((hit, index) => ({ ...hit, year: null, score: (index + 1) * 50000 }));
  const context = { selected: null, scroll: 0 };
  for (const id of ["helix", "graph", "timeline"]) {
    const source = originals.find((mode) => mode.id === id)!.layout(hits, context);
    const desktop = modeById(id).layout(hits, context);
    expect(desktop.links).toEqual(source.links);
    expect(desktop.nodes.map((node) => node.id)).toEqual(source.nodes.map((node) => node.id));
    desktop.nodes.forEach((node, index) => {
      const [x, y, z] = source.nodes[index].position;
      expect(node.position).toEqual(id === "helix" ? [y, -x, z] : [x, y, z]);
      if (!hits.some((hit) => hit.id === node.id)) expect(node).toEqual(source.nodes[index]);
    });
  }
});

describe("row hits in the site modes", () => {
  const rows: Hit[] = ["cip-11", "soc-15", "soc-11"].map((key, i) => ({
    id: `row:major-to-career:${key}`, type: "row", title: key, subtitle: "", text: "", score: 1, branch: i === 0 ? "cip" : "soc", year: null, url: null,
    links: i === 0 ? ["row:major-to-career:soc-15", "row:major-to-career:soc-11"] : [], source: "cip2020", license: "US federal work, public domain",
  }));

  test("row hits gain no bridge link", () => {
    expect(bridgeLinks(rows)).toEqual({ bridges: [], links: [] });
  });

  test("the graph mode draws each row hit once with its own links and no frame", () => {
    const layout = originals.find((mode) => mode.id === "graph")!.layout(rows, { selected: null, scroll: 0 });
    expect(layout.nodes.map((node) => node.id).sort()).toEqual(rows.map((hit) => hit.id).sort());
    expect(layout.nodes.every((node) => node.position.every(Number.isFinite) && /^#[0-9a-f]{6}$/i.test(node.color))).toBe(true);
    expect(layout.links).toHaveLength(2);
  });

  test("every site mode and every window mode lays out row hits", () => {
    const ids = new Set(rows.map((hit) => hit.id));
    const context = { selected: rows[1].id, scroll: 0 };
    expect(originals).toHaveLength(12);
    expect(MODES).toHaveLength(12);
    for (const mode of [...originals, ...MODES]) {
      for (const hits of [rows, []]) {
        const layout = mode.layout(hits, context);
        expect(layout.nodes.every((node) => node.position.every(Number.isFinite) && Number.isFinite(node.size))).toBe(true);
        const drawn = layout.nodes.filter((node) => ids.has(node.id));
        expect(new Set(drawn.map((node) => node.id)).size).toBe(drawn.length);
        const nodes = new Set(layout.nodes.map((node) => node.id));
        expect(layout.links.every((link) => nodes.has(link.from) && nodes.has(link.to))).toBe(true);
      }
    }
    const drawing = (modes: typeof originals) => modes.filter((mode) => mode.layout(rows, context).nodes.filter((node) => ids.has(node.id)).length === rows.length).map((mode) => mode.id);
    expect(drawing(originals)).toEqual(["globe", "helix", "graph", "timeline"]);
    expect(drawing(MODES)).toEqual(["globe", "helix", "graph", "timeline", "map"]);
  });

  test("the keyword search filters row hits by their titles and keeps them out of the canon type filter", () => {
    const named = rows.map((hit, i) => ({ ...hit, title: ["Computer and Information Sciences", "Computer and Mathematical Occupations", "Management Occupations"][i] }));
    const match = (query: string) => named.filter((hit) => coverage(tokens(query), tokens(`${hit.title} ${hit.subtitle}`)) > 0).map((hit) => hit.id);
    expect(match("computer")).toEqual([named[0].id, named[1].id]);
    expect(match("management")).toEqual([named[2].id]);
    expect(match("zebra")).toEqual([]);
    expect(HIT_TYPES).not.toContain("row");
    const unified = unify({ query: "computer", excerpts: [], advisors: [], sources: named });
    expect(unified.every((hit) => hit.type !== "row")).toBe(true);
    const asked = unify({ query: "computer", excerpts: [], advisors: [], sources: named, types: ["row"] });
    expect(asked.filter((hit) => hit.type === "row").map((hit) => hit.id).sort()).toEqual(named.map((hit) => hit.id).sort());
  });

  test("a row hit has no saved kind", () => {
    expect(rows.map((hit) => hitKind(hit))).toEqual([null, null, null]);
  });
});

describe("row sets in the window modes", () => {
  const ctx = fixtureContext();
  const context = { selected: null, scroll: 0 };
  const draft = fixtureDraft({
    rows: [
      { key: "one", title: "First row", sub: "", group: "a", source: "open", verified: true, links: [{ to: "two", weight: 4, stated: true }, { to: "three", weight: 1, stated: false }] },
      { key: "two", title: "Second row", sub: "", group: "b", source: "by", verified: false, links: [{ to: "three", weight: 2, stated: true }] },
      { key: "three", title: "Third row", sub: "", group: "a", source: "open", verified: true, links: [] },
    ],
  });
  const { hits, frame } = expandRows(assembleRowSet([draft], ctx)[0]);
  const withFrame = { ...context, rows: frame };

  test("with no frame every window mode gives the layout it gave before", () => {
    for (const mode of MODES) {
      const site = SAMPLE_HITS;
      expect(JSON.stringify(mode.layout(site, context))).toBe(JSON.stringify(mode.layout(site, { ...context, rows: undefined })));
    }
    const graph = originals.find((mode) => mode.id === "graph")!.layout(SAMPLE_HITS, context);
    expect(modeById("graph").layout(SAMPLE_HITS, context).links).toEqual(graph.links);
  });

  test("graph and map draw every row once with finite positions, group colours and links between drawn rows", () => {
    expect([...ROW_MODE_IDS]).toEqual(["graph", "map"]);
    for (const id of ROW_MODE_IDS) {
      const layout = modeById(id).layout(hits, withFrame) as DesktopLayout;
      expect(layout.notice).toBeUndefined();
      expect(layout.nodes.map((node) => node.id).sort()).toEqual(hits.map((hit) => hit.id).sort());
      expect(layout.nodes.every((node) => node.position.every(Number.isFinite) && Number.isFinite(node.size))).toBe(true);
      const nodes = new Set(layout.nodes.map((node) => node.id));
      expect(layout.links).toHaveLength(3);
      expect(layout.links.every((link) => nodes.has(link.from) && nodes.has(link.to))).toBe(true);
      expect(layout.nodes.find((node) => node.id === "row:fixture-set:two")?.color).toBe("#8a5a2b");
      expect(layout.nodes.find((node) => node.id === "row:fixture-set:one")?.color).toBe("#2f6f8f");
      expect(layout.legend).toEqual([{ label: "Group A", color: "#2f6f8f" }, { label: "Group B", color: "#8a5a2b" }]);
    }
    const ring = modeById("map").layout(hits, withFrame);
    expect(ring.guides.filter((guide) => guide.kind === "text").map((guide) => guide.kind === "text" && guide.text).sort()).toEqual(["Group A", "Group B"]);
  });

  test("stated links are solid, inferred links are dashed, weight sets the width and an unchecked row is hollow", () => {
    const layout = modeById("graph").layout(hits, withFrame) as DesktopLayout;
    const style = (from: string, to: string) => layout.linkStyles?.[`row:fixture-set:${from}|row:fixture-set:${to}`];
    expect(style("one", "two")).toEqual({ width: 4, dashed: false });
    expect(style("one", "three")).toEqual({ width: 1.75, dashed: true });
    expect(style("two", "three")).toEqual({ width: 2.5, dashed: false });
    expect(style("two", "one")).toEqual(style("one", "two"));
    expect(layout.hollow).toEqual(["row:fixture-set:two"]);
    for (const link of layout.links) expect(layout.linkStyles?.[`${link.from}|${link.to}`]).toBeDefined();
    const plain = expandRows(assembleRowSet([fixtureDraft({ rows: draft.rows.map((row) => ({ ...row, verified: undefined, links: (row.links ?? []).map((link) => ({ to: link.to })) })) })], ctx)[0]);
    const unmarked = modeById("graph").layout(plain.hits, { ...context, rows: plain.frame }) as DesktopLayout;
    expect(Object.values(unmarked.linkStyles ?? {}).every((s) => s.width === 1 && !s.dashed)).toBe(true);
    expect(unmarked.hollow).toEqual([]);
  });

  test("a filtered page keeps each row beside its own frame values", () => {
    const kept = hits.filter((hit) => hit.id !== "row:fixture-set:one");
    const layout = modeById("graph").layout(kept, withFrame) as DesktopLayout;
    expect(layout.nodes.map((node) => node.id).sort()).toEqual(kept.map((hit) => hit.id).sort());
    expect(layout.links).toEqual([{ from: "row:fixture-set:two", to: "row:fixture-set:three", color: undefined }]);
    expect(layout.linkStyles?.["row:fixture-set:two|row:fixture-set:three"]).toEqual({ width: 2.5, dashed: false });
    expect(layout.hollow).toEqual(["row:fixture-set:two"]);
  });

  test("an empty set gives one text guide", () => {
    for (const id of ROW_MODE_IDS) {
      const layout = modeById(id).layout([], withFrame) as DesktopLayout;
      expect(layout.nodes).toEqual([]);
      expect(layout.guides).toHaveLength(1);
      expect(layout.guides[0]).toMatchObject({ kind: "text", text: NO_ROWS });
      expect(layout.notice).toBe(NO_ROWS);
    }
  });

  test("a mode that cannot draw rows says so in one sentence and draws nothing", () => {
    const cannot = MODES.filter((mode) => !ROW_MODE_IDS.includes(mode.id));
    expect(cannot.map((mode) => mode.id)).toEqual(["globe", "helix", "dna", "atom", "particle", "molecule", "reaction", "protein", "timeline", "earth"]);
    for (const mode of cannot) {
      const layout = mode.layout(hits, withFrame) as DesktopLayout;
      expect(layout.nodes).toEqual([]);
      expect(layout.notice).toBe(`${mode.label} cannot draw this data.`);
      expect(layout.guides).toHaveLength(1);
    }
  });

  test("graph asks for a narrower search above its cap, and the force layout time decides the cap", () => {
    const many = (n: number) => expandRows(assembleRowSet([fixtureDraft({ rows: Array.from({ length: n }, (_, i) => ({ key: `k${i}`, title: `Row ${i}`, sub: "", group: "a", source: "open", links: i ? [{ to: `k${Math.floor(i / 2)}` }] : [] })) })], ctx)[0]);
    const over = many(FORCE_NODE_CAP + 1);
    const refused = modeById("graph").layout(over.hits, { ...context, rows: over.frame }) as DesktopLayout;
    expect(refused.nodes).toEqual([]);
    expect(refused.notice).toBe("Graph draws up to 300 rows, and this page holds 301. Narrow the search.");
    const site = originals.find((mode) => mode.id === "graph")!;
    const time = (n: number) => {
      const page = many(n);
      const started = performance.now();
      site.layout(page.hits, context);
      return performance.now() - started;
    };
    const at600 = time(600);
    const at300 = time(300);
    console.log(`force layout: ${Math.round(at600)} ms at 600 nodes, ${Math.round(at300)} ms at 300 nodes, against 200 ms`);
    expect(at600 > 200 ? 300 : 600).toBe(FORCE_NODE_CAP);
    const full = many(FORCE_NODE_CAP);
    const layout = modeById("graph").layout(full.hits, { ...context, rows: full.frame });
    expect(layout.nodes).toHaveLength(FORCE_NODE_CAP);
    expect(layout.links).toHaveLength(FORCE_NODE_CAP - 1);
  }, 60_000);

  test("a second draw of the same page reuses the layout, and a new page draws again", () => {
    const first = modeById("graph").layout(hits, withFrame);
    expect(modeById("graph").layout(hits, { ...withFrame, selected: hits[0].id })).toBe(first);
    expect(modeById("graph").layout([...hits], withFrame)).not.toBe(first);
    const other = expandRows(assembleRowSet([draft], ctx)[0]);
    expect(modeById("graph").layout(hits, { ...context, rows: other.frame })).not.toBe(first);
  });
});
