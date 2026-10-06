import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve as resolvePath } from "node:path";
import { atlasFrontier as fromPack, DEFAULT_WIDTH, fitWidth, frontierLines, frontierOptions, FULL_LIST, MAX_WIDTH, MIN_WIDTH, NO_FULL, writeFrontierSvg } from "../src/cli/atlas";
import { staffData } from "../src/pack/staff";

const REPO = resolvePath(import.meta.dir, "../../..");
const STAFF = staffData(REPO, { BKT_INCLUDE_STAFF_DATA: "1" });
const atlasFrontier = (reach?: number) => fromPack(reach, STAFF, false)!;
const fullFrontier = (reach?: number) => fromPack(reach, STAFF, true)!;
import { JSON_SHAPES, jsonLine } from "../src/cli/out";
import { resolve } from "../src/cli/run";

describe("bkt atlas frontier", () => {
  test("a public build without the atlas answers null, and the staff pack holds the similarity file", () => {
    expect(fromPack(undefined, {})).toBeNull();
    expect(fromPack(undefined, { solvability: STAFF.solvability })).toBeNull();
    expect(JSON.parse(readFileSync(resolvePath(REPO, "src/lib/research-os/solvability-similarity-data.json"), "utf8")).ids.length).toBeGreaterThan(0);
    expect(fromPack(undefined, STAFF)).not.toBeNull();
  });

  test("the full set is the default when the pack holds neighbour data, and --full without it refuses", () => {
    const f = fromPack(undefined, STAFF)!;
    expect(f.points.length).toBeGreaterThan(4000);
    expect(f.points.every((p) => p.sourceKind !== "lean")).toBe(true);
    expect(f.rule).toContain("stored neighbours");
    expect(fullFrontier().points.length).toBe(f.points.length);
    expect(atlasFrontier().points.length).toBeLessThan(400);
    expect(() => fromPack(undefined, { solvability: STAFF.solvability, similarity: STAFF.similarity }, true)).toThrow(NO_FULL);
    expect(fromPack(undefined, { solvability: STAFF.solvability, similarity: STAFF.similarity })!.points.length).toBeLessThan(400);
    const lines = frontierLines(f, 120, false);
    expect(lines.filter((l) => / reach \d\.\d\d {2}\+/.test(l)).length).toBe(Math.min(FULL_LIST, f.outside));
    expect(lines.some((l) => l.startsWith("Per branch:"))).toBe(true);
    expect(lines.some((l) => l.trimStart().startsWith("mathematics"))).toBe(true);
  });

  test("resolves with its options and refuses a bad reach or width", () => {
    const got = resolve(["atlas", "frontier", "--reach", "0.8", "--width", "60"]);
    expect(got.kind).toBe("run");
    expect(() => resolve(["atlas", "frontier", "--reach", "1"])).toThrow("give --reach as a number above 0 and below 1");
    expect(() => resolve(["atlas", "frontier", "--reach", "x"])).toThrow("give --reach");
    expect(() => resolve(["atlas", "frontier", "--width", "12"])).toThrow(`give --width as a whole number from ${MIN_WIDTH} to ${MAX_WIDTH}`);
    expect(() => resolve(["atlas"])).toThrow("atlas needs a subcommand: frontier");
  });

  test("options default to the stated rule, no file and the terminal width", () => {
    expect(frontierOptions({})).toEqual({ reach: undefined, svg: null, width: null, full: false });
    expect(frontierOptions({ reach: "0.75", svg: "f.svg", width: "100", full: true })).toEqual({ reach: 0.75, svg: "f.svg", width: 100, full: true });
    expect(resolve(["atlas", "frontier", "--full"]).kind).toBe("run");
    expect(() => frontierOptions({ svg: " " })).toThrow("--svg needs a file name");
  });

  test("the width follows the terminal inside its bounds", () => {
    expect(fitWidth(undefined)).toBe(DEFAULT_WIDTH);
    expect(fitWidth(20)).toBe(MIN_WIDTH);
    expect(fitWidth(120)).toBe(119);
    expect(fitWidth(900)).toBe(MAX_WIDTH);
  });

  test("the drawing holds every zone, and a hand-set reach moves the circle", () => {
    const f = atlasFrontier();
    expect(f.inside + f.outside).toBe(f.points.length);
    const lines = frontierLines(f, 79, false);
    expect(frontierLines(f, 120, false)[0]).toBe(`Solvability frontier: ${f.inside} inside (${f.counts.solved} solved, ${f.counts.reachable} open within reach), ${f.outside} outside`);
    expect(lines.every((l) => l.length <= 79)).toBe(true);
    expect(lines.every((l) => !l.includes("\x1b"))).toBe(true);
    expect(frontierLines(f, 79, true).some((l) => l.includes("\x1b["))).toBe(true);
    expect(atlasFrontier(0.7).inside).toBeGreaterThan(atlasFrontier(0.9).inside);
    expect(atlasFrontier(0.7).rule).toContain("set by hand");
  });

  test("the JSON line keeps every field of the data", () => {
    const f = atlasFrontier();
    const body = JSON.parse(jsonLine("atlas frontier", f));
    expect(body.v).toBe(1);
    expect(body.points).toEqual(f.points);
    expect(body.counts).toEqual(f.counts);
    expect(body.threshold).toBe(f.threshold);
    expect(Object.keys(JSON_SHAPES)).toContain("atlas frontier");
  });

  test("--svg writes a complete drawing", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-frontier-"));
    try {
      const file = join(dir, "frontier.svg");
      writeFrontierSvg(atlasFrontier(), file);
      const svg = readFileSync(file, "utf8");
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
