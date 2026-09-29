import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { listAnalyses, loadSections, parseAnalyzeArgs, runAnalysis, sections } from "../src/analyze";
import { step, type BrowserState } from "../src/analyze-view";

const FIX = resolve(import.meta.dir, "../analyze/tests/fixtures");
let out: string;
beforeEach(() => {
  out = mkdtempSync(join(tmpdir(), "bkt-analyze-"));
});
afterEach(() => rmSync(out, { recursive: true, force: true }));

describe("args", () => {
  test("parses flags and the file", () => {
    const o = parseAnalyzeArgs(["data.csv", "--force", "--horizon=5", "--name", "x"]);
    expect(o).toMatchObject({ file: "data.csv", force: true, horizon: 5, name: "x", noHelix: false });
  });
  test("rejects missing file, unknown flags and bad horizon", () => {
    expect(() => parseAnalyzeArgs([])).toThrow("usage");
    expect(() => parseAnalyzeArgs(["a.csv", "--wat"])).toThrow("unknown flag");
    expect(() => parseAnalyzeArgs(["a.csv", "--horizon", "-1"])).toThrow("whole number");
    expect(() => parseAnalyzeArgs(["a.csv", "b.csv"])).toThrow("unexpected");
  });
});

describe("runAnalysis", () => {
  test("good file passes and writes markdown plus json", () => {
    const r = runAnalysis({ file: join(FIX, "monthly.csv"), force: false, noHelix: true, json: false, tui: false, out });
    expect(r.code).toBe(0);
    expect(r.report?.form.ok).toBe(true);
    expect(existsSync(join(r.report!.dir, "report.md"))).toBe(true);
    expect(existsSync(join(r.report!.dir, "report.json"))).toBe(true);
    const titles = loadSections(r.report!.dir).map((s) => s.title);
    expect(titles).toEqual(["Overview", "Form", "Summary", "Distributions", "Correlations", "Prime Directions", "Trend and Seasonality", "Outliers", "Residuals", "Helix"]);
    expect(listAnalyses(out).map((a) => a.dir)).toEqual([r.report!.dir]);
  });

  test("malformed file stops with exit 2 and no analysis", () => {
    const r = runAnalysis({ file: join(FIX, "ragged.csv"), force: false, noHelix: true, json: false, tui: false, out });
    expect(r.code).toBe(2);
    expect(r.report?.form.errors.map((e) => e.code)).toContain("E_RAGGED");
    expect(r.report?.analysis).toBeUndefined();
  });

  test("--force analyzes past form errors", () => {
    const r = runAnalysis({ file: join(FIX, "ragged.csv"), force: true, noHelix: true, json: false, tui: false, out });
    expect(r.code).toBe(0);
    expect(r.report?.analysis).toBeDefined();
  });

  test("missing analyzer surfaces an error", () => {
    const r = runAnalysis({ file: join(FIX, "monthly.csv"), force: false, noHelix: true, json: false, tui: false, out }, { ...process.env, BKT_ANALYZE_PY: join(out, "nope.py") });
    expect(r.report).toBeNull();
    expect(r.stderr).toContain("nope.py");
  });
});

describe("sections", () => {
  test("splits on level two headings", () => {
    const s = sections("# T\n\nintro\n\n## A\n\na1\n\n## B\nb1\nb2\n");
    expect(s).toEqual([
      { title: "Overview", body: ["intro"] },
      { title: "A", body: ["a1"] },
      { title: "B", body: ["b1", "b2"] },
    ]);
  });
});

describe("browser keys", () => {
  const counts = { items: 2, sections: 3, lines: 40, page: 10 };
  const s0: BrowserState = { mode: "list", pick: 0, section: 0, scroll: 0 };
  test("vim keys move, open, scroll and back out", () => {
    let s = step(s0, "j", {}, counts) as BrowserState;
    expect(s.pick).toBe(1);
    expect((step(s, "j", {}, counts) as BrowserState).pick).toBe(1);
    s = step(s, "l", {}, counts) as BrowserState;
    expect(s.mode).toBe("sections");
    s = step(s, "G", {}, counts) as BrowserState;
    expect(s.section).toBe(2);
    s = step(s, "", { return: true }, counts) as BrowserState;
    expect(s.mode).toBe("read");
    s = step(s, "G", {}, counts) as BrowserState;
    expect(s.scroll).toBe(30);
    s = step(s, "k", {}, counts) as BrowserState;
    expect(s.scroll).toBe(29);
    s = step(s, "p", {}, counts) as BrowserState;
    expect([s.section, s.scroll]).toEqual([1, 0]);
    s = step(s, "h", {}, counts) as BrowserState;
    expect(s.mode).toBe("sections");
    s = step(s, "q", {}, counts) as BrowserState;
    expect(s.mode).toBe("list");
    expect(step(s, "q", {}, counts)).toBe("quit");
  });
});
