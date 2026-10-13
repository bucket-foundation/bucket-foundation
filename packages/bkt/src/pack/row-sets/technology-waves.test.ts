import { describe, expect, test } from "bun:test";
import { checkRows, hitIds, packedBytes, REPLY_BYTES, rowKeys } from "./contract";
import { checkCaps, memoryTables } from "./index";
import type { Row } from "./licences";
import { figureUrl, lagLine, lagSource, occupationKey, STAFF_ONLY_EVIDENCE, technologyWaves, TECHNOLOGY_WAVES_ID, yearLabel } from "./technology-waves";
import { repoFixtureContext } from "./test-fixtures";

const ctx = repoFixtureContext();
const WD = "https://www.wikidata.org/wiki/";
const WP = "https://en.wikipedia.org/wiki/";
const BLS = "https://www.bls.gov/opub/mlr/2016/article/x.htm";

const tech = (id: string, name: string, kind: string, wave: string | null, from: number | null, to: number | null, url: string, verified: boolean, evidence: string | null, field: string | null = "computing"): Row => ({
  id, slice: "history-technology", name, kind, field, wave, era_from: from, era_to: to, source_url: url, verified, evidence, classes: ["invention"],
});

const TECHNOLOGIES: Row[] = [
  tech("w00-foraging-toolkit", "Foraging toolkit", "wave", null, -3300000, -10001, `${WP}General-purpose_technology`, true, "curated-source", null),
  tech("w10-electronics", "Electronics and mainframes", "wave", null, 1945, 1970, `${WP}Kondratiev_wave`, true, "curated-source", null),
  tech("w13-machine-learning", "Machine learning", "wave", null, 2012, null, "https://arxiv.org/abs/2303.10130", true, "curated-source", null),
  tech("ht-core-telephone", "Telephone", "technology", "w08", 1876, null, `${WD}Q11035`, true, "curated-source", "communication"),
  tech("ht-core-exchange", "Automatic telephone exchange", "technology", "w08", 1891, null, `${WD}Q1`, true, "curated-source", "communication"),
  tech("ht-core-laser", "Laser", "technology", "w10-electronics", 1960, null, `${WD}Q38867`, false, "curated-source"),
  tech("ht-wd-q68", "computer", "technology", "w10-electronics", 1945, null, `${WD}Q68`, false, "wikidata-id-only"),
  tech("ht-wd-q2539", "machine learning model", "technology", "w13-machine-learning", 2012, null, `${WD}Q2539`, true, "wikidata-id-only"),
  tech("ht-wd-no-year", "undated item", "technology", "w10-electronics", null, null, `${WD}Q8`, false, "wikidata-id-only"),
  tech("ht-no-evidence", "Unmarked item", "technology", "w10-electronics", 1950, null, `${WD}Q7`, true, null),
  tech("ht-other-host", "Borrowed item", "technology", "w10-electronics", 1950, null, "https://example.org/page", true, "curated-source"),
  tech("ht-no-link", "Unlinked item", "technology", "w10-electronics", 1950, null, "", true, "curated-source"),
];

const response = (id: string, name: string, year: number | null, url: string, technology: string | null, verified = true): Row => ({
  id, slice: "history-technology", technology_id: technology, wave: "w08", name, kind: "institute", country: "United States", region: "US", year, lag_years: 3, source_url: url, verified,
});

const RESPONSES: Row[] = [
  response("tech-tr-ire", "Institute of Radio Engineers", 1912, `${WD}Q1`, "ht-core-telephone"),
  response("tech-tr-bootcamps", "First coding bootcamps", 2011, `${WP}Coding_bootcamp`, "ht-core-laser", false),
  response("tech-tr-loose", "Loose response", 1900, `${WD}Q2`, "ht-wd-q68"),
  response("tech-tr-archives", "National Apprenticeship Act", 1937, "https://www.archives.gov/milestone-documents", null),
  response("tech-tr-undated", "Undated response", null, `${WD}Q3`, null),
];

const occupation = (id: string, technology: string, name: string, relation: string, year: number | null, url: string, verified: boolean, type = "primary"): Row => ({
  id, slice: "history-technology", technology_id: technology, occupation: name, relation, year, years_after_technology: 2, source_type: type, source_url: url, verified,
});

const CASES: Row[] = [
  occupation("tech-occ-001", "ht-core-telephone", "telephone operator", "created", 1878, `${WP}Switchboard_operator`, true, "pointer"),
  occupation("tech-occ-002", "ht-core-exchange", "telephone operator", "shrank", 1920, BLS, true),
  occupation("tech-occ-010", "ht-core-laser", "ipums counter", "shrank", 1990, "https://usa.ipums.org/usa/resources/chapter4/occ_90-00.xls", true),
  occupation("tech-occ-003", "ht-core-exchange", "telephone operator", "shrank", 1950, BLS, true),
  occupation("tech-occ-004", "ht-core-laser", "laser technician", "created", 1965, BLS, false, "memory"),
  occupation("tech-occ-005", "ht-core-laser", "paper author", "expanded", 1970, "https://www.nber.org/papers/w1", true),
  occupation("tech-occ-006", "ht-core-laser", "chart maker", "expanded", 1970, "https://ourworldindata.org/grapher/x", true),
  occupation("tech-occ-007", "ht-wd-q68", "computer operator", "created", 1950, BLS, true),
  occupation("tech-occ-008", "ht-core-laser", "odd relation", "rumoured", 1970, BLS, true),
  occupation("tech-occ-009", "ht-core-laser", "undated trade", "created", null, BLS, true),
];

const lag = (id: string, technology: string | null, name: string | null, measure: string, years: number, to: number | null, over: Row = {}): Row => ({
  id, slice: "history-technology", row_type: "case", technology_id: technology, occupation: name, measure, from_year: 1876, to_year: to, lag_years: years, n: 1, basis: "A basis sentence that stays out. It names 89,185 workers.", verified: true, ...over,
});

const LAGS: Row[] = [
  lag("tech-lag-001", "ht-core-telephone", "telephone operator", "invention to peak share of employment", 74, 1990),
  lag("tech-lag-002", "ht-core-exchange", "telephone operator", "displacing invention to first mass displacement", 29, 1920),
  lag("tech-lag-003", "ht-core-exchange", "telephone operator", "a later measure for the same pair", 59, 1950),
  lag("tech-lag-004", "ht-core-laser", "laser technician", "invention to first count", 5, 1965, { source_url: "https://usa.ipums.org/usa/resources/chapter4/occ_90-00.xls" }),
  lag("tech-lag-005", "ht-core-laser", "paper author", "invention to peak count", 30, 1970),
  lag("tech-lag-summary-01", null, null, "invention to peak employment", 60, null, { row_type: "summary", n: 2 }),
];

const tables = () => memoryTables({ technologies: TECHNOLOGIES, tech_training_response: RESPONSES, tech_occupation: CASES, tech_lags: LAGS });

describe("technology waves", () => {
  test("a fixture gives a stable sha256", async () => {
    const pages = await technologyWaves(tables(), ctx);
    expect((await technologyWaves(tables(), ctx)).map((p) => p.sha256)).toEqual(pages.map((p) => p.sha256));
    expect(pages[0].sha256).toBe("db448823d8615140b2bfeab6ea3a42e5cbb5bd56865b21f55e417de5b09f9ae4");
  });

  test("waves, curated technologies, training responses and changed occupations sit on one page, checked and unchecked apart", async () => {
    const pages = await technologyWaves(tables(), ctx);
    expect(pages).toHaveLength(1);
    const [opening] = pages;
    expect(opening.id).toBe(TECHNOLOGY_WAVES_ID);
    expect(rowKeys(opening)).toEqual(["w00-foraging-toolkit", "w10-electronics", "w13-machine-learning", "ht-core-telephone", "ht-core-exchange", "ht-core-laser", "tech-tr-ire", "tech-tr-bootcamps", "tech-tr-loose", "occ-laser-technician", "occ-telephone-operator"]);
    expect(opening.gi.map((g) => opening.groups[g].id)).toEqual(["wave", "wave", "wave", "checked", "checked", "curated", "training", "training", "training", "occupation", "occupation"]);
    expect(opening.frame.verified).toEqual([true, true, true, true, true, false, true, false, true, false, true]);
    expect(opening.sub.slice(0, 3)).toEqual(["3,300,000 BCE to 10,001 BCE", "1945 to 1970", "from 2012"]);
    expect(opening.sub[6]).toBe("United States");
    expect(opening.frame.axis).toEqual({ from: -3300000, to: 2025, scale: "log", unit: "year" });
    expect(opening.frame.drill).toBeNull();
    expect([opening.modes, opening.audience, opening.licence]).toEqual([["timeline"], "public", "CC-BY-SA-4.0"]);
    expect(hitIds(opening)[3]).toBe("row:technology-waves:ht-core-telephone");
    expect(JSON.stringify(opening)).not.toContain("A basis sentence");
  });

  test("a case links its occupation to the technology, stated when checked and inferred when written from memory", async () => {
    const [opening] = await technologyWaves(tables(), ctx);
    const at = (key: string) => rowKeys(opening).indexOf(key);
    const stated = opening.frame.edgeStated as boolean[][];
    expect(opening.links[at("occ-telephone-operator")]).toEqual([at("ht-core-telephone"), at("ht-core-exchange")]);
    expect(stated[at("occ-telephone-operator")]).toEqual([true, true]);
    expect(opening.links[at("occ-laser-technician")]).toEqual([at("ht-core-laser")]);
    expect(stated[at("occ-laser-technician")]).toEqual([false]);
    expect(opening.frame.from?.[at("occ-telephone-operator")]).toBe(1878);
    expect(opening.sources[opening.si[at("occ-telephone-operator")]]).toBe("wikipedia");
    expect(opening.sources[opening.si[at("occ-laser-technician")]]).toBe("bls-publications");
    expect(opening.links[at("tech-tr-ire")]).toEqual([at("ht-core-telephone")]);
    expect(stated[at("tech-tr-ire")]).toEqual([true]);
    expect(stated[at("tech-tr-bootcamps")]).toEqual([false]);
    expect(opening.links[at("tech-tr-loose")]).toEqual([]);
    expect(opening.links.slice(0, 6).every((l) => l.length === 0)).toBe(true);
  });

  test("a lag prints with its n only when a case of the same pair and year gives it a source that is not IPUMS", async () => {
    const [opening] = await technologyWaves(tables(), ctx);
    const at = (key: string) => rowKeys(opening).indexOf(key);
    const operator = at("occ-telephone-operator");
    expect(opening.sub[operator]).toBe("created, shrank; displacing invention to first mass displacement: 29 years, n = 1");
    expect(opening.url[operator]).toBe(BLS);
    expect(opening.sources[opening.si[operator]]).toBe("wikipedia");
    expect(opening.sub[at("occ-laser-technician")]).toBe("created");
    const text = JSON.stringify(opening);
    for (const gone of ["invention to peak share of employment", "a later measure", "invention to first count", "invention to peak employment", "89,185", "ipums"]) expect(text).not.toContain(gone);
    expect(lagLine({ measure: "patent to first use", years: 1, n: 3 })).toBe("patent to first use: 1 year, n = 3");
    const credit = opening.attributions.find((a) => a.source === "Bucket Foundation, progressions corpus");
    expect([credit?.rows, credit?.licence, credit?.termsRead]).toEqual([1, "CC-BY-4.0", true]);
    expect(occupationKey("Telephone operator (manual)")).toBe("occ-telephone-operator-manual");
  });

  test("a figure needs a source address on record that IPUMS does not host", () => {
    const cases = [{ technology: "t", year: 1950, url: BLS }, { technology: "t", year: 1960, url: "https://usa.ipums.org/usa/x.xls" }, { technology: "u", year: 1950, url: BLS }];
    const row = (over: Row): Row => ({ technology_id: "t", to_year: 1950, ...over });
    expect(lagSource(row({}), cases)).toBe(BLS);
    expect(lagSource(row({ source_url: "https://www.bls.gov/oes/tables.htm" }), cases)).toBe("https://www.bls.gov/oes/tables.htm");
    expect(lagSource(row({ source_url: "https://usa.ipums.org/usa/x.xls" }), cases)).toBeNull();
    expect(lagSource(row({ source_url: "https://cps.ipums.org/x" }), cases)).toBeNull();
    expect(lagSource(row({ source_url: "" }), cases)).toBeNull();
    expect(lagSource(row({ to_year: 1960 }), cases)).toBeNull();
    expect(lagSource(row({ to_year: 1951 }), cases)).toBeNull();
    expect(lagSource(row({ to_year: null }), cases)).toBeNull();
    expect(lagSource(row({ technology_id: "v" }), cases)).toBeNull();
    expect(lagSource(row({}), [])).toBeNull();
    expect([figureUrl(BLS), figureUrl("http://www.bls.gov/x"), figureUrl("https://usa.ipums.org/x"), figureUrl("not a link"), figureUrl(null)]).toEqual([BLS, null, null, null, null]);
  });

  test("no public row has evidence wikidata-id-only, and no case of an uncleared source or unshipped technology draws", async () => {
    const pages = await technologyWaves(tables(), ctx);
    const keys = new Set(pages.flatMap(rowKeys));
    const staffOnly = TECHNOLOGIES.filter((r) => r.evidence === STAFF_ONLY_EVIDENCE).map((r) => String(r.id));
    expect(staffOnly).toHaveLength(3);
    for (const id of [...staffOnly, "ht-no-evidence", "ht-other-host", "ht-no-link", "tech-tr-archives", "tech-tr-undated", "occ-paper-author", "occ-chart-maker", "occ-computer-operator", "occ-odd-relation", "occ-undated-trade", "occ-ipums-counter"]) expect(keys.has(id)).toBe(false);
    expect(/nber\.org|ourworldindata|archives\.gov|"computer"|machine learning model/.test(JSON.stringify(pages))).toBe(false);
  });

  test("the rules and the caps hold, and years before the common era read as BCE", async () => {
    const pages = await technologyWaves(tables(), ctx);
    for (const page of pages) {
      checkRows(page, ctx);
      expect(packedBytes(page)).toBeLessThan(REPLY_BYTES);
    }
    checkCaps(TECHNOLOGY_WAVES_ID, pages);
    expect([yearLabel(-3300000), yearLabel(-1), yearLabel(0), yearLabel(1999)]).toEqual(["3,300,000 BCE", "1 BCE", "0", "1999"]);
  });

  test("technologies alone, with no case, lag or response table, still build, and no rows give an empty set", async () => {
    const [alone] = await technologyWaves(memoryTables({ technologies: TECHNOLOGIES }), ctx);
    expect(alone.n).toBe(6);
    expect(alone.frame.edgeStated ?? null).toBeNull();
    const [empty] = await technologyWaves(memoryTables({ technologies: [] }), ctx);
    expect([empty.n, empty.frame.axis, empty.frame.drill]).toEqual([0, null, null]);
  });
});
