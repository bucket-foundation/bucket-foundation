import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findStaff, staffMarkers } from "../scripts/check-no-staff";

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
});
