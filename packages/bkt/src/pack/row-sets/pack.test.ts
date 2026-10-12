import { beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { hasEmail } from "../../../../../src/lib/research-os/advisor-review";
import { findKruse } from "../../../scripts/check-no-kruse";
import { findStaff, findStaffRowSets } from "../../../scripts/check-no-staff";
import { assertClean, buildDenylist } from "../rights";
import { assembleRowSet, checkRows, hitIds, packedBytes, pageCount, pageRows, REPLY_BYTES, REPLY_HITS, rowKey, rowKeys, rowSetText, SET_BYTES, type RowDraft } from "./contract";
import { assembleRowSetPack, buildRowSetPack, capWarnings, checkCaps, countryCodes, describeRowSets, fileTables, packBytes, publicPackProblems, readRowSetPack, replies, repoContext, reservedIds, ROW_SET_PACK_BUDGET_BYTES, ROW_SET_PACK_SCHEMA, setBytes, TABLES_DIR, WARN_SHARE, type RowSetPack } from "./index";
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
    expect(pack.sets.map((s) => s.id)).toEqual(["occupations-time", "major-to-career"]);
    for (const set of pack.sets) {
      expect(set.bytes).toBe(setBytes(set.pages));
      expect(set.bytes).toBeLessThan(SET_BYTES);
    }
    expect(SET_BYTES).toBe(768 * 1024);
    expect(ROW_SET_PACK_BUDGET_BYTES).toBe(1.25 * 1024 * 1024);
    expect(packBytes(pack)).toBeLessThan(ROW_SET_PACK_BUDGET_BYTES);
    expect(describeRowSets(pack)).toHaveLength(2);
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
    expect(seen).toBe(50);
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
      expect((page.frame.from as number[]).every((y) => y >= 2000)).toBe(true);
      expect(page.frame.weight).toBeNull();
      expect(page.year.every((y) => y === null)).toBe(true);
      expect(page.groups.map((g) => g.id)).toEqual(["listed"]);
    }
    rowKeys(opening).forEach((k, i) => k.startsWith("census-") && expect((opening.frame.from as number[])[i]).toBeGreaterThanOrEqual(2000));
  });

  test("no reply passes 90% of the reply cap and no set passes 90% of the set cap", () => {
    expect(capWarnings(pack.sets)).toEqual([]);
  });

  test("major to career holds 64 hits and 240 weighted links", () => {
    const [rows] = setOf("major-to-career").pages;
    expect(rows.n).toBe(64);
    expect(rows.gi.filter((g) => rows.groups[g].id === "cip")).toHaveLength(41);
    expect(rows.gi.filter((g) => rows.groups[g].id === "soc")).toHaveLength(23);
    expect(rows.links.flat()).toHaveLength(240);
    expect((rows.frame.edgeWeight as number[][]).flat().reduce((a, b) => a + b, 0)).toBe(5723);
  });

  test("passes the nine rules, the denylist, the email scan and the image scan", () => {
    const ctx = repoContext(REPO);
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

  test("the country file holds no two-letter codes, so no set can carry a place yet", () => {
    expect(countryCodes(REPO).size).toBe(0);
    expect(pack.sets.every((s) => s.pages.every((p) => p.frame.place === null))).toBe(true);
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
    expect(readRowSetPack(file)?.sets).toHaveLength(2);
    expect(publicPackProblems(pack)).toEqual([]);
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
