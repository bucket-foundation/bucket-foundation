import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { listAnalyses, loadSections, parseAnalyzeArgs, runAnalysis, sections, startAnalysis } from "../src/analyze";
import { buildPySource } from "../src/pack/pysrc";
import { extractPy } from "../src/pyruntime";
import { step, type BrowserState } from "../src/analyze-view";

const FIX = resolve(import.meta.dir, "../analyze/tests/fixtures");
process.env.XDG_CACHE_HOME ??= mkdtempSync(join(tmpdir(), "bkt-cache-"));
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
  test("good file passes and writes markdown plus json", async () => {
    const r = await runAnalysis({ file: join(FIX, "monthly.csv"), force: false, noHelix: true, json: false, tui: false, dev: false, out });
    expect(r.code).toBe(0);
    expect(r.report?.form.ok).toBe(true);
    expect(existsSync(join(r.report!.dir, "report.md"))).toBe(true);
    expect(existsSync(join(r.report!.dir, "report.json"))).toBe(true);
    const titles = loadSections(r.report!.dir).map((s) => s.title);
    expect(titles).toEqual(["Overview", "Form", "Summary", "Distributions", "Correlations", "Prime Directions", "Trend and Seasonality", "Outliers", "Residuals", "Helix"]);
    expect(listAnalyses(out).map((a) => a.dir)).toEqual([r.report!.dir]);
  });

  test("malformed file stops with exit 2 and no analysis", async () => {
    const r = await runAnalysis({ file: join(FIX, "ragged.csv"), force: false, noHelix: true, json: false, tui: false, dev: false, out });
    expect(r.code).toBe(2);
    expect(r.report?.form.errors.map((e) => e.code)).toContain("E_RAGGED");
    expect(r.report?.analysis).toBeUndefined();
  });

  test("--force analyzes past form errors", async () => {
    const r = await runAnalysis({ file: join(FIX, "ragged.csv"), force: true, noHelix: true, json: false, tui: false, dev: false, out });
    expect(r.code).toBe(0);
    expect(r.report?.analysis).toBeDefined();
  });

  test("dev override is honored only with --dev", async () => {
    const env = { ...process.env, BKT_ANALYZE_PY: join(out, "nope.py"), XDG_CACHE_HOME: join(out, "cache") };
    const base = { file: join(FIX, "monthly.csv"), force: false, noHelix: true, json: false, tui: false, out };
    const dev = await runAnalysis({ ...base, dev: true }, env);
    expect(dev.report).toBeNull();
    expect(dev.stderr).toContain("nope.py");
    const rel = await runAnalysis({ ...base, noHelix: false, dev: false }, env);
    expect(rel.report?.form.ok).toBe(true);
    expect(rel.report?.analysis).toBeDefined();
    expect(rel.report?.helix?.status).toBe("ok");
  });

  test("missing python gives an install hint", async () => {
    const env = { ...process.env, BKT_PYTHON: join(out, "no-python"), XDG_CACHE_HOME: join(out, "cache") };
    const r = await runAnalysis({ file: join(FIX, "monthly.csv"), force: false, noHelix: true, json: false, tui: false, dev: true, out }, env);
    expect(r.report).toBeNull();
    expect(r.stderr).toContain("pip install --user numpy");
  });

  test("cancel stops the run", async () => {
    const run = startAnalysis({ file: join(FIX, "monthly.csv"), force: false, noHelix: false, json: false, tui: false, dev: false, out }, { ...process.env, XDG_CACHE_HOME: join(out, "cache") });
    run.cancel();
    const r = await run.done;
    expect(r.cancelled).toBe(true);
    expect(r.code).not.toBe(0);
  });
});

describe("embedded python", () => {
  test("extracts once to a private versioned dir with helix", () => {
    const src = buildPySource(resolve(import.meta.dir, ".."), resolve(import.meta.dir, "../../.."));
    const root = join(out, "py");
    const dir = extractPy(src, root);
    expect(dir).toBe(join(root, src.version));
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(statSync(root).mode & 0o777).toBe(0o700);
    expect(existsSync(join(dir, "helix/helix/adapters/table.py"))).toBe(true);
    expect(extractPy(src, root)).toBe(dir);
    expect(readdirSync(root)).toEqual([src.version]);
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
