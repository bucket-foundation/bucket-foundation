import { describe, expect, test } from "bun:test";
import { normalizeState, type EngineState } from "@academy/engine";
import type { LearnData, PlacedAtom } from "./views/learn-data";
import { boxOf, layoutTopics, topicStates, wrapTitle, type LayoutSize } from "./views/path-graph";

const SMALL: LayoutSize = { nodeW: 40, nodeH: 16, gapX: 8, gapY: 2 };

function synthetic(n: number): Map<string, string[]> {
  const g = new Map<string, string[]>();
  const rand = (i: number, j: number) => ((Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1 + 1) % 1;
  for (let i = 0; i < n; i++) {
    const needs: string[] = [];
    for (let j = 0; j < 3; j++) {
      const back = Math.floor(rand(i, j) * 40) + 1;
      if (i - back >= 0 && rand(j, i) < 0.6) needs.push(`t${i - back}`);
    }
    g.set(`t${i}`, needs);
  }
  return g;
}

function overlaps(layout: ReturnType<typeof layoutTopics>): number {
  const all = Array.from(layout.nodes.values());
  let hits = 0;
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (a.x < b.x + layout.size.nodeW && b.x < a.x + layout.size.nodeW && a.y < b.y + layout.size.nodeH && b.y < a.y + layout.size.nodeH) hits++;
    }
  return hits;
}

describe("topic layout", () => {
  test("480 topics at a small size never overlap", () => {
    const layout = layoutTopics(synthetic(480), SMALL);
    expect(layout.nodes.size).toBe(480);
    expect(layout.cyclic).toBe(false);
    expect(overlaps(layout)).toBe(0);
    expect(overlaps(layoutTopics(synthetic(480)))).toBe(0);
  });

  test("the same links give the same positions whatever order they arrive in", () => {
    const g = synthetic(200);
    const shuffled = new Map(Array.from(g.entries()).reverse().map(([id, needs]) => [id, needs.slice().reverse()]));
    const a = layoutTopics(g, SMALL);
    const b = layoutTopics(shuffled, SMALL);
    expect(Array.from(b.nodes.values()).sort((x, y) => (x.id < y.id ? -1 : 1))).toEqual(Array.from(a.nodes.values()).sort((x, y) => (x.id < y.id ? -1 : 1)));
    expect(layoutTopics(g, SMALL).box).toEqual(a.box);
  });

  test("every topic sits to the right of each topic it needs", () => {
    const layout = layoutTopics(synthetic(300));
    for (const e of layout.edges) expect(layout.nodes.get(e.from)!.x).toBeLessThan(layout.nodes.get(e.to)!.x);
    expect(layout.box.w).toBe((layout.columns.length - 1) * 232 + 184);
  });

  test("a loop, a topic that needs itself and a missing topic still lay out", () => {
    const layout = layoutTopics(
      new Map([
        ["a", ["c"]],
        ["b", ["a"]],
        ["c", ["b"]],
        ["d", ["d", "gone"]],
        ["e", ["a"]],
      ]),
      SMALL,
    );
    expect(layout.cyclic).toBe(true);
    expect(layout.nodes.size).toBe(5);
    expect(overlaps(layout)).toBe(0);
    expect(layout.edges.length).toBe(4);
    expect(layout.needs.get("d")).toEqual([]);
    expect(layoutTopics(new Map([["x", ["x"]]])).cyclic).toBe(true);
    expect(layoutTopics(new Map([["x", ["gone"]]])).cyclic).toBe(false);
  });

  test("a chain of 3000 topics and a loop of 3000 both finish", () => {
    const chain = new Map(Array.from({ length: 3000 }, (_, i) => [`n${i}`, i ? [`n${i - 1}`] : []] as [string, string[]]));
    expect(layoutTopics(chain, SMALL).columns.length).toBe(3000);
    const loop = new Map(Array.from({ length: 3000 }, (_, i) => [`n${i}`, [`n${(i + 2999) % 3000}`]] as [string, string[]]));
    const laid = layoutTopics(loop, SMALL);
    expect(laid.cyclic).toBe(true);
    expect(laid.nodes.size).toBe(3000);
  });

  test("an empty graph has no size, and a box covers the topics asked for", () => {
    const none = layoutTopics(new Map());
    expect(none.nodes.size).toBe(0);
    expect(none.box.w).toBe(0);
    expect(boxOf(none, ["a"])).toBeNull();
    const two = layoutTopics(new Map([["a", []], ["b", ["a"]]]));
    expect(boxOf(two, ["a", "b"])).toEqual(two.box);
  });
});

describe("topic states", () => {
  const atom = (id: string, requires: string[]): PlacedAtom => ({ id, title: id, requires, deck: "d", deckTitle: "D" });
  const data = (cards: EngineState["cards"]): LearnData => ({
    decks: [],
    atoms: new Map([atom("a", []), atom("b", ["a"]), atom("c", ["b"]), atom("d", [])].map((a) => [a.id, a])),
    byDeck: new Map(),
    states: new Map([["d", { ...normalizeState(null), cards }]]),
  });

  test("known, due, new and locked follow the cards and the links", () => {
    const now = 1_000_000;
    const card = (due: number) => ({ due }) as EngineState["cards"][string];
    const states = topicStates(data({ a: card(now - 1), d: card(now + 1) }), now);
    expect(Object.fromEntries(states)).toEqual({ a: "due", b: "new", c: "locked", d: "known" });
  });
});

describe("titles on a topic", () => {
  test("wrap to two lines and cut with an ellipsis", () => {
    expect(wrapTitle("Entropy")).toEqual(["Entropy"]);
    expect(wrapTitle("The second law of thermodynamics")).toEqual(["The second law of", "thermodynamics"]);
    const long = wrapTitle("A long title about the electrochemical gradient across the inner membrane");
    expect(long.length).toBe(2);
    expect(long[1].endsWith("…")).toBe(true);
    expect(Math.max(...long.map((l) => l.length))).toBeLessThanOrEqual(22);
    expect(wrapTitle("Supercalifragilisticexpialidocious")[0].length).toBe(22);
  });
});
