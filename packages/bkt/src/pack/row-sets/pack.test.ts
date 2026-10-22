import { beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { hasEmail } from "../../../../../src/lib/research-os/advisor-review";
import { findKruse } from "../../../scripts/check-no-kruse";
import { findStaff, findStaffRowSets } from "../../../scripts/check-no-staff";
import { assertClean, buildDenylist } from "../rights";
import { figureUrl, occupationKey, STAFF_ONLY_EVIDENCE } from "./technology-waves";
import { assembleRowSet, checkRows, hitIds, packedBytes, pageCount, pageRows, REPLY_BYTES, REPLY_HITS, rowKey, rowKeys, rowSetText, SET_BYTES, type RowDraft } from "./contract";
import { assembleRowSetPack, buildRowSetPack, capWarnings, checkCaps, packWarnings, countryCodes, describeRowSets, fileTables, packBytes, publicPackProblems, readRowSetPack, replies, repoContext, reservedIds, ROW_SET_PACK_BUDGET_BYTES, ROW_SET_PACK_SCHEMA, setBytes, TABLES_DIR, WARN_SHARE, type RowSetPack } from "./index";
import { fixtureContext, fixtureDraft } from "./test-fixtures";

const REPO = resolve(import.meta.dir, "../../../../..");
const SEL = /^row:[a-z0-9-]{1,64}:[A-Za-z0-9._-]{1,160}$/;
const deny = buildDenylist(REPO);
let pack: RowSetPack;
const setOf = (id: string) => pack.sets.find((s) => s.id === id) as RowSetPack["sets"][number];

beforeAll(async () => {
  pack = await buildRowSetPack(REPO, deny);
}, 120_000);

describe("the public row set pack, built from the tables", () => {
  test("holds both sets under the set cap and the pack budget", () => {
    expect(pack.schema).toBe(ROW_SET_PACK_SCHEMA);
    expect(pack.sets.map((s) => s.id)).toEqual(["occupations-time", "major-to-career", "mathematics-chain", "technology-waves", "education-by-country", "coverage-by-country"]);
    for (const set of pack.sets) {
      expect(set.bytes).toBe(setBytes(set.pages));
      expect(set.bytes).toBeLessThan(SET_BYTES);
    }
    expect(SET_BYTES).toBe(768 * 1024);
    expect(ROW_SET_PACK_BUDGET_BYTES).toBe(1.25 * 1024 * 1024);
    expect(packBytes(pack)).toBeLessThan(ROW_SET_PACK_BUDGET_BYTES);
    expect(describeRowSets(pack)).toHaveLength(6);
    expect(pack.built).toMatch(/^tables-[0-9a-f]{12}$/);
  });

  test("every reply the route can return holds at most 600 hits in at most 128 KB", () => {
    expect([REPLY_HITS, REPLY_BYTES]).toEqual([600, 128 * 1024]);
    let seen = 0;
    for (const set of pack.sets) {
      for (const page of set.pages) {
        for (let i = 0; i < pageCount(page); i++) {
          const reply = pageRows(page, i);
          expect(reply.n).toBeLessThanOrEqual(REPLY_HITS);
          expect(packedBytes(reply)).toBeLessThanOrEqual(REPLY_BYTES);
          seen++;
        }
      }
      expect(replies(set.pages)).toHaveLength(set.pages.length);
    }
    expect(seen).toBe(119);
  });

  test("occupations open as 48 group hits: 22 SOC, 23 O*NET-SOC and 3 census lists", () => {
    const set = setOf("occupations-time");
    const [opening, ...groups] = set.pages;
    expect(opening.n).toBe(48);
    const keys = rowKeys(opening);
    expect(keys.filter((k) => k.startsWith("soc-"))).toHaveLength(22);
    expect(keys.filter((k) => k.startsWith("onet-soc-"))).toHaveLength(23);
    expect(keys.filter((k) => k.startsWith("census-"))).toEqual(["census-2002", "census-2010", "census-2018"]);
    expect(opening.frame.drill?.values).toEqual(keys);
    expect(groups).toHaveLength(48);
    expect(groups.reduce((sum, p) => sum + p.n, 0)).toBe(3296);
    expect(set.hits).toBe(3296 + 48);
    expect(opening.frame.weight).toEqual(groups.map((p) => p.n));
    expect(opening.frame.axis).toEqual({ from: 1999, to: 2025, scale: "linear", unit: "year" });
    expect(new Set(set.pages.flatMap(hitIds)).size).toBe(set.hits);
  });

  test("the largest occupation group is census 2018 with 570 lifecycles in one reply under 128 KB", () => {
    const set = setOf("occupations-time");
    const largest = set.pages.slice(1).reduce((a, b) => (b.n > a.n ? b : a));
    expect(largest.n).toBe(570);
    expect(rowKeys(largest)[0]).toStartWith("histocc-life-census-2018-");
    expect(pageCount(largest)).toBe(1);
    const bytes = packedBytes(largest);
    expect(bytes).toBeLessThan(REPLY_BYTES);
    expect(Math.max(...replies(set.pages).map(packedBytes))).toBe(bytes);
  });

  test("no public row cites IPUMS, and no census row carries a value derived from its crosswalks", () => {
    const pages = pack.sets.flatMap((s) => s.pages);
    expect(/ipums/i.test(JSON.stringify(pack))).toBe(false);
    expect(/ipums/i.test(rowSetText(pages))).toBe(false);
    expect(pages.flatMap((p) => p.sources)).not.toContain("ipums");
    const [opening, ...groups] = setOf("occupations-time").pages;
    const census = groups.filter((p) => rowKeys(p)[0].startsWith("histocc-life-census-"));
    expect(census.map((p) => p.n)).toEqual([10, 85, 570]);
    for (const page of census) {
      expect(page.sources).toEqual(["census-occupations"]);
      expect(page.url.every((u) => u !== null && new URL(u).host === "www2.census.gov")).toBe(true);
      const listed = Number(/census-(\d{4})/.exec(rowKeys(page)[0])?.[1]);
      expect((page.frame.from as number[]).every((y) => y === listed)).toBe(true);
      expect(page.frame.to).toBeNull();
      expect(page.frame.weight).toBeNull();
      expect(page.year.every((y) => y === null)).toBe(true);
      expect(page.groups.map((g) => g.id)).toEqual(["listed"]);
    }
    rowKeys(opening).forEach((k, i) => {
      if (!k.startsWith("census-")) return;
      expect((opening.frame.from as number[])[i]).toBe(Number(k.slice(7)));
      expect((opening.frame.to as (number | null)[])[i]).toBeNull();
    });
  });

  test("no reply passes 90% of the reply cap, no set passes 90% of the set cap and the pack stays under 90% of its budget", () => {
    expect(capWarnings(pack.sets)).toEqual([]);
    expect(packWarnings(pack)).toEqual([]);
    expect(packWarnings({ ...pack, sets: [...pack.sets, ...pack.sets] })).toEqual([expect.stringContaining("past 90% of the 1310720 byte budget")]);
  });

  test("the mathematics chain holds 65 domains with 147 links, 112 of them stated, and 371 standards inside", () => {
    const [opening, ...domains] = setOf("mathematics-chain").pages;
    expect([opening.n, opening.links.flat().length, opening.frame.edgeStated?.flat().filter(Boolean).length]).toEqual([65, 147, 112]);
    expect(domains).toHaveLength(65);
    expect(domains.reduce((sum, p) => sum + p.n, 0)).toBe(371);
    const text = JSON.stringify(setOf("mathematics-chain"));
    expect(/collegeboard|school-us-math/i.test(text)).toBe(false);
    for (const page of [opening, ...domains]) {
      expect(page.sources).toEqual(["ccss-math"]);
      expect(page.url.every((u) => u !== null && u.startsWith("https://www.thecorestandards.org/"))).toBe(true);
      expect(page.title.every((t) => t.split(/\s+/).length <= 12)).toBe(true);
    }
  });

  test("technology waves hold waves, curated technologies, training responses and the occupations a technology changed", () => {
    const pages = setOf("technology-waves").pages;
    expect(pages).toHaveLength(1);
    const [opening] = pages;
    const count = (id: string) => opening.gi.filter((g) => opening.groups[g].id === id).length;
    expect([opening.n, count("wave"), count("checked"), count("curated"), count("training"), count("occupation")]).toEqual([217, 14, 34, 63, 71, 35]);
    expect(opening.frame.drill).toBeNull();
    expect(new Set(opening.sources)).toEqual(new Set(["wikipedia", "wikidata", "arxiv", "bls-publications"]));
    expect(opening.licence).toBe("CC-BY-SA-4.0");
    const keys = rowKeys(opening);
    const group = (i: number) => opening.groups[opening.gi[i]].id;
    opening.links.forEach((targets, i) => {
      if (group(i) === "occupation") expect(targets.length).toBeGreaterThan(0);
      targets.forEach((to) => expect(["checked", "curated"]).toContain(group(to)));
      if (!["occupation", "training"].includes(group(i))) expect(targets).toEqual([]);
    });
    const stated = (opening.frame.edgeStated as boolean[][]).flat();
    expect(stated.length).toBe(opening.links.flat().length);
    expect(stated.filter(Boolean).length).toBeGreaterThan(0);
    expect(stated.filter((s) => !s).length).toBeGreaterThan(0);
    const withLag = keys.filter((_, i) => group(i) === "occupation" && / years?, n = \d+$/.test(opening.sub[i]));
    expect(withLag).toEqual(["occ-bank-teller", "occ-manual-switchboard-operator", "occ-mechanic-and-repairer", "occ-railroad-worker"]);
    expect(opening.sub[keys.indexOf("occ-elevator-operator")]).toBe("shrank, ended");
    expect(opening.attributions.map((a) => a.source)).toContain("Bucket Foundation, progressions corpus");
    expect(/archives\.gov|nber\.org|ourworldindata/.test(JSON.stringify(opening))).toBe(false);
  });

  test("no public lag or case carries a figure without a source address that IPUMS does not host", async () => {
    const [opening] = setOf("technology-waves").pages;
    const keys = rowKeys(opening);
    const cases: Record<string, unknown>[] = [];
    for await (const row of fileTables(join(REPO, TABLES_DIR)).rows("tech_occupation")) cases.push(row);
    const lags: Record<string, unknown>[] = [];
    for await (const row of fileTables(join(REPO, TABLES_DIR)).rows("tech_lags")) lags.push(row);
    let checked = 0;
    keys.forEach((key, i) => {
      if (opening.groups[opening.gi[i]].id !== "occupation") return;
      const url = opening.url[i] as string;
      expect(figureUrl(url)).toBe(url);
      expect(new URL(url).host.endsWith("ipums.org")).toBe(false);
      const own = cases.filter((c) => occupationKey(String(c.occupation)) === key);
      expect(own.some((c) => c.source_url === url)).toBe(true);
      const printed = / (\d+) years?, n = (\d+)$/.exec(opening.sub[i]);
      if (!printed) return;
      checked++;
      const lag = lags.find((l) => occupationKey(String(l.occupation)) === key && l.row_type === "case" && Number(l.lag_years) === Number(printed[1]) && Number(l.n) === Number(printed[2]));
      expect(lag).toBeDefined();
      expect(own.some((c) => c.technology_id === lag?.technology_id && c.year === lag?.to_year && c.source_url === url)).toBe(true);
    });
    expect(checked).toBe(4);
    expect(/ipums/i.test(JSON.stringify(pack))).toBe(false);
    expect(opening.sub.filter((s, i) => opening.groups[opening.gi[i]].id === "occupation" && /\d,\d{3}/.test(s))).toEqual([]);
  });

  test("no public row of any set has evidence wikidata-id-only", async () => {
    const staffOnly = new Map<string, string>();
    for await (const row of fileTables(join(REPO, TABLES_DIR)).rows("technologies")) if (row.evidence === STAFF_ONLY_EVIDENCE) staffOnly.set(rowKey(String(row.id)), String(row.name));
    expect(staffOnly.size).toBe(587);
    const pages = pack.sets.flatMap((s) => s.pages);
    const keys = new Set(pages.flatMap(rowKeys));
    for (const id of staffOnly.keys()) expect(keys.has(id)).toBe(false);
    expect(pages.flatMap(rowKeys).filter((k) => k.startsWith("ht-wd-"))).toEqual([]);
    const titles = new Set(setOf("technology-waves").pages.flatMap((p) => p.title));
    for (const name of ["Sala do Futuro", "Sprechgesang", "flowkey", "LearnLink", "Thermomix", "Kids Play City", "Rosetta Stone", "Lumina University", "Ugatech Uganda Limited"]) expect(titles.has(name)).toBe(false);
  });

  test("occupations declare the map and the timeline, and census groups say they hold list years only", () => {
    const pages = setOf("occupations-time").pages;
    expect(pages.every((p) => p.modes.join() === "map,timeline")).toBe(true);
    expect(pages[0].groups.find((g) => g.id === "census")?.label).toBe("Census lists, marked at the list year");
    expect(pages.at(-1)?.groups).toEqual([{ id: "listed", label: "Census list, marked at its list year", color: "#5b7a3a" }]);
  });

  test("major to career holds 64 hits and 240 weighted links", () => {
    const [rows] = setOf("major-to-career").pages;
    expect(rows.n).toBe(64);
    expect(rows.gi.filter((g) => rows.groups[g].id === "cip")).toHaveLength(41);
    expect(rows.gi.filter((g) => rows.groups[g].id === "soc")).toHaveLength(23);
    expect(rows.links.flat()).toHaveLength(240);
    expect((rows.frame.edgeWeight as number[][]).flat().reduce((a, b) => a + b, 0)).toBe(5723);
  });

  test("passes the nine rules, the denylist, the email scan and the image scan", async () => {
    const ctx = await repoContext(REPO);
    const pages = pack.sets.flatMap((s) => s.pages);
    for (const page of pages) checkRows(page, ctx);
    assertClean(deny, pack, "the row set pack");
    const text = rowSetText(pages);
    expect(hasEmail(text)).toBe(false);
    expect(/\.(png|jpe?g|gif|svg|webp|avif|ico)\b/i.test(text)).toBe(false);
    expect(/logo/i.test(text)).toBe(false);
    expect(/\bHRAF\b|Prop(a|ae)dia|Outline of Cultural Materials/i.test(text)).toBe(false);
    for (const id of pages.flatMap(hitIds)) expect(SEL.test(id)).toBe(true);
    expect(pages.every((p) => p.title.every((t) => t.length > 0 && t.length <= 200))).toBe(true);
  });

  test("the ids differ from every bundled id and every space id", () => {
    const reserved = reservedIds(REPO);
    expect(reserved.has("canon") && reserved.has("sample") && reserved.has("advisors")).toBe(true);
    for (const set of pack.sets) expect(reserved.has(set.id)).toBe(false);
  });

  test("the countries table gives 236 three-letter codes, and every placed row carries one of them with its point", async () => {
    const codes = await countryCodes(fileTables(join(REPO, TABLES_DIR)));
    expect(codes.size).toBe(236);
    const placed = pack.sets.flatMap((s) => s.pages).filter((p) => p.frame.place !== null);
    expect(placed.map((p) => p.id)).toEqual(["education-by-country", "coverage-by-country"]);
    for (const page of placed) {
      expect(page.frame.place?.every((code) => code !== null && codes.has(code))).toBe(true);
      expect(page.frame.points?.every((point) => point !== null && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180)).toBe(true);
      expect(page.attributions.map((a) => a.source)).toContain("Natural Earth, 1:50m Admin 0 Countries label points");
      expect(page.modes).toEqual(["earth", "map"]);
    }
  });

  test("education by country holds 66 countries from World Bank indicators alone", () => {
    const [rows] = setOf("education-by-country").pages;
    expect(rows.n).toBe(66);
    expect(rows.sources).toEqual(["world-bank-wdi"]);
    expect(rows.licence).toBe("CC-BY-4.0");
    expect(rows.url.every((u) => u !== null && u.startsWith("https://api.worldbank.org/"))).toBe(true);
    expect(rows.frame.verified?.every(Boolean)).toBe(true);
    const india = rows.title.indexOf("India");
    expect(rows.sub[india]).toMatch(/^Primary from age \d+ for \d+ years, secondary from age \d+ for \d+ years, \d+ years compulsory$/);
    const text = JSON.stringify(rows);
    expect(/uis\.unesco|unevoc|board examination|Abitur|gaokao|cedefop/i.test(text)).toBe(false);
    expect(rows.attributions[0].notice).toContain("Data source: UNESCO Institute for Statistics");
    expect(rows.attributions[0].termsRead).toBe(true);
  });

  test("coverage by country holds the 30 geography cells with their row counts", () => {
    const [rows] = setOf("coverage-by-country").pages;
    expect(rows.n).toBe(30);
    expect(rows.sources).toEqual(["bucket-corpus"]);
    const us = rows.frame.place?.indexOf("USA") as number;
    expect([rows.title[us], rows.sub[us], rows.frame.weight?.[us]]).toEqual(["United States of America", "32,898 rows, 3,639 checked", 32898]);
    const turkey = rows.frame.place?.indexOf("TUR") as number;
    expect([rows.sub[turkey], rows.groups[rows.gi[turkey]].label, rows.frame.weight?.[turkey]]).toEqual(["0 rows, 0 checked", "No rows yet", null]);
  });

  test("no recall table, no programme row of unread terms and no exam name reaches the pack", async () => {
    const keys = new Set(pack.sets.flatMap((s) => s.pages).flatMap(rowKeys));
    const titles = new Set(pack.sets.flatMap((s) => s.pages).flatMap((p) => p.title));
    let seen = 0;
    for (const table of ["world_professions", "world_elements", "world_languages", "world_systems", "world_stages", "world_exams", "world_nqf", "world_tvet_bodies", "world_occupations"]) {
      for await (const row of fileTables(join(REPO, TABLES_DIR)).rows(table)) {
        seen++;
        expect(keys.has(rowKey(String(row.id)))).toBe(false);
        if (table === "world_exams" || table === "world_professions") expect(titles.has(String(row.name ?? row.profession ?? ""))).toBe(false);
      }
    }
    expect(seen).toBeGreaterThan(9000);
  });
});

describe("pack assembly", () => {
  const ctx = fixtureContext();
  const big = (n: number, title: string): RowDraft[] => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, title: `${title} ${i}`, sub: "", group: "a", source: "open" }));

  test("a staff set stays out of the public pack", () => {
    const staff = assembleRowSet([fixtureDraft({ id: "staff-only", audience: "staff" })], ctx);
    const unlabelled = assembleRowSet([fixtureDraft({ id: "no-audience", audience: undefined })], ctx);
    const open = assembleRowSet([fixtureDraft()], ctx);
    expect(assembleRowSetPack([staff, unlabelled, open], deny, "fixture").sets.map((s) => s.id)).toEqual(["fixture-set"]);
  });

  test("a staff set id, a set built twice and a set over a cap fail", () => {
    const open = assembleRowSet([fixtureDraft()], ctx);
    expect(() => assembleRowSetPack([open, open], deny, "fixture")).toThrow(/built twice/);
    expect(() => assembleRowSetPack([assembleRowSet([fixtureDraft({ id: "edtech-market" })], ctx)], deny, "fixture")).toThrow(/staff set/);
    const wide = assembleRowSet([fixtureDraft({ rows: big(600, "t".repeat(190)) })], ctx);
    expect(packedBytes(wide[0])).toBeGreaterThan(REPLY_BYTES);
    expect(() => checkCaps("fixture-set", wide)).toThrow(/over the cap of 600 hits and 131072 bytes/);
    const drill = { param: "group" as const, values: Array.from({ length: 8 }, (_, i) => `k${i}`) };
    const heavy = assembleRowSet([fixtureDraft({ drill, rows: big(8, "g") }), ...drill.values.map((v) => fixtureDraft({ drill, rows: big(590, `${v} ${"t".repeat(150)}`).map((r) => ({ ...r, key: `${v}-${r.key}` })) }))], ctx);
    expect(replies(heavy).every((p) => packedBytes(p) <= REPLY_BYTES)).toBe(true);
    expect(() => checkCaps("fixture-set", heavy)).toThrow(/byte set cap/);
  });

  test("a reply past 90% of 128 KB and a set past 90% of 768 KB each raise a warning", () => {
    expect(WARN_SHARE).toBe(0.9);
    const near = assembleRowSet([fixtureDraft({ rows: big(600, "t".repeat(170)) })], ctx);
    const size = packedBytes(near[0]);
    expect(size).toBeGreaterThan(REPLY_BYTES * 0.9);
    expect(size).toBeLessThan(REPLY_BYTES);
    checkCaps("fixture-set", near);
    expect(capWarnings([{ id: "fixture-set", pages: near }])).toEqual([`fixture-set: a reply of 600 hits and ${size} bytes is past 90% of the 131072 byte reply cap`]);
    const drill = { param: "group" as const, values: Array.from({ length: 8 }, (_, i) => `k${i}`) };
    const full = assembleRowSet([fixtureDraft({ drill, rows: big(8, "g") }), ...drill.values.map((v) => fixtureDraft({ drill, rows: big(600, `${v} ${"t".repeat(120)}`).map((r) => ({ ...r, key: `${v}-${r.key}` })) }))], ctx);
    const bytes = setBytes(full);
    expect(bytes).toBeGreaterThan(SET_BYTES * 0.9);
    expect(bytes).toBeLessThan(SET_BYTES);
    checkCaps("fixture-set", full);
    expect(capWarnings([{ id: "fixture-set", pages: full }])).toEqual([`fixture-set: ${bytes} bytes is past 90% of the 786432 byte set cap`]);
    expect(capWarnings([{ id: "fixture-set", pages: assembleRowSet([fixtureDraft()], ctx) }])).toEqual([]);
  });

  test("a denied name in a title fails the pack", () => {
    const named = assembleRowSet([fixtureDraft({ rows: [{ key: "one", title: "Kruse notes", sub: "", group: "a", source: "open" }] })], ctx);
    expect(() => assembleRowSetPack([named], deny, "fixture")).toThrow(/rights: .* denied rows left in the row set pack/);
  });
});

describe("the public build checks", () => {
  const dir = mkdtempSync(join(tmpdir(), "bkt-rows-"));
  const write = (name: string, value: unknown): string => {
    const file = join(dir, name);
    writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
    return file;
  };

  test("the built pack holds no staff set, no restricted source and no person row", () => {
    const file = write("explore-rows.json", pack);
    expect(readRowSetPack(file)?.sets).toHaveLength(6);
    expect(publicPackProblems(pack)).toEqual([]);
    const padded = { ...pack, sets: [...pack.sets, ...Array.from({ length: Math.ceil(ROW_SET_PACK_BUDGET_BYTES / packBytes(pack)) }, () => pack.sets).flat()] };
    expect(publicPackProblems(padded).some((p) => p.includes("over the 1310720 byte budget"))).toBe(true);
    expect(findStaffRowSets([file])).toEqual([]);
    expect(findKruse([file], [...deny.videoIds])).toEqual([]);
  });

  test("a pack with a staff set, a restricted source or an email fails the staff check", () => {
    const ctx = fixtureContext();
    const open = assembleRowSet([fixtureDraft()], ctx);
    const good = assembleRowSetPack([open], deny, "fixture");
    const forged = (change: (p: RowSetPack) => void): string[] => {
      const copy = structuredClone(good);
      change(copy);
      return findStaffRowSets([write("forged.json", copy)]).map((h) => h.marker);
    };
    expect(forged(() => undefined)).toEqual(["fixture-set: source open has no licence entry", "fixture-set: source by has no licence entry"]);
    expect(publicPackProblems(good, ctx.registry)).toEqual([]);
    expect(forged((p) => void (p.sets[0].id = "progression"))).toContain("progression: a staff set");
    expect(forged((p) => void ((p.sets[0] as { audience: string }).audience = "staff"))).toContain("fixture-set: audience staff");
    expect(forged((p) => void delete (p.sets[0].pages[0] as { audience?: string }).audience)).toContain("fixture-set: a page with no public audience");
    expect(forged((p) => void (p.sets[0].pages[0].sources[0] = "k12-restricted"))).toContain("fixture-set: source k12-restricted is restricted");
    expect(forged((p) => void (p.sets[0].pages[0].title[0] = "write to someone@example.org"))).toContain("fixture-set: an email address");
    expect(forged((p) => void (p.sets[0].pages[0].url[0] = "https://usa.ipums.org/usa/resources/chapter4/occ_90-00.xls"))).toContain("fixture-set: a row that cites IPUMS");
    expect(forged((p) => void (p.sets[0].pages[0].sources[0] = "ipums"))).toContain("fixture-set: source ipums is restricted");
  });

  test("a marker split across the id prefix and a key is still found", () => {
    const ctx = fixtureContext();
    const marker = "staff-marker-row-0001";
    const rows: RowDraft[] = [1, 2].map((n) => ({ key: `staff-marker-row-000${n}`, title: `T${n}`, sub: "", group: "a", source: "open" }));
    const file = write("split.json", assembleRowSetPack([assembleRowSet([fixtureDraft({ rows })], ctx)], deny, "fixture"));
    expect(JSON.stringify(readRowSetPack(file)).includes(marker)).toBe(false);
    expect(findStaff([file], [marker]).map((h) => h.marker)).toEqual([marker]);
    expect(findKruse([file], [marker]).map((h) => h.marker)).toEqual([marker]);
  });

  test("a file of another shape is no row set pack", () => {
    expect(readRowSetPack(write("other.json", { schema: "bucket.explore-space/1" }))).toBeNull();
    expect(ROW_SET_PACK_SCHEMA).toBe("bucket.explore-rows-pack/2");
    expect(readRowSetPack(write("old.json", { ...pack, schema: "bucket.explore-rows-pack/1" }))).toBeNull();
    expect(readRowSetPack(write("broken.json", "{"))).toBeNull();
    expect(readRowSetPack(write("notes.txt", JSON.stringify(pack)))).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("hit keys of the staff course table", () => {
  test("25,908 course ids reach 25,908 keys, each a valid selection id", async () => {
    const keys = new Set<string>();
    let rows = 0;
    let longest = 0;
    for await (const row of fileTables(join(REPO, TABLES_DIR)).rows("courses")) {
      const key = rowKey(String(row.id));
      rows++;
      longest = Math.max(longest, key.length);
      keys.add(key);
      if (rows % 500 === 0) expect(SEL.test(`row:progression:${key}`)).toBe(true);
    }
    expect(rows).toBe(25908);
    expect(keys.size).toBe(rows);
    expect(longest).toBeLessThan(160);
  });

  test("every lifecycle id of the occupation table reaches its own key", async () => {
    const keys = new Set<string>();
    let rows = 0;
    for await (const row of fileTables(join(REPO, TABLES_DIR)).rows("occupation_history")) {
      rows++;
      keys.add(rowKey(String(row.id)));
    }
    expect(keys.size).toBe(rows);
    expect([3296, 3994]).toContain(rows);
  });
});
