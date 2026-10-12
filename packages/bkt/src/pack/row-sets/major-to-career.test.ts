import { describe, expect, test } from "bun:test";
import { checkRows, hitIds, packedBytes, REPLY_BYTES, rowKeys, SET_BYTES } from "./contract";
import { checkCaps, memoryTables, setBytes } from "./index";
import { FEDERAL, type Row } from "./licences";
import { majorToCareer, MAJOR_TO_CAREER_ID } from "./major-to-career";
import { repoFixtureContext } from "./test-fixtures";

const ctx = repoFixtureContext();

const CROSSWALK: Row[] = [
  ["01.0101", "11-9013"], ["01.0101", "25-1041"], ["01.0102", "11-9013"], ["01.0901", "19-1011"], ["01.1101", "19-1013"],
  ["11.0101", "15-1211"], ["11.0101", "15-1251"], ["11.0102", "15-2051"], ["11.0701", "15-1221"], ["11.0701", "11-3021"],
  ["11.0701", "25-1021"], ["11.1003", "15-1212"], ["52.0101", "11-1011"], ["52.0101", "11-1021"], ["52.0201", "11-1021"],
  ["52.0301", "13-2011"], ["52.0801", "13-2051"], ["52.1301", "15-2011"], ["52.1401", "11-2021"], ["99.0101", "11-1011"],
].map(([cip, soc]) => ({ cip, soc }));

const BACKBONE: Row[] = [
  { scheme: "cip2020", code: "01", title: "AGRICULTURAL/ANIMAL/PLANT/VETERINARY SCIENCE AND RELATED FIELDS", grain: 2 },
  { scheme: "cip2020", code: "11", title: "COMPUTER AND INFORMATION SCIENCES AND SUPPORT SERVICES", grain: 2 },
  { scheme: "cip2020", code: "52", title: "BUSINESS, MANAGEMENT, MARKETING, AND RELATED SUPPORT SERVICES", grain: 2 },
  { scheme: "cip2020", code: "11.07", title: "Computer Science", grain: 4 },
  { scheme: "soc2018", code: "11-0000", title: "Management Occupations", grain: "major" },
  { scheme: "soc2018", code: "13-0000", title: "Business and Financial Operations Occupations", grain: "major" },
  { scheme: "soc2018", code: "15-0000", title: "Computer and Mathematical Occupations", grain: "major" },
  { scheme: "soc2018", code: "25-0000", title: "Educational Instruction and Library Occupations", grain: "major" },
  { scheme: "onet31", code: "19-1011.00", title: "Animal Scientists", grain: "onet" },
];

const tables = (crosswalk: Row[] = CROSSWALK) => memoryTables({ cip_soc_crosswalk: crosswalk, backbone_codes: BACKBONE });

describe("major to career", () => {
  test("a 20-row fixture gives a stable sha256", async () => {
    const [rows] = await majorToCareer(tables(), ctx);
    const [again] = await majorToCareer(tables(), ctx);
    expect(rows.sha256).toBe(again.sha256);
    expect(rows.sha256).toBe("251dde1d8013f5d45378dfd00c5a8f8f7d0dbc95d9a7b3467ba49bb70c5d4956");
  });

  test("series and major groups become hits, and crosswalk pairs become weighted links", async () => {
    const pages = await majorToCareer(tables(), ctx);
    expect(pages).toHaveLength(1);
    const rows = pages[0];
    expect(rows.id).toBe(MAJOR_TO_CAREER_ID);
    expect(rowKeys(rows)).toEqual(["cip-01", "cip-11", "cip-52", "soc-11", "soc-13", "soc-15", "soc-25"]);
    expect(hitIds(rows)[3]).toBe("row:major-to-career:soc-11");
    expect(rows.n).toBe(7);
    expect(rows.sub).toEqual(["CIP 01", "CIP 11", "CIP 52", "SOC 11", "SOC 13", "SOC 15", "SOC 25"]);
    expect(rows.title[1]).toBe("COMPUTER AND INFORMATION SCIENCES AND SUPPORT SERVICES");
    expect(rows.title[5]).toBe("Computer and Mathematical Occupations");
    expect(rows.links).toEqual([[3, 6], [3, 5, 6], [3, 4, 5], [], [], [], []]);
    expect(rows.frame.edgeWeight).toEqual([[2, 1], [1, 5, 1], [4, 2, 1], [], [], [], []]);
    expect(rows.links.flat()).toHaveLength(8);
    expect(rows.frame.weight).toEqual([3, 7, 7, 7, 2, 6, 2]);
    expect(rows.groups.map((g) => g.id)).toEqual(["cip", "soc"]);
    expect(rows.gi).toEqual([0, 0, 0, 1, 1, 1, 1]);
    expect(rows.sources).toEqual(["cip2020", "soc2018"]);
    expect(rows.licence).toBe(FEDERAL);
    expect([rows.audience, rows.modes, rows.frame.layout, rows.frame.drill]).toEqual(["public", ["graph"], "flow", null]);
    expect(rows.year.every((y) => y === null) && rows.url.every((u) => u === null)).toBe(true);
    checkRows(rows, ctx);
  });

  test("a pair whose series or major group has no title is left out", async () => {
    const [rows] = await majorToCareer(tables(), ctx);
    expect(rowKeys(rows)).not.toContain("cip-99");
    expect(rowKeys(rows)).not.toContain("soc-19");
    expect((rows.frame.edgeWeight as number[][]).flat().reduce((a, b) => a + b, 0)).toBe(17);
  });

  test("the caps hold", async () => {
    const pages = await majorToCareer(tables(), ctx);
    checkCaps(MAJOR_TO_CAREER_ID, pages);
    expect(setBytes(pages)).toBeLessThan(SET_BYTES);
    expect(packedBytes(pages[0])).toBeLessThan(REPLY_BYTES);
  });

  test("an empty crosswalk gives a set with no hits", async () => {
    const [rows] = await majorToCareer(tables([]), ctx);
    expect([rows.n, rows.links]).toEqual([0, []]);
  });
});
