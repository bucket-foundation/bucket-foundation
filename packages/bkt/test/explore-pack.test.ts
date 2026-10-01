import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findKruse, kruseMarkers } from "../scripts/check-no-kruse";
import { findStaff } from "../scripts/check-no-staff";
import { assembleExplore, buildExplorePack, deniedSourceMarkers, describeExploreCounts, EXPLORE_LICENCES, EXPLORE_PACK_BUDGET_BYTES, readExploreInputs, SOURCES_FILE, splitSources, type ExploreInputs } from "../src/pack/explore";
import { buildDenylist, type Denylist } from "../src/pack/rights";
import { SOURCE_TYPE, sourceUrl, type SourceIndex } from "../../../src/lib/explore/source-index";
import sampleReview from "../../../src/lib/explore/fixtures/advisors.sample.json";

const REPO = resolve(import.meta.dir, "../../..");
const DENIED_ID = "AAAAAAAAAAA";
const CLEAN_ID = "BBBBBBBBBBB";
const OWNER = ["Kr", "use"].join("");
const deny: Denylist = { videoIds: new Set([DENIED_ID]), prefixes: [], files: new Set(), unreadable: new Set() };

const pack = buildExplorePack(REPO);
const web = JSON.parse(readFileSync(join(REPO, SOURCES_FILE), "utf8")) as SourceIndex;

const index: SourceIndex = {
  v: 1,
  items: [
    ["y", DENIED_ID, "A talk on light and water in the cell", 2021, "a description", "Some Channel"],
    ["y", CLEAN_ID, "A lecture on entropy", 2019, "body text that stays behind", "A Lecturer"],
    ["y", "CCCCCCCCCCC", `An hour with Dr ${OWNER}`, 2020, "", "Host"],
    ["p", "100", "Photon statistics", 1992, "Physical review", "S Author"],
  ],
};

function inputs(over: Partial<ExploreInputs> = {}): ExploreInputs {
  return { ...readExploreInputs(REPO), index, timeline: { events: [{ id: "light", year: 1905 }, { id: OWNER.toLowerCase(), title: "a marker", year: 2020 }] }, ...over };
}

describe("explore rights filter", () => {
  test("a row goes by video id or by the denied name, and a kept row loses its body text", () => {
    const split = splitSources(index, deny);
    expect(split.denied.map((d) => [d.row[1], d.why])).toEqual([[DENIED_ID, "video"], ["CCCCCCCCCCC", "text"]]);
    expect(split.kept).toEqual([["y", CLEAN_ID, "A lecture on entropy", 2019, "A Lecturer"], ["p", "100", "Photon statistics", 1992, "S Author"]]);
    expect(deniedSourceMarkers(split)).toContain(DENIED_ID);
    expect(deniedSourceMarkers(split)).toContain("A talk on light and water in the cell");
  });

  test("the assembled pack counts what it removed and drops denied timeline ids", () => {
    const p = assembleExplore(inputs(), deny);
    expect(p.counts.sources).toMatchObject({ total: 4, kept: 2, denied: { video: 1, text: 1 }, deniedByKind: { y: 2 }, keptByKind: { y: 1, p: 1 } });
    expect(p.years).toEqual({ light: 1905 });
    expect(p.licences.map((l) => [l.kind, l.works])).toEqual([["p", 1], ["y", 1]]);
    expect(JSON.stringify(p.sources)).not.toContain("body text that stays behind");
  });

  test("the build stops on a row of an unknown kind and on denied material that survives", () => {
    expect(() => splitSources({ v: 1, items: [["z" as "y", "1", "t", null, "", ""]] }, deny)).toThrow(/no licence row/);
    const founding = { ...inputs().foundingWorks, rows: [{ basis: `a book by ${OWNER}` }] };
    expect(() => assembleExplore(inputs({ foundingWorks: founding }), deny)).toThrow(/denied rows left in the explore pack/);
    const basis = inputs().referenceBasis;
    expect(() => assembleExplore(inputs({ referenceBasis: { ...basis, stop_words: [OWNER.toLowerCase()] } }), deny)).toThrow(/reference basis/);
    const twin: SourceIndex = { v: 1, items: [...index.items, ["o", "W9", "A talk on light and water in the cell", 2021, "", "Other"]] };
    expect(() => assembleExplore(inputs({ index: twin }), deny)).toThrow(/quotes a denied row/);
  });
});

describe("explore pack on this repo", () => {
  test("the filter's counts", () => {
    for (const l of describeExploreCounts(pack.counts)) console.log(l);
    const s = pack.counts.sources;
    expect(s.total).toBe(web.items.length);
    expect(s.total).toBe(11619);
    expect(s.kept).toBe(11452);
    expect(s.denied).toEqual({ prefix: 0, video: 167, path: 0, file: 0, text: 0 });
    expect(s.deniedByKind).toEqual({ o: 0, p: 0, a: 0, g: 0, w: 0, y: 167, d: 0 });
    expect(pack.counts.videoIds).toBe(167);
    expect(pack.counts.years).toEqual({ total: 114, kept: 112 });
    expect(pack.counts.foundingWorks).toBe(40);
    expect(pack.sources.length).toBe(s.kept);
  });

  test("every row is a kind, an id, a title, a year and authors, with a link and no body text", () => {
    const webRows = new Map(web.items.map((r) => [`${r[0]}/${r[1]}`, r]));
    expect(web.items.filter((r) => r[4].length >= 40).length).toBeGreaterThan(1000);
    expect(pack.sources.filter((r) => !(r[0] in SOURCE_TYPE) || !r[1] || typeof r[2] !== "string" || !(r[3] === null || typeof r[3] === "number") || typeof r[4] !== "string")).toEqual([]);
    expect(pack.sources.filter((r) => !/^https:\/\//.test(sourceUrl(r[0], r[1]) ?? ""))).toEqual([]);
    expect(
      pack.sources.filter((r) => {
        const w = webRows.get(`${r[0]}/${r[1]}`);
        return !w || JSON.stringify(r) !== JSON.stringify([w[0], w[1], w[2], w[3], w[5]]);
      }),
    ).toEqual([]);
  });

  test("the pack carries a version, a matching digest, a licence row per kind and stays in budget", () => {
    expect(pack.version).toBe(pack.sha256.slice(0, 12));
    expect(buildExplorePack(REPO).sha256).toBe(pack.sha256);
    expect(pack.licences.map((l) => l.kind).sort()).toEqual(Object.keys(EXPLORE_LICENCES).sort());
    expect(pack.licences.reduce((n, l) => n + l.works, 0)).toBe(pack.sources.length);
    expect(pack.licences.filter((l) => !l.terms || !/^https:\/\//.test(l.url ?? ""))).toEqual([]);
    expect(Buffer.byteLength(JSON.stringify(pack))).toBeLessThan(EXPLORE_PACK_BUDGET_BYTES);
    expect(pack.foundingWorks.rows.length).toBe(40);
    expect(pack.referenceBasis.vocab.length).toBe(pack.referenceBasis.idf.length);
  });

  test("the built pack passes the denied-material and staff checks, and a planted row fails them", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-explore-scan-"));
    try {
      const markers = kruseMarkers(REPO);
      const removed = splitSources(web, buildDenylist(REPO)).denied;
      expect(removed.length).toBe(167);
      for (const d of removed) expect(markers).toContain(d.row[1]);
      writeFileSync(join(dir, "explore.json"), JSON.stringify(pack));
      expect(findKruse([dir], markers)).toEqual([]);
      expect(findStaff([dir])).toEqual([]);
      writeFileSync(join(dir, "leak.json"), JSON.stringify({ sources: [removed[0].row] }));
      expect(findKruse([dir], markers).map((h) => h.file)).toContain(join(dir, "leak.json"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  test("no sample advisor is in the pack", () => {
    const text = JSON.stringify(pack);
    const names = (sampleReview as { rows: { name: string }[] }).rows.map((r) => r.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => text.includes(n))).toEqual([]);
  });
});
