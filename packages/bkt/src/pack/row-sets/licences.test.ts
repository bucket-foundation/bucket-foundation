import { beforeAll, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { assembleRowSet, type RowDraft } from "./contract";
import { buildRowSetPack, fileTables, TABLES_DIR, type RowSetPack } from "./index";
import { entryById, FEDERAL, MATCH_ORDER, matchValue, OPEN_K12_SYSTEMS, publicSource, REGISTRY, registryProblems, resolveSource, strictest, UNKNOWN, type LicenceEntry, type Row } from "./licences";
import { FIXTURE_REGISTRY, fixtureContext, fixtureDraft } from "./test-fixtures";

const REPO = resolve(import.meta.dir, "../../../../..");
const TABLES = join(REPO, TABLES_DIR);

describe("the licence registry", () => {
  test("holds no clash, no unranked licence and no public source without a notice", () => {
    expect(registryProblems()).toEqual([]);
    expect(registryProblems(FIXTURE_REGISTRY)).toEqual([]);
  });

  test("names each fault of a broken registry", () => {
    const base = REGISTRY[0];
    const broken: LicenceEntry[] = [
      base,
      { ...base, id: "twin", match: { scheme: ["cip2020"] } },
      { ...base, id: "no-rank", match: { system: ["x"] }, licence: "All rights reserved" },
      { ...base, id: "literal", match: { source_licence: ["unknown"] } },
      { ...base, id: "nothing", match: {} },
      { ...base, id: "bare", match: { system: ["y"] }, attribution: { source: "", url: "", notice: "" } },
      { ...base, id: "open-none", match: { system: ["z"] }, public: "none" },
      { ...base, id: "alike", match: { system: ["w"] }, licence: "CC-BY-SA-4.0", share_alike: false },
      { ...base, id: UNKNOWN, match: { system: ["v"] } },
    ];
    const text = registryProblems(broken).join("\n");
    for (const part of ["twin: scheme=cip2020 is also claimed by cip2020", "no-rank: licence All rights reserved has no rank", "literal: source_licence=unknown would match rows with no value", "nothing: matches nothing", "bare: a public source needs a name, a link and a notice", "open-none: public none disagrees", "alike: share_alike disagrees", "unknown: bad id"]) expect(text).toContain(part);
  });

  test("tests a row in the stated order and the first match wins", () => {
    expect([...MATCH_ORDER]).toEqual(["licence", "source_licence", "system", "slice", "host", "scheme", "table"]);
    const registry: LicenceEntry[] = MATCH_ORDER.map((key) => ({ ...FIXTURE_REGISTRY[0], id: `by-${key.replace("_", "-")}`, match: { [key]: [key === "host" ? "example.org" : key === "table" ? "things" : "v"] } }));
    const row: Row = { licence: "v", source_licence: "v", system: "v", slice: "v", source_url: "https://example.org/a", scheme: "v" };
    const order = ["licence", "source_licence", "system", "slice", "source_url", "scheme"];
    const seen: string[] = [];
    for (let i = 0; i <= order.length; i++) {
      seen.push(resolveSource("things", row, registry));
      delete row[order[i]];
    }
    expect(seen).toEqual(["by-licence", "by-source-licence", "by-system", "by-slice", "by-host", "by-scheme", "by-table"]);
    expect(resolveSource("other", {}, registry)).toBe(UNKNOWN);
  });

  test("a null value and the string unknown count as no value and fall through", () => {
    for (const blank of [null, undefined, "", "unknown", "Unknown", " unknown ", 7]) {
      expect(matchValue("source_licence", "progression", { source_licence: blank })).toBeNull();
      expect(resolveSource("progression", { source_licence: blank, system: "head-start-elof", slice: "k12-full" })).toBe("head-start-elof");
      expect(resolveSource("progression", { source_licence: blank, system: "texas-teks", slice: "k12-full" })).toBe("k12-restricted");
      expect(resolveSource("progression", { source_licence: blank, system: blank, slice: blank, source_url: blank })).toBe(UNKNOWN);
    }
    expect(matchValue("host", "t", { source_url: "not a url" })).toBeNull();
    expect(matchValue("host", "t", { source_url: "https://WWW.BLS.gov/oes/tables.htm" })).toBe("www.bls.gov");
    expect(resolveSource("frameworks", { source_url: "https://www.bls.gov/ooh/" })).toBe(UNKNOWN);
  });

  test("a row with no match resolves to unknown and is no public row", () => {
    expect(resolveSource("courses", { id: "x", source_url: "https://catalog.example.edu/course" })).toBe(UNKNOWN);
    expect(publicSource("courses", { id: "x", source_url: "https://catalog.example.edu/course" })).toBeNull();
    expect(publicSource("activities", { scheme: "OCM", source_url: "https://hraf.yale.edu/ocm.pdf" })).toBeNull();
    expect(publicSource("activities", { scheme: "ICATUS 2016" })).toBeNull();
    expect(resolveSource("occupation_history", { scheme: "census-1990", source_url: "https://usa.ipums.org/usa/resources/chapter4/occ_90-00.xls" })).toBe("ipums");
    expect(publicSource("occupation_history", { scheme: "census-1990", source_url: "https://usa.ipums.org/usa/resources/chapter4/occ_90-00.xls" })).toBeNull();
    expect(publicSource("occupation_history", { scheme: "soc", source_url: "https://USA.IPUMS.ORG/x" })).toBeNull();
    expect(publicSource("occupation_history", { scheme: "census-2018", source_url: "https://www2.census.gov/list.xlsx" })).toBe("census-occupations");
    expect(publicSource("activities", { scheme: "ATUS lexicon 2003-2023" })).toBe("atus");
  });

  test("the strictest licence labels a set, and a share-alike row labels the whole set", () => {
    const pick = (...ids: string[]) => ids.map((id) => entryById(id, FIXTURE_REGISTRY) as LicenceEntry);
    expect(strictest(pick("open"))).toBe(FEDERAL);
    expect(strictest(pick("open", "by"))).toBe("CC-BY-4.0");
    expect(strictest(pick("by", "alike", "open"))).toBe("CC-BY-SA-4.0");
    expect(() => strictest([])).toThrow();
    const rows: RowDraft[] = ["open", "by", "alike"].map((source) => ({ key: source, title: source, sub: "", group: "a", source }));
    const set = assembleRowSet([fixtureDraft({ rows })], fixtureContext())[0];
    expect(set.licence).toBe("CC-BY-SA-4.0");
    expect(set.attributions.find((a) => a.licence === "CC-BY-SA-4.0")?.rows).toBe(1);
  });
});

describe("the source tables", () => {
  const bySource: Record<string, Record<string, number>> = {};
  const k12: Record<string, { rows: number; open: number }> = {};
  let literalUnknown = 0;
  let pack: RowSetPack;

  beforeAll(async () => {
    const tables = fileTables(TABLES);
    const names = readdirSync(TABLES).filter((f) => /\.jsonl(\.zst)?$/.test(f)).map((f) => f.replace(/\.jsonl(\.zst)?$/, "")).sort();
    for (const name of names) {
      const counts: Record<string, number> = {};
      for await (const row of tables.rows(name)) {
        const source = resolveSource(name, row);
        counts[source] = (counts[source] ?? 0) + 1;
        if (name === "progression" && row.slice === "k12-full") {
          const system = String(row.system);
          k12[system] ??= { rows: 0, open: 0 };
          k12[system].rows++;
          if (publicSource(name, row)) k12[system].open++;
          if (row.source_licence === "unknown") literalUnknown++;
        }
      }
      bySource[name] = counts;
    }
    pack = await buildRowSetPack(REPO);
  }, 120_000);

  test("every row of every table resolves to one registry entry or to unknown", () => {
    const ids = new Set([...REGISTRY.map((e) => e.id), UNKNOWN]);
    expect(Object.keys(bySource)).toEqual(["activities", "assessments", "backbone_codes", "books", "cip_soc_crosswalk", "courses", "cycles", "edges", "frameworks", "occupation_history", "programs", "progression", "resources", "soc_isco_crosswalk", "technologies"]);
    for (const counts of Object.values(bySource)) for (const id of Object.keys(counts)) expect(ids.has(id)).toBe(true);
    const { ipums = 0, ...cleared } = bySource.occupation_history;
    expect(cleared).toEqual({ soc2018: 1020, onet: 1611, "census-occupations": 665 });
    expect([0, 698]).toContain(ipums);
    expect(bySource.cip_soc_crosswalk).toEqual({ cip2020: 5723 });
    expect(bySource.backbone_codes).toEqual({ cip2020: 2848, soc2018: 1447, onet: 1016 });
    expect(bySource.courses).toEqual({ [UNKNOWN]: 25908 });
    expect(bySource.activities["hraf-ocm"]).toBe(736);
    expect(bySource.activities.icatus).toBe(230);
    expect(bySource.activities.atus).toBe(556);
  });

  test("the 31 restricted K-12 systems yield zero public rows, and the three open systems yield 3,141", () => {
    const systems = Object.keys(k12);
    expect(systems).toHaveLength(34);
    const open = systems.filter((s) => k12[s].open > 0).sort();
    expect(open).toEqual([...OPEN_K12_SYSTEMS].sort());
    for (const s of open) expect(k12[s].open).toBe(k12[s].rows);
    expect(open.reduce((sum, s) => sum + k12[s].rows, 0)).toBe(3141);
    const restricted = systems.filter((s) => !open.includes(s));
    expect(restricted).toHaveLength(31);
    expect(restricted.reduce((sum, s) => sum + k12[s].open, 0)).toBe(0);
    expect(restricted.reduce((sum, s) => sum + k12[s].rows, 0)).toBe(58039);
    expect(literalUnknown).toBe(23036);
    expect(bySource.progression["k12-restricted"]).toBe(58039);
  });

  test("a set built from K-12 rows holds hits of the open systems alone", () => {
    const rows: Row[] = [
      { id: "elof-1", slice: "k12-full", system: "head-start-elof", source_licence: "US federal work, public domain, Office of Head Start" },
      { id: "acara-1", slice: "k12-full", system: "australia-v9", source_licence: "CC BY 4.0, copyright ACARA" },
      { id: "eng-1", slice: "k12-full", system: "england-nc", source_licence: "Open Government Licence v3.0" },
      { id: "teks-1", slice: "k12-full", system: "texas-teks", source_licence: "Texas Administrative Code Title 19, state rule" },
      { id: "ccss-1", slice: "k12-full", system: "ccss-math", source_licence: "unknown" },
      { id: "ap-1", slice: "k12-full", system: "ap-college-board", source_licence: "copyright College Board; unit and topic titles only", source_url: "https://www.bls.gov/borrowed-host", scheme: "soc2018" },
      { id: "none-1", slice: "k12-full", system: null, source_licence: null },
    ];
    const kept = rows.flatMap((row): RowDraft[] => {
      const source = publicSource("progression", row);
      return source ? [{ key: String(row.id), title: String(row.id), sub: "", group: "a", source }] : [];
    });
    expect(kept.map((r) => r.key)).toEqual(["elof-1", "acara-1", "eng-1"]);
    const set = assembleRowSet([fixtureDraft({ rows: kept })], fixtureContext({ registry: REGISTRY }))[0];
    expect(set.sources).toEqual(["head-start-elof", "australia-v9", "england-nc"]);
    expect(set.n).toBe(3);
    const forced: RowDraft[] = [{ key: "teks-1", title: "teks-1", sub: "", group: "a", source: "k12-restricted" }];
    expect(() => assembleRowSet([fixtureDraft({ rows: forced })], fixtureContext({ registry: REGISTRY }))).toThrow(/rule 7/);
  });

  test("unknown and restricted rows are absent from every public set", () => {
    expect(pack.sets.length).toBeGreaterThan(0);
    for (const set of pack.sets) {
      expect(set.audience).toBe("public");
      for (const page of set.pages) {
        expect(page.audience).toBe("public");
        expect(page.sources).not.toContain(UNKNOWN);
        expect(page.licences).not.toContain("restricted");
        for (const source of page.sources) expect(entryById(source)?.public).toBe("rows");
        page.si.forEach((s, i) => expect(page.licences[page.li[i]]).toBe((entryById(page.sources[s]) as LicenceEntry).licence));
        expect(page.attributions.every((a) => a.url.startsWith("https://") && a.notice.length > 0)).toBe(true);
      }
    }
  });

  test("occupations carry the O*NET licence as a whole and major to career stays a federal work", () => {
    const licences = Object.fromEntries(pack.sets.map((s) => [s.id, [...new Set(s.pages.map((p) => p.licence))]]));
    expect(licences).toEqual({ "occupations-time": ["CC-BY-4.0"], "major-to-career": [FEDERAL] });
  });
});
