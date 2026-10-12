import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { assembleRowSet, type RowDraft, type RowSetDraft } from "../../bkt/src/pack/row-sets/contract";
import { fixtureContext, fixtureDraft } from "../../bkt/src/pack/row-sets/test-fixtures";
import { forceLayout } from "../../../src/lib/explore/modes/graph";
import { FORCE_NODE_CAP, modeById, type DesktopLayout } from "./explore/modesV2";
import { expandRows } from "./explore/rows";
import { axisLabel, axisShare, axisTicks, fastForceLayout, labelClears, LANE_LABEL_RISE, RING_RADIUS, rowGraph, rowTimeline, STACK_GAP, STACK_ROWS, TIMELINE_WIDTH, UNDATED } from "./explore/rows-layout";

const ctx = fixtureContext();
const open = (draft: Partial<RowSetDraft>) => expandRows(assembleRowSet([fixtureDraft(draft)], ctx)[0]);
const tree = (n: number): RowDraft[] => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, title: `Row ${i}`, sub: "", group: "a", source: "open", links: i ? [{ to: `k${Math.floor(i / 2)}` }] : [] }));
const YEARS = { from: 1880, to: 2020, scale: "linear" as const, unit: "year" as const };

describe("the graph layout for row sets", () => {
  test("gives the positions of the site force layout", () => {
    const ids = Array.from({ length: 40 }, (_, i) => `row:x:k${i}`);
    const edges = ids.slice(1).map((id, i): [string, string] => [id, ids[Math.floor(i / 2)]]);
    const site = forceLayout(ids, edges);
    const fast = fastForceLayout(ids, edges);
    for (const id of ids) for (let k = 0; k < 3; k++) expect(Math.abs(site.get(id)![k] - fast.get(id)![k])).toBeLessThan(1e-9);
    expect(fastForceLayout([], []).size).toBe(0);
    expect(fastForceLayout(["a"], [["a", "a"]]).get("a")!.every(Number.isFinite)).toBe(true);
    expect(fastForceLayout(["a", "b"], [["a", "gone"]]).size).toBe(2);
  });

  test("lays out the node cap inside 200 ms in a clean process, and the time at 300 and 600 nodes is recorded", () => {
    const run = Bun.spawnSync([process.execPath, "run", resolve(import.meta.dir, "../scripts/time-row-graph.ts"), "300", "600"], { stdout: "pipe", stderr: "pipe" });
    expect(run.exitCode).toBe(0);
    const took = JSON.parse(run.stdout.toString()) as Record<string, number>;
    console.log(`row graph layout: ${took["300"]} ms at 300 nodes, ${took["600"]} ms at 600 nodes, against 200 ms`);
    expect(FORCE_NODE_CAP).toBe(300);
    expect(took["300"]).toBeLessThan(200);
  }, 60_000);

  test("draws each row once with its links and no node of another kind", () => {
    const page = open({ rows: tree(50) });
    const layout = rowGraph(page.hits);
    expect(layout.nodes.map((n) => n.id)).toEqual(page.hits.map((h) => h.id));
    expect(layout.links).toHaveLength(49);
    expect(layout.nodes.every((n) => n.position.every(Number.isFinite))).toBe(true);
  });
});

describe("the row timeline", () => {
  const rows: RowDraft[] = [
    { key: "a-early", title: "Early", sub: "", group: "a", source: "open", from: 1880, to: 1950, weight: 100 },
    { key: "a-late", title: "Late", sub: "", group: "a", source: "open", from: 1990, to: 2020, weight: 25 },
    { key: "a-over", title: "Overlap", sub: "", group: "a", source: "open", from: 1900, to: 1960 },
    { key: "b-point", title: "Point", sub: "", group: "b", source: "by", from: 1950 },
    { key: "b-year", title: "Year alone", sub: "", group: "b", source: "by", year: 2020 },
    { key: "b-none", title: "Undated", sub: "", group: "b", source: "by" },
  ];
  const page = open({ modes: ["timeline"], axis: YEARS, rows });
  const layout = rowTimeline(page.hits, page.frame);
  const at = (key: string) => layout.nodes.find((n) => n.id === `row:fixture-set:${key}`)!;

  test("x follows the axis, each group has a lane and overlapping spans stack", () => {
    expect(layout.nodes).toHaveLength(6);
    expect(at("a-early").position[0]).toBeCloseTo(-TIMELINE_WIDTH / 2, 6);
    expect(at("b-year").position[0]).toBeCloseTo(TIMELINE_WIDTH / 2, 6);
    expect(at("b-point").position[0]).toBeCloseTo(0, 6);
    expect(at("a-early").position[1]).toBe(at("a-late").position[1]);
    expect(at("a-over").position[1]).toBeCloseTo(at("a-early").position[1] - STACK_GAP, 6);
    expect(at("b-point").position[1]).toBeLessThan(at("a-over").position[1]);
    expect(at("b-point").position[1]).toBe(at("b-year").position[1]);
    expect(at("a-early").size).toBeGreaterThan(at("a-late").size);
    expect(layout.nodes.every((n) => n.position.every(Number.isFinite) && Number.isFinite(n.size))).toBe(true);
  });

  test("a span draws a line from its start to its end, and a point draws none", () => {
    const spans = layout.guides.filter((g) => g.kind === "line" && g.color !== "#6B6252");
    expect(spans).toHaveLength(3);
    const early = spans.find((g) => g.kind === "line" && g.points[0][1] === at("a-early").position[1] && g.points[0][0] === at("a-early").position[0]);
    expect(early?.kind === "line" && early.points[1][0]).toBeCloseTo(-TIMELINE_WIDTH / 2 + (70 / 140) * TIMELINE_WIDTH, 6);
  });

  test("the lanes are labelled, the axis carries year ticks and an undated row sits under its own label", () => {
    const texts = layout.guides.flatMap((g) => (g.kind === "text" ? [g.text] : []));
    expect(texts).toEqual(expect.arrayContaining(["Group A", "Group B", "1900", "2000", UNDATED]));
    for (const lane of layout.guides) {
      if (lane.kind !== "text" || !lane.text.startsWith("Group")) continue;
      const below = layout.nodes.filter((n) => n.position[1] < lane.position[1]).map((n) => lane.position[1] - n.position[1]);
      expect(Math.min(...below)).toBeGreaterThanOrEqual(LANE_LABEL_RISE - 1e-9);
      expect(layout.nodes.every((n) => Math.abs(n.position[1] - lane.position[1]) >= LANE_LABEL_RISE - 1e-9)).toBe(true);
      expect(lane.position[0]).toBeGreaterThan(-TIMELINE_WIDTH / 2);
    }
    expect(at("b-none").position[0]).toBeLessThan(-TIMELINE_WIDTH / 2);
    expect(layout.axisLength).toBeGreaterThanOrEqual(TIMELINE_WIDTH + 2);
    const dated = open({ modes: ["timeline"], axis: YEARS, rows: rows.slice(0, 4) });
    expect(rowTimeline(dated.hits, dated.frame).guides.some((g) => g.kind === "text" && g.text === UNDATED)).toBe(false);
  });

  test("a dense lane wraps after its stack rows and stays bounded", () => {
    const dense = open({ modes: ["timeline"], axis: YEARS, rows: Array.from({ length: 570 }, (_, i): RowDraft => ({ key: `d${i}`, title: `Dense ${i}`, sub: "", group: "a", source: "open", from: 2000, to: 2018 })) });
    const drawn = rowTimeline(dense.hits, dense.frame);
    const ys = new Set(drawn.nodes.map((n) => n.position[1].toFixed(6)));
    expect(drawn.nodes).toHaveLength(570);
    expect(ys.size).toBe(STACK_ROWS);
    expect(Math.max(...drawn.nodes.map((n) => Math.abs(n.position[1])))).toBeLessThan(4);
  });

  test("a log axis spreads recent years and keeps deep time on the page", () => {
    const deep = { from: -3300000, to: 2025, scale: "log" as const, unit: "year" as const };
    expect(axisShare(deep, -3300000)).toBeCloseTo(0, 9);
    expect(axisShare(deep, 2025)).toBeCloseTo(1, 9);
    expect(axisShare(deep, 1760)).toBeGreaterThan(0.55);
    expect(axisShare(deep, 1760)).toBeLessThan(axisShare(deep, 1945));
    expect(axisShare(deep, 1945)).toBeLessThan(axisShare(deep, 2012));
    expect(axisShare(deep, 9999)).toBe(1);
    expect(axisShare({ ...deep, from: 5, to: 5 }, 5)).toBe(0.5);
    expect(axisTicks(deep)).toEqual([-3300000, -997975, -97975, -7975, 1025, 1925, 2015, 2025]);
    expect(axisLabel(deep, -7975)).toBe("7,975 BCE");
    expect(axisLabel(deep, 1925)).toBe("1925");
    expect(axisLabel({ from: 0, to: 90, scale: "linear", unit: "age" }, 18)).toBe("age 18");
    expect(axisTicks(YEARS)).toEqual([1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020]);
  });

  test("the timeline mode draws a row set through the window mode with group colours, legend and hollow marks", () => {
    const marked = open({ modes: ["timeline"], axis: YEARS, rows: rows.map((r, i) => ({ ...r, verified: i % 2 === 0 })) });
    const drawn = modeById("timeline").layout(marked.hits, { selected: null, scroll: 0, rows: marked.frame }) as DesktopLayout;
    expect(drawn.notice).toBeUndefined();
    expect(drawn.nodes).toHaveLength(6);
    expect(drawn.nodes.find((n) => n.id === "row:fixture-set:b-point")?.color).toBe("#8a5a2b");
    expect(drawn.legend).toEqual([{ label: "Group A", color: "#2f6f8f" }, { label: "Group B", color: "#8a5a2b" }]);
    expect(drawn.hollow).toHaveLength(3);
    expect(drawn.axisLength).toBeGreaterThan(TIMELINE_WIDTH);
  });
});

describe("ring labels in the map view", () => {
  test("no group label covers a dot, for short and long labels on every side", () => {
    const groups = ["SOC 2018 major groups", "O*NET-SOC major groups", "Census lists, list years only", "A", "A much longer group label than any set carries today"].map((label, i) => ({ id: `g${i}`, label, color: "#2f6f8f" }));
    const rows = groups.flatMap((g, gi) => Array.from({ length: 23 }, (_, i): RowDraft => ({ key: `${g.id}-${i}`, title: `Row ${gi} ${i}`, sub: "", group: g.id, source: "open" })));
    for (const count of [1, 2, 3, 5]) {
      const page = open({ modes: ["map"], groups, rows: rows.filter((r) => Number(r.group.slice(1)) < count) });
      const drawn = modeById("map").layout(page.hits, { selected: null, scroll: 0, rows: page.frame });
      const labels = drawn.guides.filter((g) => g.kind === "text");
      expect(labels).toHaveLength(count);
      for (const label of labels) {
        if (label.kind !== "text") continue;
        expect(labelClears(label, drawn.nodes, drawn.camera[2])).toBe(true);
        expect(Math.hypot(label.position[0], label.position[1])).toBeGreaterThan(RING_RADIUS);
      }
      expect(drawn.camera[2]).toBeGreaterThanOrEqual(5.8);
      if (count <= 3) expect(drawn.camera[2]).toBe(5.8);
    }
  });

  test("the check itself fails on a label that sits on a dot", () => {
    expect(labelClears({ kind: "text", text: "On the dot", position: [1, 0, 0], color: "#000000" }, [{ id: "n", position: [1.1, 0.02, 0], color: "#000000", size: 0.03 }])).toBe(false);
  });
});
