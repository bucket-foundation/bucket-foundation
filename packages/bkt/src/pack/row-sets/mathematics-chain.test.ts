import { describe, expect, test } from "bun:test";
import { checkRows, hitIds, narrowRows, packedBytes, REPLY_BYTES, rowKeys } from "./contract";
import { checkCaps, memoryTables } from "./index";
import { CCSS_LICENCE, type Row } from "./licences";
import { mathematicsChain, MATHEMATICS_CHAIN_ID } from "./mathematics-chain";
import { repoFixtureContext } from "./test-fixtures";

const ctx = repoFixtureContext();

const standard = (id: string, topic: string, level: string, needs: string[], stated: boolean, notes: string, over: Row = {}): Row => ({
  id: `school-ccss-math-${id}`, slice: "school", system: null, framework_id: "school-fw-ccss-math", field: "mathematics", level, topic, notes,
  typical_age_or_year: level === "early" ? "Kindergarten, age 5-6" : "Grade 3, age 8-9", prerequisites: needs.map((n) => `school-ccss-math-${n}`),
  edges_stated: stated, verified: stated, source_licence: null,
  source_url: "https://raw.githubusercontent.com/achievethecore/atc-coherence-map/master/standards.js", standard_url: `https://www.thecorestandards.org/Math/Content/${id}/`, ...over,
});

const DOMAIN = "Domain node. Edges aggregated from the directed standard-to-standard arrows of the Coherence Map.";
const part = (of: string) => `Part of school-ccss-math-${of}.`;

const ROWS: Row[] = [
  standard("k-cc", "Counting and Cardinality, Kindergarten", "early", [], true, DOMAIN),
  standard("k-cc-a-1", "K.CC.A.1: counting to 100", "early", [], true, part("k-cc")),
  standard("k-cc-a-2", "K.CC.A.2: counting forward", "early", ["k-cc-a-1", "3-oa-a-1"], true, `${part("k-cc")} Related without direction: school-ccss-math-k-cc-a-1.`),
  standard("3-oa", "Operations and Algebraic Thinking, Grade 3", "primary", ["k-cc"], true, DOMAIN),
  standard("3-oa-a-1", "3.OA.A.1: products of whole numbers", "primary", ["k-cc-a-1", "3-oa-a-1", "missing-row"], true, part("3-oa")),
  standard("hs-a-rei", "Reasoning with Equations and Inequalities", "upper-secondary", ["3-oa", "k-cc"], false, DOMAIN),
  standard("hs-a-rei-a", "A-REI.A: reasoning as a chain of steps", "upper-secondary", [], false, "Cluster of school-ccss-math-hs-a-rei. Edges inherited from the domain node and inferred."),
  standard("hs-a-rei-a-1", "A-REI.A.1: explaining each step", "upper-secondary", ["hs-a-rei-a"], false, part("hs-a-rei-a")),
  standard("7-ee", "Expressions and Equations, Grade 7", "lower-secondary", [], true, DOMAIN),
  standard("ela-1", "Reading, Grade 1", "primary", [], true, DOMAIN, { framework_id: "school-fw-ccss-ela" }),
  standard("k12-copy", "K.CC.A.1", "early", [], true, part("k-cc"), { slice: "k12-full", system: "ccss-math" }),
  standard("odd-level", "Odd level", "graduate", [], true, DOMAIN),
  standard("no-title", "", "primary", [], true, DOMAIN),
  standard("loose", "Loose standard", "primary", [], true, "No parent stated."),
  standard("stray", "Stray standard", "primary", [], true, part("nowhere")),
  standard("other-host", "Borrowed row", "primary", [], true, part("k-cc"), { source_url: "https://apcentral.collegeboard.org/courses/ap-calculus-ab" }),
  { ...standard("x", "Algebra I", "upper-secondary", [], false, "Traditional pathway of CCSS Mathematics Appendix A, recalled from memory."), id: "school-us-math-algebra-1" },
];

describe("the school mathematics chain", () => {
  test("a fixture gives a stable sha256", async () => {
    const [rows] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const [again] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    expect(rows.sha256).toBe(again.sha256);
    expect(rows.sha256).toBe("0666f80ed31fbeb6af9b3d0e2448061c4f4435ee6f50c99eee8d87928f989e4c");
  });

  test("domains open the chain, a domain opens its standards, and each link carries the stated mark of its row", async () => {
    const pages = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const [opening, ...domains] = pages;
    expect(opening.id).toBe(MATHEMATICS_CHAIN_ID);
    expect(rowKeys(opening)).toEqual(["k-cc", "3-oa", "hs-a-rei"].map((k) => `school-ccss-math-${k}`));
    expect(opening.frame.drill).toEqual({ param: "group", values: rowKeys(opening) });
    expect(opening.links).toEqual([[], [0], [1, 0]]);
    expect(opening.frame.edgeStated).toEqual([[], [true], [false, false]]);
    expect(opening.frame.verified).toEqual([true, true, false]);
    expect(opening.groups.map((g) => g.label)).toEqual(["Kindergarten", "Grades 1 to 5", "High school"]);
    expect(domains.map((p) => rowKeys(p))).toEqual([
      ["school-ccss-math-k-cc-a-1", "school-ccss-math-k-cc-a-2"],
      ["school-ccss-math-3-oa-a-1"],
      ["school-ccss-math-hs-a-rei-a", "school-ccss-math-hs-a-rei-a-1"],
    ]);
    expect(domains[0].links).toEqual([[], [0]]);
    expect(domains[0].frame.edgeStated).toEqual([[], [true]]);
    expect(domains[1].links).toEqual([[]]);
    expect(domains[2].links).toEqual([[], [0]]);
    expect(domains[2].frame.edgeStated).toEqual([[], [false]]);
    expect(hitIds(opening)[0]).toBe("row:mathematics-chain:school-ccss-math-k-cc");
    expect(opening.sub[0]).toBe("Kindergarten, age 5-6");
    expect(domains[0].url[0]).toBe("https://www.thecorestandards.org/Math/Content/k-cc-a-1/");
    for (const page of pages) {
      expect([page.licence, page.sources, page.audience, page.modes]).toEqual([CCSS_LICENCE, ["ccss-math"], "public", ["graph"]]);
      expect(page.attributions[0].url).toBe("https://www.thecorestandards.org/public-license/");
      expect(page.attributions[0].notice).toContain("Copyright 2010. National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved.");
      expect(page.attributions[0].notice).toContain("CC0 1.0");
      checkRows(page, ctx);
      expect(packedBytes(page)).toBeLessThan(REPLY_BYTES);
    }
    checkCaps(MATHEMATICS_CHAIN_ID, pages);
  });

  test("a row from memory, from another publisher, with no parent or with no title stays out", async () => {
    const pages = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const keys = pages.flatMap(rowKeys);
    expect(keys).toHaveLength(8);
    for (const out of ["school-us-math-algebra-1", "school-ccss-math-other-host", "school-ccss-math-loose", "school-ccss-math-stray", "school-ccss-math-no-title", "school-ccss-math-odd-level", "school-ccss-math-k12-copy", "school-ccss-math-ela-1", "school-ccss-math-7-ee"]) expect(keys).not.toContain(out);
    expect(JSON.stringify(pages)).not.toContain("collegeboard");
  });

  test("narrowing keeps the stated marks beside the links that stay", async () => {
    const [rows] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const kept = narrowRows(rows, (title) => !title.startsWith("Operations"));
    expect(kept.n).toBe(2);
    expect(kept.links).toEqual([[], [0]]);
    expect(kept.frame.edgeStated).toEqual([[], [false]]);
    expect([kept.total, kept.cut, kept.page]).toEqual([2, 0, 0]);
    checkRows(kept, ctx);
    expect(narrowRows(rows, () => true)).toBe(rows);
  });

  test("a stated mark list that does not pair with its links fails rule 3", async () => {
    const [rows] = await mathematicsChain(memoryTables({ progression: ROWS }), ctx);
    const broken = structuredClone(rows);
    (broken.frame.edgeStated as boolean[][])[2].pop();
    expect(() => checkRows(broken, ctx)).toThrow(/rule 3: edgeStated\[2\]/);
  });
});
