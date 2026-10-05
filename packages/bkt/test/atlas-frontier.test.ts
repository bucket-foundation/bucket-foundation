import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atlasFrontier, DEFAULT_WIDTH, fitWidth, frontierLines, frontierOptions, MAX_WIDTH, MIN_WIDTH, writeFrontierSvg } from "../src/cli/atlas";
import { JSON_SHAPES, jsonLine } from "../src/cli/out";
import { resolve } from "../src/cli/run";

describe("bkt atlas frontier", () => {
  test("resolves with its options and refuses a bad reach or width", () => {
    const got = resolve(["atlas", "frontier", "--reach", "0.8", "--width", "60"]);
    expect(got.kind).toBe("run");
    expect(() => resolve(["atlas", "frontier", "--reach", "1"])).toThrow("give --reach as a number above 0 and below 1");
    expect(() => resolve(["atlas", "frontier", "--reach", "x"])).toThrow("give --reach");
    expect(() => resolve(["atlas", "frontier", "--width", "12"])).toThrow(`give --width as a whole number from ${MIN_WIDTH} to ${MAX_WIDTH}`);
    expect(() => resolve(["atlas"])).toThrow("atlas needs a subcommand: frontier");
  });

  test("options default to the stated rule, no file and the terminal width", () => {
    expect(frontierOptions({})).toEqual({ reach: undefined, svg: null, width: null });
    expect(frontierOptions({ reach: "0.75", svg: "f.svg", width: "100" })).toEqual({ reach: 0.75, svg: "f.svg", width: 100 });
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
    expect(lines[0]).toBe(`Solvability frontier: ${f.inside} inside (${f.counts.solved} solved, ${f.counts.reachable} open within reach), ${f.outside} outside`);
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
