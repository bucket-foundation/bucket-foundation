import { describe, expect, test } from "bun:test";
import { checkRows, hitIds, packedBytes, REPLY_BYTES, REPLY_HITS, rowKeys, SET_BYTES } from "./contract";
import { checkCaps, memoryTables, setBytes } from "./index";
import type { Row } from "./licences";
import { censusSpan, occupationsTime, OCCUPATIONS_ID } from "./occupations-time";
import { repoFixtureContext } from "./test-fixtures";

const ctx = repoFixtureContext();

const CENSUS_URL = "https://www2.census.gov/programs-surveys/demo/guidance/industry-occupation/list.xlsx";
const IPUMS_URL = "https://usa.ipums.org/usa/resources/chapter4/occ_90-00.xls";

const life = (scheme: string, code: string, title: string, status: string, from: number, to: number, peak: number | null = null, lineage: string[] = []): Row => ({
  id: `histocc-life-${scheme}-${code}`, slice: "history-occupations", title, scheme, code, status, era_from: from, era_to: to, lineage_codes: lineage,
  peak_year: peak === null ? null : to, peak_employment: peak,
  source_url: scheme === "soc" ? "https://www.bls.gov/oes/tables.htm" : scheme === "onet-soc" ? "https://www.onetcenter.org/taxonomy.html" : scheme === "census-1990" ? IPUMS_URL : CENSUS_URL,
});

export const OCCUPATION_ROWS: Row[] = [
  life("soc", "11-1011", "Chief Executives", "stable", 1999, 2025, 597060),
  life("soc", "11-1021", "General and Operations Managers", "growing", 1999, 2025, 3584420),
  life("soc", "11-2011", "Advertising and Promotions Managers", "declining", 1999, 2024, 100520),
  life("soc", "15-1211", "Computer Systems Analysts", "stable", 2019, 2025, 589060),
  life("soc", "15-1212", "Information Security Analysts", "emerging", 2019, 2025, 175350),
  life("soc", "15-2011", "Actuaries", "growing", 1999, 2025, 30000),
  life("onet-soc", "11-1011.00", "Chief Executives", "stable", 2000, 2025),
  life("onet-soc", "11-1011.03", "Chief Sustainability Officers", "emerging", 2010, 2025),
  life("onet-soc", "11-2011.00", "Advertising and Promotions Managers", "stable", 2000, 2025),
  life("onet-soc", "15-1211.00", "Computer Systems Analysts", "stable", 2019, 2025),
  life("onet-soc", "15-1211.01", "Health Informatics Specialists", "emerging", 2019, 2025),
  life("onet-soc", "15-2011.00", "Actuaries", "stable", 2000, 2025),
  life("census-1990", "003", "Legislators", "extinct", 1990, 2000),
  life("census-1990", "004", "Chief executives and general administrators, public administration", "extinct", 1990, 2000),
  life("census-1990", "064", "Computer systems analysts and scientists", "extinct", 1990, 2000),
  life("census-1990", "066", "Actuaries", "stable", 1880, 2000),
  life("census-2018", "0010", "Chief executives", "stable", 1880, 2025, 1200000, ["1950:290", "1990:004", "2000:001", "2002:0010", "2010:0010", "2018:0010"]),
  life("census-2018", "0020", "General and operations managers", "growing", 2010, 2025, 900000, ["2010:0020", "2018:0020"]),
  life("census-2018", "1006", "Computer systems analysts", "stable", 2018, 2025, null, ["2018:1006"]),
  life("census-2018", "1200", "Actuaries", "stable", 1980, 2025, 30000, ["1980:066", "1990:066"]),
];

const BACKBONE: Row[] = [
  { scheme: "soc2018", code: "11-0000", title: "Management Occupations", grain: "major" },
  { scheme: "soc2018", code: "15-0000", title: "Computer and Mathematical Occupations", grain: "major" },
  { scheme: "soc2018", code: "11-1011", title: "Chief Executives", grain: "detailed" },
];

const tables = (rows: Row[] = OCCUPATION_ROWS) => memoryTables({ occupation_history: rows, backbone_codes: BACKBONE });

describe("occupations through time", () => {
  test("a 20-row fixture gives a stable sha256", async () => {
    const pages = await occupationsTime(tables(), ctx);
    const again = await occupationsTime(tables(), ctx);
    expect(pages.map((p) => p.sha256)).toEqual(again.map((p) => p.sha256));
    expect(pages[0].sha256).toBe("ebf17510d2a717b0b229c702af6189f3b807ff74be6a9b1b8305e1ffa5cef3ff");
    expect(pages[5].sha256).toBe("06fca2f0d4f0392f6a0b08d254c10559afadd59e5c5313c8f52ad42626034620");
  });

  test("the opening page holds one hit per major group and census year, and each opens its lifecycles", async () => {
    const pages = await occupationsTime(tables(), ctx);
    const [opening, ...groups] = pages;
    expect(opening.id).toBe(OCCUPATIONS_ID);
    expect(rowKeys(opening)).toEqual(["soc-11", "soc-15", "onet-soc-11", "onet-soc-15", "census-2018"]);
    expect(opening.frame.drill).toEqual({ param: "group", values: rowKeys(opening) });
    expect(opening.title).toEqual(["Management Occupations", "Computer and Mathematical Occupations", "Management Occupations", "Computer and Mathematical Occupations", "Census 2018 occupation list"]);
    expect(opening.sub).toEqual(["SOC 11, 3 occupations", "SOC 15, 3 occupations", "O*NET-SOC 11, 3 occupations", "O*NET-SOC 15, 3 occupations", "4 occupations"]);
    expect(opening.groups.map((g) => g.id)).toEqual(["soc", "onet-soc", "census"]);
    expect(opening.frame.weight).toEqual([3, 3, 3, 3, 4]);
    expect(opening.frame.from).toEqual([1999, 1999, 2000, 2000, 2000]);
    expect(opening.frame.to).toEqual([2025, 2025, 2025, 2025, 2025]);
    expect(opening.frame.axis).toEqual({ from: 1999, to: 2025, scale: "linear", unit: "year" });
    expect(opening.frame.layout).toBe("ring");
    expect(opening.sources).toEqual(["soc2018", "onet", "census-occupations"]);
    expect(groups).toHaveLength(5);
    expect(groups.map((p) => p.n)).toEqual([3, 3, 3, 3, 4]);
    expect(groups.reduce((sum, p) => sum + p.n, 0)).toBe(OCCUPATION_ROWS.length - 4);
    expect(pages.every((p) => p.links.every((l) => l.length === 0))).toBe(true);
    expect(pages.every((p) => p.licence === "CC-BY-4.0" && p.audience === "public" && p.modes.join() === "map")).toBe(true);
    expect(hitIds(groups[0])).toEqual(["row:occupations-time:histocc-life-soc-11-1011", "row:occupations-time:histocc-life-soc-11-1021", "row:occupations-time:histocc-life-soc-11-2011"]);
    expect(groups[0].sub).toEqual(["11-1011", "11-1021", "11-2011"]);
    expect(groups[0].groups.map((g) => g.id)).toEqual(["stable", "growing", "declining"]);
    expect(groups[0].frame.weight).toEqual([597060, 3584420, 100520]);
    expect(groups[2].frame.weight).toBeNull();
    expect(groups[2].year).toEqual([null, null, null]);
    expect(groups[4].url).toEqual([CENSUS_URL, CENSUS_URL, CENSUS_URL, CENSUS_URL]);
    for (const p of pages) checkRows(p, ctx);
  });

  test("no public row cites IPUMS or carries a span, a year, a weight or a status derived from its crosswalks", async () => {
    const pages = await occupationsTime(tables(), ctx);
    expect(/ipums/i.test(JSON.stringify(pages))).toBe(false);
    expect(pages.flatMap(rowKeys).filter((k) => k.includes("census-1990"))).toEqual([]);
    expect(pages.flatMap((p) => p.sources)).not.toContain("ipums");
    const census = pages[5];
    expect(rowKeys(census)).toEqual(["histocc-life-census-2018-0010", "histocc-life-census-2018-0020", "histocc-life-census-2018-1006", "histocc-life-census-2018-1200"]);
    expect(census.frame.from).toEqual([2000, 2010, 2018, 2018]);
    expect(census.frame.to).toEqual([2025, 2025, 2025, 2025]);
    expect(census.frame.weight).toBeNull();
    expect(census.year).toEqual([null, null, null, null]);
    expect(census.groups).toEqual([{ id: "listed", label: "Listed", color: "#5b7a3a" }]);
    expect(censusSpan({ scheme: "census-2018", lineage_codes: ["1950:290", "1990:004", "2000:001", "2018:0010"], era_to: 2025 })).toEqual({ from: 2000, to: 2025 });
    expect(censusSpan({ scheme: "census-2002", lineage_codes: ["1980:027", "1990:027"], era_to: 2002 })).toEqual({ from: 2002, to: 2002 });
    expect(censusSpan({ scheme: "census-2010", lineage_codes: ["2030:1"], era_to: null })).toEqual({ from: 2010, to: 2010 });
    expect(censusSpan({ scheme: "census-1990", lineage_codes: ["1990:183"], era_to: 1990 })).toBeNull();
    expect(censusSpan({ scheme: "soc", era_to: 2025 })).toBeNull();
  });

  test("the caps hold", async () => {
    const pages = await occupationsTime(tables(), ctx);
    checkCaps(OCCUPATIONS_ID, pages);
    expect(setBytes(pages)).toBeLessThan(SET_BYTES);
    for (const p of pages) {
      expect(p.n).toBeLessThanOrEqual(REPLY_HITS);
      expect(packedBytes(p)).toBeLessThan(REPLY_BYTES);
    }
  });

  test("a row with no cleared source, no span, no known status or no major title is left out", async () => {
    const extra: Row[] = [
      { ...life("soc", "11-9999", "Unsourced", "stable", 2000, 2010), scheme: "isco-08" },
      { ...life("soc", "13-1011", "No major title", "stable", 2000, 2010) },
      { ...life("soc", "11-3011", "No span", "stable", 2000, 2010), era_from: null },
      { ...life("soc", "11-3012", "Odd status", "rumoured", 2000, 2010) },
      { ...life("census-2018", "0030", "", "stable", 2018, 2025) },
    ];
    const pages = await occupationsTime(tables([...OCCUPATION_ROWS, ...extra]), ctx);
    expect(pages.slice(1).reduce((sum, p) => sum + p.n, 0)).toBe(OCCUPATION_ROWS.length - 4);
    expect(pages[0].n).toBe(5);
  });

  test("no rows give an opening page with no hits", async () => {
    const pages = await occupationsTime(tables([]), ctx);
    expect(pages).toHaveLength(1);
    expect([pages[0].n, pages[0].frame.axis, pages[0].frame.drill]).toEqual([0, null, { param: "group", values: [] }]);
  });
});
