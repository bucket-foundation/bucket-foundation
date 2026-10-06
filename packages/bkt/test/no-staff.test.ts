import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findStaff, ID_LIST_FILES, ID_RUN, idListMarkers, markersOf, STAFF, staffMarkers } from "../scripts/check-no-staff";

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
