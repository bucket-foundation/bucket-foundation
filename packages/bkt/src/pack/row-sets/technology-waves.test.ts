import { describe, expect, test } from "bun:test";
import { checkRows, hitIds, packedBytes, REPLY_BYTES, rowKeys } from "./contract";
import { checkCaps, memoryTables } from "./index";
import type { Row } from "./licences";
import { technologyWaves, TECHNOLOGY_WAVES_ID, TRAINING_FIELD, yearLabel } from "./technology-waves";
import { repoFixtureContext } from "./test-fixtures";

const ctx = repoFixtureContext();
const WD = "https://www.wikidata.org/wiki/";
const WP = "https://en.wikipedia.org/wiki/";

const tech = (id: string, name: string, kind: string, wave: string | null, from: number | null, to: number | null, url: string, verified: boolean, evidence: string, field: string | null = "computing"): Row => ({
  id, slice: "history-technology", name, kind, field, wave, era_from: from, era_to: to, source_url: url, verified, evidence, classes: ["invention"],
});

const TECHNOLOGIES: Row[] = [
  tech("w00-foraging-toolkit", "Foraging toolkit", "wave", null, -3300000, -10001, `${WP}General-purpose_technology`, true, "curated-source", null),
  tech("w10-electronics", "Electronics and mainframes", "wave", null, 1945, 1970, `${WP}Kondratiev_wave`, true, "curated-source", null),
  tech("w13-machine-learning", "Machine learning", "wave", null, 2012, null, "https://arxiv.org/abs/2303.10130", true, "curated-source", null),
  tech("ht-core-stone-tools", "Stone tools", "technology", "w00-foraging-toolkit", -3300000, null, `${WD}Q1`, true, "curated-source", "materials"),
  tech("ht-core-transistor", "Transistor", "technology", "w10-electronics", 1947, null, `${WD}Q5339`, true, "curated-source"),
  tech("ht-core-laser", "Laser", "technology", "w10-electronics", 1960, null, `${WD}Q38867`, false, "curated-source"),
  tech("ht-wd-q68", "computer", "technology", "w10-electronics", 1945, null, `${WD}Q68`, false, "wikidata-id-only"),
  tech("ht-wd-q11016", "integrated circuit", "technology", "w10-electronics", 1958, null, `${WD}Q11016`, false, "wikidata-id-only"),
  tech("ht-wd-q2539", "machine learning model", "technology", "w13-machine-learning", 2012, null, `${WD}Q2539`, false, "wikidata-id-only"),
  tech("ht-wd-no-wave", "orphan item", "technology", null, 1900, null, `${WD}Q9`, false, "wikidata-id-only"),
  tech("ht-wd-no-year", "undated item", "technology", "w10-electronics", null, null, `${WD}Q8`, false, "wikidata-id-only"),
  tech("ht-other-host", "Borrowed item", "technology", "w10-electronics", 1950, null, "https://example.org/page", true, "curated-source"),
  tech("ht-no-link", "Unlinked item", "technology", "w10-electronics", 1950, null, "", true, "curated-source"),
];

const response = (id: string, name: string, from: number, url: string, verified = true, over: Row = {}): Row => ({
  id, slice: "history-technology", name, field: TRAINING_FIELD, region_raw: "United States", era_from: from, era_to: null, url, verified,
  notes: "A sentence written about this response. It stays out of the pack.", ...over,
});

const FRAMEWORKS: Row[] = [
  response("ht-tr-mit", "Massachusetts Institute of Technology", 1861, `${WD}Q49108`),
  response("ht-tr-bootcamps", "First coding bootcamps", 2011, `${WP}Coding_bootcamp`, false),
  response("ht-tr-archives", "National Apprenticeship Act", 1937, "https://www.archives.gov/milestone-documents"),
  response("fw-other", "Some framework", 1990, `${WD}Q7`, true, { slice: "school", field: "mathematics" }),
];

const tables = () => memoryTables({ technologies: TECHNOLOGIES, frameworks: FRAMEWORKS });

describe("technology waves", () => {
  test("a fixture gives a stable sha256", async () => {
    const pages = await technologyWaves(tables(), ctx);
    expect((await technologyWaves(tables(), ctx)).map((p) => p.sha256)).toEqual(pages.map((p) => p.sha256));
    expect(pages[0].sha256).toBe("8d80a402e2d0077e69d8415f1574db8c2006390f02b1db7a6d846486f45d0b62");
  });

  test("waves, curated technologies and training responses open the set, checked and unchecked apart", async () => {
    const [opening] = await technologyWaves(tables(), ctx);
    expect(opening.id).toBe(TECHNOLOGY_WAVES_ID);
    expect(rowKeys(opening)).toEqual(["w00-foraging-toolkit", "w10-electronics", "w13-machine-learning", "ht-core-stone-tools", "ht-core-transistor", "ht-core-laser", "ht-tr-mit", "ht-tr-bootcamps"]);
    expect(opening.gi.map((g) => opening.groups[g].id)).toEqual(["wave", "wave", "wave", "checked", "checked", "curated", "training", "training"]);
    expect(opening.groups.map((g) => g.label)).toEqual(["Waves", "Technologies checked against a source", "Curated technologies, unchecked", "Training responses"]);
    expect(opening.frame.verified).toEqual([true, true, true, true, true, false, true, false]);
    expect(opening.sub.slice(0, 3)).toEqual(["3,300,000 BCE to 10,001 BCE", "1945 to 1970", "from 2012"]);
    expect(opening.sub[6]).toBe("United States");
    expect(opening.frame.from).toEqual([-3300000, 1945, 2012, -3300000, 1947, 1960, 1861, 2011]);
    expect(opening.frame.to).toEqual([-10001, 1970, null, null, null, null, null, null]);
    expect(opening.frame.axis).toEqual({ from: -3300000, to: 2025, scale: "log", unit: "year" });
    expect(opening.frame.drill).toEqual({ param: "group", values: ["w10-electronics", "w13-machine-learning"] });
    expect(opening.links.every((l) => l.length === 0)).toBe(true);
    expect([opening.modes, opening.audience, opening.licence]).toEqual([["timeline"], "public", "CC-BY-SA-4.0"]);
    expect(opening.sources).toEqual(["wikipedia", "arxiv", "wikidata"]);
    expect(opening.attributions.map((a) => a.url)).toEqual(["https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use", "https://info.arxiv.org/help/api/tou.html", "https://www.wikidata.org/wiki/Wikidata:Licensing"]);
    expect(hitIds(opening)[4]).toBe("row:technology-waves:ht-core-transistor");
    expect(JSON.stringify(opening)).not.toContain("A sentence written");
  });

  test("a wave opens its unchecked Wikidata items, each marked unchecked and under CC0", async () => {
    const [, electronics, learning] = await technologyWaves(tables(), ctx);
    expect(rowKeys(electronics)).toEqual(["ht-wd-q68", "ht-wd-q11016"]);
    expect(rowKeys(learning)).toEqual(["ht-wd-q2539"]);
    for (const page of [electronics, learning]) {
      expect(page.groups).toEqual([{ id: "wikidata", label: "Wikidata items, unchecked", color: "#6b6252" }]);
      expect(page.frame.verified?.every((v) => v === false)).toBe(true);
      expect(page.licences).toEqual(["CC0-1.0"]);
      expect(page.licence).toBe("CC-BY-SA-4.0");
      expect(page.url.every((u) => u?.startsWith(WD))).toBe(true);
    }
  });

  test("a row with no cleared source, no year, no wave or no link stays out", async () => {
    const pages = await technologyWaves(tables(), ctx);
    const keys = pages.flatMap(rowKeys);
    for (const out of ["ht-wd-no-wave", "ht-wd-no-year", "ht-other-host", "ht-no-link", "ht-tr-archives", "fw-other"]) expect(keys).not.toContain(out);
    expect(keys).toHaveLength(11);
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

  test("no technology rows give a set with no hits", async () => {
    const [opening] = await technologyWaves(memoryTables({ technologies: [] }), ctx);
    expect([opening.n, opening.frame.axis, opening.frame.drill]).toEqual([0, null, { param: "group", values: [] }]);
  });
});
