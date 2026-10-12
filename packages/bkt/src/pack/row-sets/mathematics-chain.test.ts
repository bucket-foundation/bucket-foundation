import { describe, expect, test } from "bun:test";
import { checkRows, hitIds, narrowRows, packedBytes, REPLY_BYTES, rowKeys } from "./contract";
import { checkCaps, memoryTables } from "./index";
import { CCSS_LICENCE, type Row } from "./licences";
import { mathematicsChain, MATHEMATICS_CHAIN_ID } from "./mathematics-chain";
import { repoFixtureContext } from "./test-fixtures";

const ctx = repoFixtureContext();

const standard = (id: string, topic: string, level: string, needs: string[], stated: boolean, over: Row = {}): Row => ({
  id: `school-ccss-math-${id}`, slice: "school", system: null, framework_id: "school-fw-ccss-math", field: "mathematics", level, topic,
  typical_age_or_year: level === "early" ? "Kindergarten, age 5-6" : "Grade 3, age 8-9", prerequisites: needs.map((n) => `school-ccss-math-${n}`),
  edges_stated: stated, verified: stated, source_licence: null,
  source_url: "https://raw.githubusercontent.com/achievethecore/atc-coherence-map/master/standards.js", standard_url: `https://www.thecorestandards.org/Math/Content/${id}/`, ...over,
});

const ROWS: Row[] = [
  standard("k-cc", "Counting and Cardinality, Kindergarten", "early", [], true),
  standard("k-cc-a-1", "K.CC.A.1: counting to 100", "early", ["k-cc"], true),
  standard("3-oa", "Operations and Algebraic Thinking, Grade 3", "primary", ["k-cc", "k-cc-a-1"], true),
  standard("3-oa-a-1", "3.OA.A.1: products of whole numbers", "primary", ["3-oa", "3-oa", "missing-row", "3-oa-a-1"], true),
  standard("hs-a-rei", "A-REI: reasoning with equations", "upper-secondary", ["3-oa"], false),
  standard("7-ee", "Expressions and Equations, Grade 7", "lower-secondary", [], true),
  standard("ela-1", "Reading, Grade 1", "primary", [], true, { framework_id: "school-fw-ccss-ela" }),
  standard("k12-copy", "K.CC.A.1", "early", [], true, { slice: "k12-full", system: "ccss-math" }),
  standard("odd-level", "Odd level", "graduate", [], true),
  standard("no-title", "", "primary", [], true),
];

describe("the school mathematics chain", () => {
  test("a fixture gives a stable sha256", async () => {
    const [rows] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const [again] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    expect(rows.sha256).toBe(again.sha256);
    expect(rows.sha256).toBe("db4ea6ee3313b80bf612300c7c79de9c7a9fa864674c09eb14b98c6eadf2d41f");
  });

  test("standards become hits, prerequisites become links, and each link carries the stated mark of its row", async () => {
    const pages = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    expect(pages).toHaveLength(1);
    const rows = pages[0];
    expect(rows.id).toBe(MATHEMATICS_CHAIN_ID);
    expect(rowKeys(rows)).toEqual(["k-cc", "k-cc-a-1", "3-oa", "3-oa-a-1", "hs-a-rei", "7-ee"].map((k) => `school-ccss-math-${k}`));
    expect(hitIds(rows)[0]).toBe("row:mathematics-chain:school-ccss-math-k-cc");
    expect(rows.links).toEqual([[], [0], [0, 1], [2], [2], []]);
    expect(rows.frame.edgeStated).toEqual([[], [true], [true, true], [true], [false], []]);
    expect(rows.frame.verified).toEqual([true, true, true, true, false, true]);
    expect(rows.groups.map((g) => g.label)).toEqual(["Kindergarten", "Grades 1 to 5", "High school", "Grades 6 to 8"]);
    expect(rows.sub[0]).toBe("Kindergarten, age 5-6");
    expect(rows.url[1]).toBe("https://www.thecorestandards.org/Math/Content/k-cc-a-1/");
    expect([rows.licence, rows.sources, rows.audience, rows.modes]).toEqual([CCSS_LICENCE, ["ccss-math"], "public", ["graph"]]);
    expect(rows.attributions[0].url).toBe("https://www.thecorestandards.org/public-license/");
    expect(rows.attributions[0].notice).toContain("Copyright 2010. National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved.");
    expect(rows.attributions[0].notice).toContain("CC0 1.0");
    checkRows(rows, ctx);
    checkCaps(MATHEMATICS_CHAIN_ID, pages);
    expect(packedBytes(rows)).toBeLessThan(REPLY_BYTES);
  });

  test("narrowing keeps the stated marks beside the links that stay", async () => {
    const [rows] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const kept = narrowRows(rows, (title) => !title.startsWith("K.CC"));
    expect(kept.n).toBe(5);
    expect(kept.links).toEqual([[], [0], [1], [1], []]);
    expect(kept.frame.edgeStated).toEqual([[], [true], [true], [false], []]);
    expect([kept.total, kept.cut, kept.page]).toEqual([5, 0, 0]);
    checkRows(kept, ctx);
    expect(narrowRows(rows, () => true)).toBe(rows);
    expect(() => narrowRows(kept, () => true)).not.toThrow();
  });

  test("a stated mark list that does not pair with its links fails rule 3", async () => {
    const [rows] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const broken = structuredClone(rows);
    (broken.frame.edgeStated as boolean[][])[2].pop();
    expect(() => checkRows(broken, ctx)).toThrow(/rule 3: edgeStated\[2\]/);
  });
});
