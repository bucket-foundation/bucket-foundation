import { expect, test } from "bun:test";
import { SAMPLE_HITS } from "../../../scripts/lib/explore-hits";
import { MODES as originals } from "../../../src/lib/explore/modes";
import { modeById } from "./explore/modesV2";
import { hasMapAxes, sourceMap } from "./explore/source-map";
import type { MapModel } from "../../../src/lib/explore/map";

test("source maps retain stable identities and recorded in-view links", () => {
  const hits = SAMPLE_HITS.slice(0, 4).map((hit, i) => ({ ...hit, branch: i % 2 ? "" : "Mathematics", links: [SAMPLE_HITS[(i + 1) % 4].id, "missing", hit.id] }));
  const layout = sourceMap([...hits, hits[0]]);
  expect(layout).toEqual(sourceMap([...hits].reverse()));
  expect(layout.nodes.map((node) => node.id).sort()).toEqual(hits.map((hit) => hit.id).sort());
  expect(layout.links).toHaveLength(4);
  expect(layout.links.every((link) => hits.some((hit) => hit.id === link.from && hit.links.includes(link.to)))).toBe(true);
  expect(layout.nodes.every((node) => node.position.every(Number.isFinite))).toBe(true);
  expect(layout.legend.map((item) => item.label)).toEqual(["Mathematics", "Unassigned"]);
  expect(sourceMap([]).nodes).toEqual([]);
  expect(sourceMap([]).links).toEqual([]);
});

test("desktop map uses source groups when axes are absent or incomplete", () => {
  for (const map of [null, undefined, {}, { axes: [] }, { axes: [{}], advisors: [] }, { axes: [{ label: "x", angle: NaN, terms: [] }], advisors: [] }]) {
    expect(hasMapAxes(map as MapModel)).toBe(false);
    expect(modeById("map").layout(SAMPLE_HITS, { selected: null, scroll: 0, map: map as MapModel })).toEqual(sourceMap(SAMPLE_HITS));
  }
  const map: MapModel = { axes: [{ label: "Math", angle: 0, terms: ["math"] }], advisors: [{ id: "advisor:a", name: "A", field: "Math", score: 1, star: [1] }] };
  const context = { selected: null, scroll: 0, map, youText: "math" };
  expect(hasMapAxes(map)).toBe(true);
  expect(modeById("map").layout(SAMPLE_HITS, context)).toEqual(originals.find((mode) => mode.id === "map")!.layout(SAMPLE_HITS, context));
});
