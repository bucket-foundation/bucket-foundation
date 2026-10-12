import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { diffLines, DIFF_EDIT_CAP, splitLines, unifiedPatch } from "../src/diff";

function apply(files: Record<string, [string, string]>): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), "bkt-diff-"));
  try {
    Bun.spawnSync(["git", "init", "-q"], { cwd: dir });
    let patch = "";
    for (const [path, [before, after]] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), before);
      patch += unifiedPatch(path, diffLines(before, after));
    }
    writeFileSync(join(dir, "CHANGES.patch"), patch);
    const check = Bun.spawnSync(["git", "apply", "--check", "CHANGES.patch"], { cwd: dir, stderr: "pipe" });
    expect(check.stderr.toString() + check.exitCode).toBe("0");
    expect(Bun.spawnSync(["git", "apply", "CHANGES.patch"], { cwd: dir }).exitCode).toBe(0);
    return Object.fromEntries(Object.keys(files).map((path) => [path, readFileSync(join(dir, path), "utf8")]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const lines = (n: number, mark = "") => Array.from({ length: n }, (_, i) => `line ${i}${mark}`).join("\n") + "\n";

describe("line diff", () => {
  test("diff hunks", () => {
    const before = lines(30);
    const after = before.replace("line 4\n", "line four\n").replace("line 20\n", "").replace("line 25\n", "line 25\nadded a\nadded b\n");
    const d = diffLines(before, after);
    expect([d.added, d.removed, d.hunks.length]).toEqual([3, 2, 2]);
    expect(d.hunks[0]).toMatchObject({ oldStart: 2, oldLines: 7, newStart: 2, newLines: 7 });
    expect(d.hunks[0].lines.map((l) => `${l.op}${l.text}`)).toEqual([" line 1", " line 2", " line 3", "-line 4", "+line four", " line 5", " line 6", " line 7"]);
    expect(d.hunks[1]).toMatchObject({ oldStart: 18, oldLines: 12, newStart: 18, newLines: 13 });
    expect(diffLines(before, before)).toEqual({ hunks: [], added: 0, removed: 0 });
    expect(unifiedPatch("a.txt", diffLines(before, before))).toBe("");
    expect(splitLines("a\nb")).toEqual([{ text: "a", eol: true }, { text: "b", eol: false }]);
    expect(splitLines("")).toEqual([]);
    const near = diffLines(lines(20), lines(20).replace("line 5\n", "x\n").replace("line 9\n", "y\n"));
    expect(near.hunks.length).toBe(1);
  });

  test("the patch applies with git apply for edits, missing final newlines, empty files and many hunks", () => {
    const tsv = "id\tlicence\tstatement\n1\tCC0-1.0\tAlpha\n2\tCC BY-SA 4.0\tBeta\n3\tCC0-1.0\tGamma\n";
    const cases: Record<string, [string, string]> = {
      "papers/demo/main.tex": [lines(60), lines(60).replace("line 10\n", "A new paragraph.\n\nWith two parts.\n").replace("line 50\n", "")],
      "public/papers/demo/data/rows.tsv": [tsv, tsv.replace("Beta", "Beta, edited")],
      "notes/no-newline.md": ["first\nlast", "first\nlast line now"],
      "notes/gains-newline.md": ["first\nlast", "first\nlast\n"],
      "notes/loses-newline.md": ["first\nlast\n", "first\nlast"],
      "notes/from-empty.txt": ["", "one\ntwo\n"],
      "notes/to-empty.txt": ["one\ntwo\n", ""],
      "notes/head.txt": [lines(10), `new head\n${lines(10)}`],
      "notes/tail.txt": [lines(10), `${lines(10)}new tail\n`],
      "notes/crlf.csv": ["a,b\r\n1,2\r\n", "a,b\r\n1,3\r\n"],
      "notes/unicode.md": ["naïve — ∑ 数学\nsecond\n", "naïve — ∑ 数学!\nsecond\n"],
      "notes/many.txt": [lines(400), lines(400).split("\n").map((l, i) => (i % 40 === 7 ? `${l} changed` : l)).join("\n")],
    };
    const out = apply(cases);
    for (const [path, [, after]] of Object.entries(cases)) expect({ path, same: out[path] === after }).toEqual({ path, same: true });
  });

  test("a rewrite past the edit cap falls back to one whole-file hunk that still applies", () => {
    const before = lines(DIFF_EDIT_CAP + 500);
    const after = lines(DIFF_EDIT_CAP + 500, " rewritten");
    const at = performance.now();
    const d = diffLines(before, after);
    expect(performance.now() - at).toBeLessThan(3000);
    expect([d.hunks.length, d.added, d.removed]).toEqual([1, DIFF_EDIT_CAP + 500, DIFF_EDIT_CAP + 500]);
    expect(apply({ "big.txt": [before, after] })["big.txt"]).toBe(after);
    const big = `${"x".repeat(60)}\n`.repeat(30_000);
    const t = performance.now();
    const one = diffLines(big, big.replace("x", "y"));
    expect([one.added, one.removed]).toEqual([1, 1]);
    expect(performance.now() - t).toBeLessThan(1500);
  });
});
