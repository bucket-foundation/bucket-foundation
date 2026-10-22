import { describe, expect, test } from "bun:test";
import { assembleRowSet, checkRows, rowKeys, type RowDraft } from "./contract";
import { coverageByCountry, COVERAGE_BY_COUNTRY_ID } from "./coverage-by-country";
import { countryPoints, educationByCountry, EDUCATION_BY_COUNTRY_ID, schoolingLine } from "./education-by-country";
import { corpusRegistry, countryCodes, memoryTables } from "./index";
import { entryById, REGISTRY, withCorpusCredits, type LicenceEntry, type Row } from "./licences";
import { fixtureContext, fixtureDraft, repoFixtureContext } from "./test-fixtures";

const NE = "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/";
const country = (iso2: string, iso3: string, name: string, lat: number, lng: number, over: Row = {}): Row => ({ id: `country-${iso2.toLowerCase()}`, slice: "world", iso2, iso3, name, lat, lng, licence: "public domain", verified: true, source_url: NE, ...over });
const COUNTRIES: Row[] = [
  country("IN", "IND", "India", 22.9, 79.6),
  country("CL", "CHL", "Chile", -37.7, -71.4),
  country("US", "USA", "United States of America", 39.8, -98.6),
  country("TR", "TUR", "Turkey", 39.1, 35.0),
  country("XX", "XXX", "Off the map", 95, 10),
  country("ZZ", "ZZZ", "Borrowed point", 1, 1, { source_url: "https://example.org/points" }),
];
const indicator = (iso3: string, code: string, value: number | null, year = "2023", over: Row = {}): Row => ({
  id: `world-ind-${iso3.toLowerCase()}-${code.toLowerCase()}`, slice: "world", iso3, country: iso3, licence: "CC BY 4.0", source_url: `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}`, verified: true, indicator: code, indicator_name: code, value, year, ...over,
});
const INDICATORS: Row[] = [
  indicator("IND", "SE.PRM.AGES", 6), indicator("IND", "SE.PRM.DURS", 5), indicator("IND", "SE.SEC.AGES", 11), indicator("IND", "SE.SEC.DURS", 7), indicator("IND", "SE.COM.DURS", 8, "2024"),
  indicator("IND", "SE.PRM.ENRR", 112.2),
  indicator("CHL", "SE.PRM.AGES", 6), indicator("CHL", "SE.PRM.DURS", 6),
  indicator("USA", "SE.SEC.DURS", 6), indicator("USA", "SE.COM.DURS", 1),
  indicator("TUR", "SE.PRM.AGES", 4),
  indicator("XXX", "SE.PRM.AGES", 6),
  indicator("ZZZ", "SE.PRM.AGES", 6),
  indicator("CHL", "SE.SEC.AGES", 12, "2023", { verified: false }),
  indicator("CHL", "SE.SEC.DURS", 6, "2023", { source_url: "https://download.uis.unesco.org/x.xlsx", licence: "unknown" }),
  indicator("CHL", "SE.COM.DURS", null),
  indicator("CHL", "SE.COM.DURS", 99),
];
const CELLS = { cells: [
  { dimension: "geography", cell: "IN", label: "India", rows_total: 101, rows_verified: 57 },
  { dimension: "geography", cell: "US", label: "United States", rows_total: 32898, rows_verified: 3639 },
  { dimension: "geography", cell: "TR", label: "Turkey", rows_total: 0, rows_verified: 0 },
  { dimension: "geography", cell: "CL", label: "Chile", rows_total: 1, rows_verified: 9 },
  { dimension: "geography", cell: "QQ", label: "Nowhere", rows_total: 5, rows_verified: 5 },
  { dimension: "domain", cell: "IN", label: "A domain that shares a code", rows_total: 7, rows_verified: 7 },
] };
const ctx = repoFixtureContext();
const placed = { ...ctx, places: new Set(["IND", "CHL", "USA", "TUR"]) };
const tables = () => memoryTables({ countries: COUNTRIES, world_indicators: INDICATORS }, { completeness: CELLS });

describe("country points", () => {
  test("a point comes from a Natural Earth row with both codes and a latitude and longitude on the globe", async () => {
    const points = await countryPoints(tables(), ctx);
    expect(points.get("IND")).toEqual({ iso2: "IN", iso3: "IND", name: "India", point: [22.9, 79.6] });
    expect(points.get("IN")).toBe(points.get("IND") as never);
    expect(points.has("XXX")).toBe(false);
    expect(points.has("ZZZ")).toBe(false);
    expect((await countryPoints(memoryTables({}), ctx)).size).toBe(0);
    expect([...(await countryCodes(tables()))].sort()).toEqual(["CHL", "IND", "TUR", "USA", "XXX", "ZZZ"]);
    expect((await countryCodes(memoryTables({}))).size).toBe(0);
  });
});

describe("education by country", () => {
  test("a fixture gives a stable sha256", async () => {
    const [rows] = await educationByCountry(tables(), placed);
    expect((await educationByCountry(tables(), placed))[0].sha256).toBe(rows.sha256);
    expect(rows.sha256).toBe("1f46c66091917303870ffebc352e9371e92c14a67a9c088230a2c905cb647a15");
  });

  test("each country is one placed hit with its schooling line, grouped by the age primary school starts", async () => {
    const [rows] = await educationByCountry(tables(), placed);
    expect(rows.id).toBe(EDUCATION_BY_COUNTRY_ID);
    expect(rowKeys(rows)).toEqual(["CHL", "IND", "TUR", "USA"]);
    expect(rows.title).toEqual(["Chile", "India", "Turkey", "United States of America"]);
    expect(rows.sub).toEqual(["Primary from age 6 for 6 years", "Primary from age 6 for 5 years, secondary from age 11 for 7 years, 8 years compulsory", "Primary from age 4", "Secondary for 6 years, 1 year compulsory"]);
    expect(rows.gi.map((g) => rows.groups[g].id)).toEqual(["age-6", "age-6", "age-other", "age-none"]);
    expect(rows.frame.place).toEqual(["CHL", "IND", "TUR", "USA"]);
    expect(rows.frame.points).toEqual([[-37.7, -71.4], [22.9, 79.6], [39.1, 35.0], [39.8, -98.6]]);
    expect(rows.frame.weight).toEqual([6, 12, null, 6]);
    expect(rows.year).toEqual([2023, 2024, 2023, 2023]);
    expect(rows.url[1]).toBe("https://api.worldbank.org/v2/country/IND/indicator/SE.PRM.AGES");
    expect([rows.sources, rows.licence, rows.modes, rows.audience]).toEqual([["world-bank-wdi"], "CC-BY-4.0", ["earth", "map"], "public"]);
    expect(rows.attributions.map((a) => [a.source, a.rows, a.termsRead])).toEqual([["World Bank, World Development Indicators, education series", 4, false], ["Natural Earth, 1:50m Admin 0 Countries label points", 4, true]]);
    checkRows(rows, placed);
  });

  test("an unchecked value, a row of unread terms, an enrolment figure and an absurd value stay out", async () => {
    const [rows] = await educationByCountry(tables(), placed);
    const text = JSON.stringify(rows);
    expect(/uis\\.unesco|112|99 years|secondary from age 12/.test(text)).toBe(false);
    expect(schoolingLine(new Map())).toBe("");
    expect(schoolingLine(new Map([["SE.COM.DURS", 9]]))).toBe("9 years compulsory");
  });

  test("with no table the set is empty and credits nothing", async () => {
    const [rows] = await educationByCountry(memoryTables({}), placed);
    expect([rows.n, rows.attributions]).toEqual([0, []]);
  });
});

describe("coverage by country", () => {
  test("a fixture gives a stable sha256", async () => {
    const [rows] = await coverageByCountry(tables(), placed);
    expect(rows.sha256).toBe("aef83aa0ec1827c91aa55a455488555e16a34712824cda9379f4cd60687d7e3a");
  });

  test("each geography cell with a point is one hit with its row counts", async () => {
    const [rows] = await coverageByCountry(tables(), placed);
    expect(rows.id).toBe(COVERAGE_BY_COUNTRY_ID);
    expect(rowKeys(rows)).toEqual(["IND", "USA", "TUR", "CHL"]);
    expect(rows.sub).toEqual(["101 rows, 57 checked", "32,898 rows, 3,639 checked", "0 rows, 0 checked", "1 row, 1 checked"]);
    expect(rows.gi.map((g) => rows.groups[g].id)).toEqual(["most", "some", "none", "most"]);
    expect(rows.frame.weight).toEqual([101, 32898, null, 1]);
    expect(rows.frame.place).toEqual(["IND", "USA", "TUR", "CHL"]);
    expect(rows.title[1]).toBe("United States of America");
    expect([rows.sources, rows.licence]).toEqual([["bucket-corpus"], "CC-BY-4.0"]);
    expect(rows.attributions.map((a) => a.rows)).toEqual([4, 4]);
    checkRows(rows, placed);
  });
});

describe("places and points in the contract", () => {
  const fixture = fixtureContext();
  const one = (over: Partial<RowDraft>): RowDraft => ({ key: "one", title: "T", sub: "", group: "a", source: "open", ...over });

  test("a point needs a place code and a latitude and longitude on the globe", () => {
    expect(assembleRowSet([fixtureDraft({ modes: ["earth"], rows: [one({ place: "CHL", point: [-37.7, -71.4] })] })], fixture)[0].frame.points).toEqual([[-37.7, -71.4]]);
    expect(() => assembleRowSet([fixtureDraft({ modes: ["earth"], rows: [one({ point: [1, 1] })] })], fixture)).toThrow(/rule 5: row 0 carries a point and no place code/);
    for (const point of [[91, 0], [0, 181], [Number.NaN, 0]] as [number, number][]) expect(() => assembleRowSet([fixtureDraft({ modes: ["earth"], rows: [one({ place: "CHL", point })] })], fixture)).toThrow(/rule 5/);
  });

  test("an extra credit names a registry source, shows once and may not be restricted in a public set", () => {
    const rows = assembleRowSet([fixtureDraft({ rows: [one({})], also: [{ source: "by", rows: 1 }, { source: "open", rows: 9 }] })], fixture)[0];
    expect(rows.attributions.map((a) => [a.source, a.rows, a.termsRead])).toEqual([["Open source", 1, false], ["Attributed source", 1, false]]);
    expect(rows.licence).toBe("US federal work, public domain");
    expect(() => assembleRowSet([fixtureDraft({ rows: [one({})], also: [{ source: "nowhere", rows: 1 }] })], fixture)).toThrow(/rule 4: source nowhere/);
    expect(() => assembleRowSet([fixtureDraft({ rows: [one({})], also: [{ source: "closed", rows: 1 }] })], fixture)).toThrow(/rule 4: the credit Closed source/);
  });
});

describe("credit lines from the corpus", () => {
  const line = (over: Row = {}) => ({ id: "credit-onet-31", credit_line: "A corpus line.", licence: "CC-BY-4.0", licence_url: "https://creativecommons.org/licenses/by/4.0/", terms_read: false, ...over });

  test("an entry that names a credit line takes its text and its terms flag, and the others keep their own", () => {
    const onet = entryById("onet") as LicenceEntry;
    const [mine, other] = withCorpusCredits([onet, entryById("cip2020") as LicenceEntry], [line() as never]);
    expect([mine.attribution.notice, mine.attribution.terms_read]).toEqual(["A corpus line.", false]);
    expect(other).toBe(entryById("cip2020") as LicenceEntry);
    const read = withCorpusCredits([onet], [line({ terms_read: true }) as never])[0];
    expect(read.attribution.terms_read).toBe(true);
    const ccss = withCorpusCredits([entryById("ccss-math") as LicenceEntry], [line({ id: "credit-ccss", licence: "Common Core public licence" }) as never])[0];
    expect(ccss.attribution.notice).toBe("A corpus line. Links between standards come from the Coherence Map of Achieve the Core, whose authors dedicated it to the public domain under CC0 1.0.");
    expect(ccss.attribution.terms_read).toBe(true);
  });

  test("a missing line or a line under another licence fails the build", () => {
    const onet = entryById("onet") as LicenceEntry;
    expect(() => withCorpusCredits([onet], [])).toThrow(/names the credit line credit-onet-31/);
    expect(() => withCorpusCredits([onet], [line({ licence: "CC-BY-SA-4.0" }) as never])).toThrow(/its credit line credit-onet-31 says CC-BY-SA-4.0/);
  });

  test("a registry built from a credit table carries every named line, and a line with terms unread still shows in a set", async () => {
    const named = REGISTRY.filter((e) => e.attribution.credit).map((e) => ({ id: e.attribution.credit, credit_line: `Line for ${e.id}.`, licence: e.licence, licence_url: "https://example.org/terms", terms_read: false }));
    expect(named.length).toBeGreaterThanOrEqual(7);
    const registry = await corpusRegistry(memoryTables({ attributions: [...named, { id: "", credit_line: "ignored" }] as Row[] }));
    expect(entryById("onet", registry)?.attribution.notice).toBe("Line for onet.");
    const set = assembleRowSet([fixtureDraft({ rows: [{ key: "one", title: "T", sub: "", group: "a", source: "onet" }] })], fixtureContext({ registry }))[0];
    expect(set.attributions).toEqual([{ source: "O*NET 31.0 Database, USDOL/ETA", url: "https://www.onetcenter.org/database.html", licence: "CC-BY-4.0", rows: 1, notice: "Line for onet.", termsRead: false }]);
    await expect(corpusRegistry(memoryTables({}))).rejects.toThrow(/names the credit line/);
  });
});
