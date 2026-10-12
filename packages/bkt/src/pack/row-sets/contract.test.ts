import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { validDatasetId } from "../../../../../src/lib/explore/datasets";
import { assembleRowSet, audienceOf, bodySha, checkRows, hitIds, KEY_CHARS, MODE_IDS, packRows, pageCount, pageRows, rowKey, rowKeys, ROWS_SCHEMA, type PackedRows, type RowDraft } from "./contract";
import { fixtureContext, fixtureDraft } from "./test-fixtures";

const ctx = fixtureContext();
const valid = (): PackedRows => structuredClone(assembleRowSet([fixtureDraft()], ctx)[0]);
const rehash = (rows: PackedRows): PackedRows => ({ ...rows, sha256: bodySha(rows) });
const broken = (change: (rows: PackedRows) => void): (() => void) => () => {
  const rows = valid();
  change(rows);
  checkRows(rehash(rows), ctx);
};

describe("packed rows", () => {
  test("a draft packs into columns of one length with ids, indexes and a frame", () => {
    const rows = valid();
    expect(rows.schema).toBe(ROWS_SCHEMA);
    expect([rows.n, rows.total, rows.page, rows.cut]).toEqual([3, 3, 0, 0]);
    expect(rows.idp).toBe("row:fixture-set:");
    expect(hitIds(rows)).toEqual(["row:fixture-set:one", "row:fixture-set:two", "row:fixture-set:three"]);
    expect(rows.groups.map((g) => g.id)).toEqual(["a", "b"]);
    expect(rows.gi).toEqual([0, 1, 0]);
    expect(rows.sources).toEqual(["open", "by"]);
    expect(rows.si).toEqual([0, 1, 0]);
    expect(rows.licences.map((_, i) => rows.licences[rows.li[i]])).toHaveLength(2);
    expect(rows.links).toEqual([[1, 2], [2], []]);
    expect(rows.frame.edgeWeight).toEqual([[3, 1], [2], []]);
    expect(rows.frame.from).toEqual([1980, 1985, null]);
    expect(rows.frame.to).toEqual([1995, null, 2020]);
    expect(rows.frame.weight).toEqual([12, 4, null]);
    expect([rows.frame.place, rows.frame.atom, rows.frame.verified, rows.frame.cells, rows.frame.drill]).toEqual([null, null, null, null, null]);
    expect(rows.licence).toBe("CC-BY-4.0");
    expect(rows.attributions.map((a) => [a.source, a.rows])).toEqual([["Open source", 2], ["Attributed source", 1]]);
    expect(rows.sha256).toBe(bodySha(rows));
    expect(assembleRowSet([fixtureDraft()], ctx)[0].sha256).toBe(rows.sha256);
  });

  test("a shared key prefix moves into the id prefix and the hit ids stay whole", () => {
    const rows = assembleRowSet([fixtureDraft({ rows: ["life-soc-11", "life-soc-13", "life-soc-15"].map((key): RowDraft => ({ key, title: key, sub: "", group: "a", source: "open" })) })], ctx)[0];
    expect(rows.idp).toBe("row:fixture-set:life-soc-1");
    expect(rows.key).toEqual(["1", "3", "5"]);
    expect(rowKeys(rows)).toEqual(["life-soc-11", "life-soc-13", "life-soc-15"]);
    expect(hitIds(rows)[2]).toBe("row:fixture-set:life-soc-15");
  });

  test("the mode ids are the modes Explore draws", () => {
    const dir = resolve(import.meta.dir, "../../../../../src/lib/explore/modes");
    const index = readFileSync(join(dir, "index.ts"), "utf8");
    const listed = /export const MODES: ExploreMode\[\] = \[([^\]]+)\];/.exec(index)?.[1].split(",").map((name) => name.trim()) ?? [];
    const declared = new Map<string, string>();
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      for (const m of readFileSync(join(dir, file), "utf8").matchAll(/export const (\w+Mode): ExploreMode = \{\s*id: "([a-z]+)"/g)) declared.set(m[1], m[2]);
    }
    expect(listed).toHaveLength(12);
    expect(listed.map((name) => declared.get(name))).toEqual([...MODE_IDS]);
  });
});

describe("rule 1, the set id", () => {
  test("an id outside the data set id rule fails", () => {
    for (const id of ["Fixture", "a_b", "-lead", "a".repeat(65)]) {
      expect(validDatasetId(id)).toBe(false);
      expect(() => assembleRowSet([fixtureDraft({ id })], ctx)).toThrow(/rule 1/);
    }
  });

  test("a bundled id or a space id fails", () => {
    for (const id of ["canon", "sample", "advisors"]) expect(() => assembleRowSet([fixtureDraft({ id })], ctx)).toThrow(/rule 1: the id belongs/);
  });

  test("another schema fails", () => {
    expect(broken((r) => void ((r as { schema: string }).schema = "bucket.explore-space/1"))).toThrow(/rule 1/);
  });
});

describe("rule 2, hit keys", () => {
  test("a key keeps the safe characters, swaps the rest and stops at 160", () => {
    expect(rowKey("isu:COM S 3110/ä")).toBe("isu-COM-S-3110--");
    expect(rowKey("11-1011.00_a")).toBe("11-1011.00_a");
    expect(rowKey("k".repeat(400))).toHaveLength(KEY_CHARS);
    expect(hitIds(assembleRowSet([fixtureDraft({ rows: [{ key: "a/b c", title: "T", sub: "", group: "a", source: "open" }] })], ctx)[0])).toEqual(["row:fixture-set:a-b-c"]);
  });

  test("two rows that reach one key fail the build", () => {
    const rows: RowDraft[] = [
      { key: "COM S 311", title: "One", sub: "", group: "a", source: "open" },
      { key: "COM-S-311", title: "Two", sub: "", group: "a", source: "open" },
    ];
    expect(() => assembleRowSet([fixtureDraft({ rows })], ctx)).toThrow(/rule 2: rows COM S 311 and COM-S-311 reach the key COM-S-311/);
    const long: RowDraft[] = [`${"k".repeat(160)}a`, `${"k".repeat(160)}b`].map((key) => ({ key, title: "T", sub: "", group: "a", source: "open" }));
    expect(() => assembleRowSet([fixtureDraft({ rows: long })], ctx)).toThrow(/rule 2/);
  });

  test("a packed key with a slash, a repeat or a foreign prefix fails", () => {
    expect(broken((r) => void (r.key[0] = "a/b"))).toThrow(/rule 2/);
    expect(broken((r) => void (r.key[1] = r.key[0]))).toThrow(/rule 2/);
    expect(broken((r) => void (r.idp = "row:other-set:"))).toThrow(/rule 2/);
    expect(broken((r) => void (r.idp = "row:fixture-set:a/"))).toThrow(/rule 2/);
  });

  test("one key on two pages of a set fails", () => {
    const opening = fixtureDraft({ drill: { param: "group", values: ["one"] } });
    const page = fixtureDraft({ drill: { param: "group", values: ["one"] }, rows: [{ key: "two", title: "Again", sub: "", group: "a", source: "open" }] });
    expect(() => assembleRowSet([opening, page], ctx)).toThrow(/rule 2: two rows of the set reach the key two/);
  });
});

describe("rule 3, indexes and column lengths", () => {
  test("an index outside its table fails", () => {
    expect(broken((r) => void (r.gi[0] = 2))).toThrow(/rule 3: gi\[0\]/);
    expect(broken((r) => void (r.si[1] = -1))).toThrow(/rule 3: si\[1\]/);
    expect(broken((r) => void (r.li[2] = 9))).toThrow(/rule 3: li\[2\]/);
    expect(broken((r) => void (r.links[0] = [3]))).toThrow(/rule 3: links\[0\]/);
    expect(broken((r) => void (r.links[2] = [2]))).toThrow(/rule 3: links\[2\]/);
    expect(broken((r) => void (r.links[1] = [0.5]))).toThrow(/rule 3/);
  });

  test("a column of another length fails", () => {
    expect(broken((r) => void r.title.pop())).toThrow(/rule 3: column title has length 2/);
    expect(broken((r) => void r.year.push(2000))).toThrow(/rule 3: column year has length 4/);
    expect(broken((r) => void (r.frame.from as (number | null)[]).pop())).toThrow(/rule 3: column frame.from/);
    expect(broken((r) => void (r.frame.weight = [1]))).toThrow(/rule 3: column frame.weight/);
    expect(broken((r) => void ((r as { url: unknown }).url = null))).toThrow(/rule 3: column url has length none/);
  });

  test("an edge weight list that does not pair with its links fails", () => {
    expect(broken((r) => void (r.frame.edgeWeight as number[][])[0].pop())).toThrow(/rule 3: edgeWeight\[0\]/);
    expect(broken((r) => void ((r.frame.edgeWeight as number[][])[1] = [0]))).toThrow(/rule 3: edgeWeight\[1\]/);
  });

  test("a link to a row the set lacks fails at the draft", () => {
    expect(() => assembleRowSet([fixtureDraft({ rows: [{ key: "one", title: "T", sub: "", group: "a", source: "open", links: [{ to: "gone" }] }] })], ctx)).toThrow(/rule 3: row one links to gone/);
    expect(() => assembleRowSet([fixtureDraft({ rows: [{ key: "one", title: "T", sub: "", group: "zzz", source: "open" }] })], ctx)).toThrow(/rule 3: group zzz/);
  });

  test("counts that disagree fail", () => {
    expect(broken((r) => void (r.total = 2))).toThrow(/rule 3/);
    expect(broken((r) => void (r.cut = -1))).toThrow(/rule 3/);
  });
});

describe("rule 4, sources and licences", () => {
  test("a source outside the registry fails", () => {
    expect(() => assembleRowSet([fixtureDraft({ rows: [{ key: "one", title: "T", sub: "", group: "a", source: "nowhere" }] })], ctx)).toThrow(/rule 4: source nowhere/);
    expect(broken((r) => void (r.sources[0] = "unknown"))).toThrow(/rule 4: source unknown/);
  });

  test("a row licence that differs from its source's licence fails", () => {
    expect(broken((r) => void (r.li[0] = r.li[1]))).toThrow(/rule 4: row one carries CC-BY-4.0/);
  });

  test("attribution rows that miss a source fail", () => {
    expect(broken((r) => void r.attributions.pop())).toThrow(/rule 4: the attribution rows/);
  });
});

describe("rule 5, places", () => {
  const placed = (place: string) => fixtureDraft({ modes: ["earth"], rows: [{ key: "one", title: "T", sub: "", group: "a", source: "open", place }] });

  test("a two-letter code in the country file passes", () => {
    expect(assembleRowSet([placed("CL")], ctx)[0].frame.place).toEqual(["CL"]);
  });

  test("a code outside the country file or of another shape fails", () => {
    for (const place of ["ZZ", "USA", "us", "Chile"]) expect(() => assembleRowSet([placed(place)], ctx)).toThrow(/rule 5/);
  });
});

describe("rule 6, atoms", () => {
  const atomic = (atom: string) => fixtureDraft({ rows: [{ key: "one", title: "T", sub: "", group: "a", source: "open", atom }] });

  test("the atom column stays empty until an alignment file exists", () => {
    expect(() => assembleRowSet([atomic("atom:02-physics/entropy")], ctx)).toThrow(/rule 6/);
  });

  test("an atom in the alignment file passes, and one outside it fails", () => {
    const aligned = fixtureContext({ atoms: new Set(["atom:02-physics/entropy"]) });
    expect(assembleRowSet([atomic("atom:02-physics/entropy")], aligned)[0].frame.atom).toEqual(["atom:02-physics/entropy"]);
    for (const atom of ["atom:02-physics/heat", "02-physics/entropy", "atom:02-physics"]) expect(() => assembleRowSet([atomic(atom)], aligned)).toThrow(/rule 6/);
  });
});

describe("rule 7, audience and the set licence", () => {
  test("a set with no audience reads as staff", () => {
    expect(audienceOf({})).toBe("staff");
    expect(audienceOf({ audience: "everyone" })).toBe("staff");
    expect(assembleRowSet([fixtureDraft({ audience: undefined })], ctx)[0].audience).toBe("staff");
    expect(broken((r) => void delete (r as { audience?: string }).audience)).toThrow(/rule 7: a set with no audience/);
  });

  test("a restricted source fails a public set and passes a staff set", () => {
    const rows: RowDraft[] = [{ key: "one", title: "T", sub: "", group: "a", source: "closed" }];
    expect(() => assembleRowSet([fixtureDraft({ rows })], ctx)).toThrow(/rule 7: source closed may not ship/);
    expect(assembleRowSet([fixtureDraft({ rows, audience: "staff" })], ctx)[0].licence).toBe("restricted");
  });

  test("the set carries the strictest licence among its rows", () => {
    const rows = assembleRowSet([fixtureDraft()], ctx)[0];
    expect(rows.licence).toBe("CC-BY-4.0");
    expect(broken((r) => void (r.licence = "US federal work, public domain"))).toThrow(/rule 7: the set is labelled/);
    expect(broken((r) => void (r.licence = "unknown"))).toThrow(/rule 7/);
  });

  test("a set holding any share-alike row is labelled with that licence on every page", () => {
    const drill = { param: "group" as const, values: ["one"] };
    const opening = fixtureDraft({ drill, rows: [{ key: "one", title: "T", sub: "", group: "a", source: "open" }] });
    const page = fixtureDraft({ drill, rows: [{ key: "leaf", title: "Leaf", sub: "", group: "a", source: "alike" }, { key: "leaf-2", title: "Leaf", sub: "", group: "a", source: "by" }] });
    const pages = assembleRowSet([opening, page], ctx);
    expect(pages.map((p) => p.licence)).toEqual(["CC-BY-SA-4.0", "CC-BY-SA-4.0"]);
    expect(pages[0].licences).toEqual(["US federal work, public domain"]);
  });
});

describe("rule 8, labels and links", () => {
  const titled = (title: string, sub = "") => fixtureDraft({ rows: [{ key: "one", title, sub, group: "a", source: "open" }] });

  test("a sentence from a source page fails as a title or a subtitle", () => {
    const sentence = "Students learn to add fractions. They then compare the results with a partner.";
    expect(() => assembleRowSet([titled(sentence)], ctx)).toThrow(/rule 8: a title reads as a sentence/);
    expect(() => assembleRowSet([titled("T", sentence)], ctx)).toThrow(/rule 8: a subtitle reads as a sentence/);
    expect(() => assembleRowSet([titled("Explain how the structure of a cell supports each of its functions in a living organism.")], ctx)).toThrow(/rule 8/);
    expect(() => assembleRowSet([titled("t".repeat(201))], ctx)).toThrow(/rule 8/);
    expect(() => assembleRowSet([titled("line\nbreak")], ctx)).toThrow(/rule 8/);
    expect(() => assembleRowSet([titled("")], ctx)).toThrow(/rule 8: row one has no title/);
  });

  test("codes, labels and counts pass", () => {
    for (const title of ["Chief Executives", "U.S. Marshals", "Managers, All Other", "COMPUTER AND INFORMATION SCIENCES AND SUPPORT SERVICES.", "11-1011.00"]) expect(assembleRowSet([titled(title, "48 occupations")], ctx)[0].title).toEqual([title]);
  });

  test("a codes source carries no label in a public set", () => {
    const coded = (title: string, sub: string) => fixtureDraft({ rows: [{ key: "one", title, sub, group: "a", source: "codes" }] });
    expect(assembleRowSet([coded("HS-PS1-1", "")], ctx)[0].title).toEqual(["HS-PS1-1"]);
    expect(() => assembleRowSet([coded("Matter and its interactions, explained", "")], ctx)).toThrow(/rule 8: source codes ships codes alone/);
    expect(() => assembleRowSet([coded("HS-PS1-1", "Matter")], ctx)).toThrow(/rule 8/);
  });

  test("an email address, an image link or a logo fails", () => {
    expect(() => assembleRowSet([titled("Ask reader at example dot org")], ctx)).toThrow(/rule 8: a string holds an email address/);
    expect(() => assembleRowSet([titled("T", "someone@example.org")], ctx)).toThrow(/rule 8: a string holds an email address/);
    for (const url of ["https://example.org/logo.png", "https://example.org/mark.SVG?v=2", "https://example.org/a.webp#x"]) {
      expect(() => assembleRowSet([fixtureDraft({ rows: [{ key: "one", title: "T", sub: "", group: "a", source: "open", url }] })], ctx)).toThrow(/rule 8: a string holds an image link/);
    }
    expect(() => assembleRowSet([fixtureDraft({ rows: [{ key: "one", title: "T", sub: "", group: "a", source: "open", url: "javascript:alert(1)" }] })], ctx)).toThrow(/rule 8: url/);
  });

  test("label text of the two withheld outlines fails", () => {
    for (const title of ["HRAF category 221", "Outline of Cultural Materials", "Propaedia part one", "Propædia"]) expect(() => assembleRowSet([titled(title)], ctx)).toThrow(/rule 8: a string holds withheld label text/);
  });

  test("a group colour that is no hex colour fails", () => {
    expect(() => assembleRowSet([fixtureDraft({ groups: [{ id: "a", label: "A", color: "teal" }, { id: "b", label: "B", color: "#000000" }] })], ctx)).toThrow(/rule 8: group a/);
  });
});

describe("rule 9, modes, drill and the hash", () => {
  test("a mode Explore lacks fails", () => {
    expect(() => assembleRowSet([fixtureDraft({ modes: ["graph", "flow"] })], ctx)).toThrow(/rule 9: modes graph, flow/);
    expect(() => assembleRowSet([fixtureDraft({ modes: [] })], ctx)).toThrow(/rule 9/);
  });

  test("a body that changed after hashing fails", () => {
    const rows = valid();
    rows.title[0] = "Changed";
    expect(() => checkRows(rows, ctx)).toThrow(/rule 9: sha256 does not cover the body/);
  });

  test("a drill set needs one page per value and each value on the opening page", () => {
    const drill = { param: "group" as const, values: ["one", "two"] };
    expect(() => assembleRowSet([fixtureDraft({ drill })], ctx)).toThrow(/rule 9: 1 pages for 2 drill values/);
    const leaf = (key: string) => fixtureDraft({ drill, rows: [{ key, title: key, sub: "", group: "a", source: "open" }] });
    expect(assembleRowSet([fixtureDraft({ drill }), leaf("leaf-a"), leaf("leaf-b")], ctx)).toHaveLength(3);
    const missing = { param: "group" as const, values: ["one", "nine"] };
    expect(() => assembleRowSet([fixtureDraft({ drill: missing }), leaf("leaf-a"), leaf("leaf-b")], ctx)).toThrow(/rule 9: drill value nine/);
    const twice = { param: "group" as const, values: ["one", "one"] };
    expect(() => assembleRowSet([fixtureDraft({ drill: twice }), leaf("leaf-a"), leaf("leaf-b")], ctx)).toThrow(/rule 9/);
  });
});

describe("paged replies", () => {
  const chain = (n: number): RowDraft[] => Array.from({ length: n }, (_, i) => ({
    key: `course-${String(i).padStart(4, "0")}`, title: `Course ${i}`, sub: "", group: "a", source: "open", from: i, weight: i + 1,
    links: [i + 1, i + 300].filter((to) => to < n).map((to) => ({ to: `course-${String(to).padStart(4, "0")}`, weight: to - i })),
  }));

  test("a set at or under 600 hits is one reply", () => {
    const rows = assembleRowSet([fixtureDraft({ rows: chain(600) })], ctx)[0];
    expect(pageCount(rows)).toBe(1);
    expect(pageRows(rows, 0)).toBe(rows);
    expect(() => pageRows(rows, 1)).toThrow(RangeError);
  });

  test("886 hits answer in pages of 600 and 286, and a link that leaves its page is dropped and counted", () => {
    const rows = assembleRowSet([fixtureDraft({ rows: chain(886) })], ctx)[0];
    const links = rows.links.reduce((sum, l) => sum + l.length, 0);
    expect(links).toBe(885 + 586);
    expect(pageCount(rows)).toBe(2);
    const pages = [pageRows(rows, 0), pageRows(rows, 1)];
    expect(pages.map((p) => [p.n, p.total, p.page])).toEqual([[600, 886, 0], [286, 886, 1]]);
    for (const p of pages) {
      checkRows(p, ctx);
      expect(p.links.flat().every((to) => to >= 0 && to < p.n)).toBe(true);
      expect((p.frame.edgeWeight as number[][]).map((w) => w.length)).toEqual(p.links.map((l) => l.length));
      expect(p.frame.from).toHaveLength(p.n);
    }
    expect(pages[0].cut).toBe(1 + 286);
    expect(pages[1].cut).toBe(0);
    expect(pages[0].links.flat().length + pages[1].links.flat().length + pages[0].cut + pages[1].cut).toBe(links);
    expect(pages[0].links[599]).toEqual([]);
    expect(pages[0].links[0]).toEqual([1, 300]);
    expect(pages[0].frame.edgeWeight?.[299]).toEqual([1, 300]);
    expect(pages[0].links[300]).toEqual([301]);
    expect(pages[0].frame.edgeWeight?.[300]).toEqual([1]);
    expect(pages[1].links[0]).toEqual([1]);
    expect(hitIds(pages[1])[0]).toBe("row:fixture-set:course-0600");
    expect(pages[1].frame.from?.[0]).toBe(600);
    expect(new Set([rows.sha256, pages[0].sha256, pages[1].sha256]).size).toBe(3);
  });

  test("a page past the end, a broken page number and a second paging fail", () => {
    const rows = assembleRowSet([fixtureDraft({ rows: chain(886) })], ctx)[0];
    for (const page of [2, -1, 0.5, Number.NaN]) expect(() => pageRows(rows, page)).toThrow(RangeError);
    expect(() => pageRows(pageRows(rows, 1), 0)).toThrow(RangeError);
  });

  test("an empty draft packs to an empty reply", () => {
    const rows = packRows(fixtureDraft({ rows: [] }), ctx);
    expect([rows.n, rows.total, rows.key.length]).toEqual([0, 0, 0]);
    checkRows(rows, ctx);
  });
});
