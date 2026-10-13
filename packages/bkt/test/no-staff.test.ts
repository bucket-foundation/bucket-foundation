import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findStaff, findStaffReview, reviewProblems, ID_LIST_FILES, ID_RUN, idListMarkers, markersOf, STAFF, staffMarkers } from "../scripts/check-no-staff";

describe("alignment review check", () => {
  test("flags a staff alignment pack however it is carried, and passes the empty public one", async () => {
    const { alignmentReview, EMPTY_REVIEW, REVIEW_FLAG } = await import("../src/pack/alignment-review");
    const repo = join(import.meta.dir, "../../..");
    const dir = mkdtempSync(join(tmpdir(), "bkt-staff-review-"));
    const open = join(dir, "public.json");
    writeFileSync(open, JSON.stringify(await alignmentReview(repo, {})));
    expect(JSON.parse(JSON.stringify(await alignmentReview(repo, {})))).toEqual(EMPTY_REVIEW);
    expect(findStaffReview([open])).toEqual([]);
    const staff = await alignmentReview(repo, { [REVIEW_FLAG]: "1" });
    expect(staff.staff).toBe(true);
    expect(staff.rows.length).toBeGreaterThan(600);
    expect(staff.rows.every((r) => typeof r.id === "string" && Array.isArray(r.decks))).toBe(true);
    const held = join(dir, "staff.json");
    writeFileSync(held, JSON.stringify(staff));
    expect(findStaffReview([held]).map((h) => h.marker)).toEqual(["an alignment review pack marked staff", "an alignment review corpus row", "an alignment review pack that holds rows"]);
    const bundle = join(dir, "bundle.js");
    writeFileSync(bundle, `var pack={schema:"bucket.alignment-review/1",staff:!0,rows:[${JSON.stringify(staff.rows[0]).replace(/"(\w+)":/g, "$1:")}]};`);
    expect(findStaffReview([bundle]).length).toBeGreaterThanOrEqual(2);
    const lone = join(dir, "rows.json");
    writeFileSync(lone, JSON.stringify({ anything: staff.rows.slice(0, 3) }));
    expect(findStaffReview([lone]).map((h) => h.marker)).toEqual(["an alignment review corpus row"]);
    expect(reviewProblems(JSON.stringify({ outputs: [{ slug: "atom-alignment" }] }))).toEqual(["the alignment review output"]);
    expect(reviewProblems('{"id": "align:x~y", "status": "unreviewed-proposal", "verified": false}')).toEqual(["an unreviewed alignment row"]);
    expect(reviewProblems(JSON.stringify({ schema: "bucket.alignment-review/1", staff: false, rows: [] }))).toEqual([]);
    expect(reviewProblems("export const x = 1;")).toEqual([]);
    expect(findStaffReview([dir]).map((h) => h.file.split("/").pop()).filter((f, i, all) => all.indexOf(f) === i).sort()).toEqual(["bundle.js", "rows.json", "staff.json"]);
    rmSync(dir, { recursive: true });
  }, 60_000);

  test("a compiled public binary passes and a binary compiled with the staff pack fails", async () => {
    const { alignmentReview, EMPTY_REVIEW, REVIEW_FLAG } = await import("../src/pack/alignment-review");
    const repo = join(import.meta.dir, "../../..");
    const dir = mkdtempSync(join(tmpdir(), "bkt-staff-binary-"));
    const compile = (name: string, pack: unknown) => {
      writeFileSync(join(dir, `${name}.json`), JSON.stringify(pack));
      writeFileSync(join(dir, `${name}.ts`), `import pack from "./${name}.json" with { type: "json" };\nconst decoy = { schema: "bucket.other/1", rows: [{ concept: "category theory", aliases: ["categories"] }] };\nconsole.log(pack.schema, pack.rows.length, decoy.rows.length);\n`);
      const built = Bun.spawnSync([process.execPath, "build", "--compile", "--minify", join(dir, `${name}.ts`), "--outfile", join(dir, name)], { stdout: "pipe", stderr: "pipe" });
      expect({ name, code: built.exitCode, err: built.stderr.toString().slice(0, 200) }).toEqual({ name, code: 0, err: "" });
      return join(dir, name);
    };
    const open = compile("open", EMPTY_REVIEW);
    expect(Bun.spawnSync([open], { stdout: "pipe" }).stdout.toString().trim()).toBe("bucket.alignment-review/1 0 1");
    expect(findStaffReview([open])).toEqual([]);
    const staff = await alignmentReview(repo, { [REVIEW_FLAG]: "1" });
    expect(staff.rows.length).toBeGreaterThan(18000);
    const held = compile("held", staff);
    expect(findStaffReview([held]).map((h) => h.marker).sort()).toEqual(["an alignment review corpus row", "an alignment review pack marked staff", "an alignment review pack that holds rows"]);
    const few = compile("few", { ...EMPTY_REVIEW, rows: staff.rows.slice(0, 1) });
    expect(findStaffReview([few]).map((h) => h.marker)).toContain("an alignment review pack that holds rows");
    rmSync(dir, { recursive: true });
  }, 240_000);

  test("the public content this checkout built carries none of it", async () => {
    if (process.env.BKT_INCLUDE_STAFF_DATA === "1") return;
    const content = join(import.meta.dir, "../content");
    expect(findStaffReview(["alignment-review.json", "research-index.json", "research-blobs.json", "explore-rows.json", "pack.json"].map((f) => join(content, f)))).toEqual([]);
  });
});

describe("staff data check", () => {
  test("finds staff atlas strings in a build and passes a clean one", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-staff-"));
    const markers = staffMarkers();
    writeFileSync(join(dir, "clean.js"), "export const x = 1;");
    expect(findStaff([join(dir, "clean.js")], markers)).toEqual([]);
    writeFileSync(join(dir, "leak.js"), `const d = ${JSON.stringify({ t: markers[0] })};`);
    expect(findStaff([dir], markers).map((h) => h.file)).toEqual([join(dir, "leak.js")]);
    rmSync(dir, { recursive: true });
  });

  test("the similarity and neighbour files are on the staff list and yield id-run markers", () => {
    expect(STAFF.map((f) => f.slice(f.lastIndexOf("/") + 1))).toContain("solvability-similarity-data.json");
    expect(STAFF.map((f) => f.slice(f.lastIndexOf("/") + 1))).toContain("solvability-neighbors-data.json");
    const markers = staffMarkers();
    expect(markers.some((m) => m.startsWith('"') && m.split(",").length === ID_RUN)).toBe(true);
    expect(() => markersOf("x/solvability-neighbors-data.json", { nodes: [] }, "", 12)).toThrow("holds no ids array");
    expect(() => markersOf("x/solvability-neighbors-data.json", { ids: ["a", "b"] }, "", 12)).toThrow("too few markers");
    expect(() => markersOf("D:\\a\\src\\lib\\research-os\\solvability-similarity-data.json", { nodes: [] }, "", 12)).toThrow("holds no ids array");
    expect(idListMarkers(["a", "b", "c", "d", "e", "f", "g"], 12)).toEqual(['"a","b","c","d","e","f"']);
  });

  test("a planted id list in a fake build is a hit", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-staff-ids-"));
    const ids = ["pnp", "riemann", "navier", "yangmills", "hodge", "bsd", "poincare", "fermat"];
    const markers = markersOf([...ID_LIST_FILES][0], { ids }, "", 12);
    writeFileSync(join(dir, "clean.js"), 'const ids=["pnp","riemann"];');
    expect(findStaff([join(dir, "clean.js")], markers)).toEqual([]);
    writeFileSync(join(dir, "leak.js"), `const d=${JSON.stringify({ ids })};`);
    expect(findStaff([dir], markers).map((h) => h.file)).toEqual([join(dir, "leak.js")]);
    rmSync(dir, { recursive: true });
  });
});
