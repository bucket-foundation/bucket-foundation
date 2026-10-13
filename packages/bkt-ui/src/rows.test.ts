import { describe, expect, test } from "bun:test";
import { assembleRowSet, pageRows } from "../../bkt/src/pack/row-sets/contract";
import { fixtureContext, fixtureDraft } from "../../bkt/src/pack/row-sets/test-fixtures";
import type { Hit } from "../../../src/lib/explore/search";
import { cutLine, drawableModes, expandRows, isRowScene, verifiedLine, type PackedRows } from "./explore/rows";

const packed = (): PackedRows => structuredClone(assembleRowSet([fixtureDraft()], fixtureContext())[0]);

describe("expandRows", () => {
  test("a packed fixture expands to the hand-written hits", () => {
    const expected: Hit[] = [
      { id: "row:fixture-set:one", type: "row", title: "First row", subtitle: "A-1", text: "", score: 1, branch: "a", year: 1990, url: "https://example.org/one", links: ["row:fixture-set:two", "row:fixture-set:three"], source: "open", license: "US federal work, public domain" },
      { id: "row:fixture-set:two", type: "row", title: "Second row", subtitle: "B-2", text: "", score: 1, branch: "b", year: null, url: null, links: ["row:fixture-set:three"], source: "by", license: "CC-BY-4.0" },
      { id: "row:fixture-set:three", type: "row", title: "Third row", subtitle: "3 rows", text: "", score: 1, branch: "a", year: null, url: null, links: [], source: "open", license: "US federal work, public domain" },
    ];
    const { hits, frame } = expandRows(packed());
    expect(hits).toEqual(expected);
    expect(frame.at).toEqual({ "row:fixture-set:one": 0, "row:fixture-set:two": 1, "row:fixture-set:three": 2 });
    expect(frame.from).toEqual([1980, 1985, null]);
    expect(frame.edgeWeight).toEqual([[3, 1], [2], []]);
    expect(frame.groups.map((g) => g.label)).toEqual(["Group A", "Group B"]);
    expect(isRowScene(frame)).toBe(true);
    expect(isRowScene(packed().frame)).toBe(false);
    expect(isRowScene(undefined)).toBe(false);
  });

  test("a shared key prefix expands to whole ids", () => {
    const rows = assembleRowSet([fixtureDraft({ rows: ["life-soc-11", "life-soc-13"].map((key) => ({ key, title: key, sub: "", group: "a", source: "open" })) })], fixtureContext())[0];
    expect(expandRows(rows).hits.map((h) => h.id)).toEqual(["row:fixture-set:life-soc-11", "row:fixture-set:life-soc-13"]);
  });

  test("a column of the wrong length throws", () => {
    for (const change of [
      (p: PackedRows) => void p.title.pop(),
      (p: PackedRows) => void p.links.push([]),
      (p: PackedRows) => void (p.frame.from as (number | null)[]).pop(),
      (p: PackedRows) => void (p.frame.edgeWeight as number[][]).pop(),
      (p: PackedRows) => void (p.n = 2),
    ]) {
      const broken = packed();
      change(broken);
      expect(() => expandRows(broken)).toThrow(/does not hold/);
    }
  });

  test("an index outside its table throws", () => {
    const group = packed();
    group.gi[0] = 9;
    expect(() => expandRows(group)).toThrow(/points outside a table/);
    const link = packed();
    link.links[0] = [7];
    expect(() => expandRows(link)).toThrow(/links outside the page/);
  });

  test("a page of a paged set expands with links local to the page", () => {
    const rows = assembleRowSet([fixtureDraft({ rows: Array.from({ length: 700 }, (_, i) => ({ key: `k${String(i).padStart(3, "0")}`, title: `Row ${i}`, sub: "", group: "a", source: "open", links: i + 1 < 700 ? [{ to: `k${String(i + 1).padStart(3, "0")}` }] : [] })) })], fixtureContext())[0];
    const second = expandRows(pageRows(rows, 1));
    expect(second.hits).toHaveLength(100);
    expect(second.hits[0].id).toBe("row:fixture-set:k600");
    expect(second.hits[0].links).toEqual(["row:fixture-set:k601"]);
    expect(pageRows(rows, 0).cut).toBe(1);
  });
});

describe("the plain lines beside a row set", () => {
  test("the cut count reads as one sentence, and no cut gives no line", () => {
    expect(cutLine(0)).toBeNull();
    expect(cutLine(1)).toBe("1 link leads to a row on another page, so this page leaves it out.");
    expect(cutLine(1287)).toBe("1,287 links lead to rows on other pages, so this page leaves them out.");
  });

  test("the checked share is stated when the set marks it", () => {
    expect(verifiedLine({ verified: null })).toBeNull();
    expect(verifiedLine({ verified: [true, false, true] })).toBe("2 of 3 rows are checked against their source. The rest are drawn hollow.");
  });

  test("a set draws in the modes it declares that the window can draw", () => {
    expect(drawableModes({ modes: ["graph", "timeline"] }, ["graph", "map"])).toEqual(["graph"]);
    expect(drawableModes({ modes: ["earth"] }, ["graph", "map"])).toEqual([]);
  });
});
