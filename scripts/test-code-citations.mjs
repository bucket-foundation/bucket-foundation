/**
 * The code-citation checker's own rules
 * (scripts/check-code-citations.mjs), against fixtures written to a
 * temporary tree.
 *
 * A checker with a hole is worse than no checker, because it licenses
 * the belief that a class of defect is closed. Each case here is a wrong
 * citation the checker has to catch, or a right one it must leave alone.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const CHECKER = path.join(process.cwd(), "scripts/check-code-citations.mjs");

/** A throwaway repo with one source file and one prose file. */
function repo(prose, source = SOURCE) {
  const dir = mkdtempSync(path.join(tmpdir(), "cite-"));
  mkdirSync(path.join(dir, "src/lib"), { recursive: true });
  mkdirSync(path.join(dir, "docs"), { recursive: true });
  writeFileSync(path.join(dir, "src/lib/widget.ts"), source);
  writeFileSync(path.join(dir, "docs/memo.md"), prose);
  return dir;
}

const SOURCE = [
  "export const FIRST = 1;", // 1
  "", // 2
  "export function makeWidget() {", // 3
  "  return { id: 1 };", // 4
  "}", // 5
  "", // 6
  "", // 7
  "", // 8
  "", // 9
  "", // 10
  "", // 11
  "", // 12
  "", // 13
  "", // 14
  "", // 15
  "export function farAway() {", // 16
  "  return 2;", // 17
  "}", // 18
].join("\n");

function run(dir) {
  const r = spawnSync("node", [CHECKER], { cwd: dir, encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

test("a citation at the right line passes", () => {
  const r = run(repo("The `makeWidget` factory lives at `src/lib/widget.ts:3`.\n"));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /every citation resolves/);
});

test("a citation naming a symbol that is nowhere near it fails", () => {
  const r = run(repo("The `farAway` helper is at `src/lib/widget.ts:3`.\n"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /symbol-not-there/);
  assert.match(r.out, /is at line 16/, "and it says where the symbol really is");
});

test("a line past the end of the file fails", () => {
  const r = run(repo("See `src/lib/widget.ts:400`.\n"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /out-of-range/);
  assert.match(r.out, /18 lines/);
});

test("a file that does not exist fails", () => {
  const r = run(repo("See `src/lib/ghost.ts:3`.\n"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /missing-file/);
});

test("an abbreviated path that resolves to one file passes", () => {
  const r = run(repo("The `makeWidget` factory is at `lib/widget.ts:3`.\n"));
  assert.equal(r.code, 0, r.out);
});

test("a citation inside a fenced block is an illustration, not a claim", () => {
  const r = run(repo("```\nsee src/lib/widget.ts:400 for the shape\n```\n"));
  assert.equal(r.code, 0, r.out);
});

test("a citation inside a tilde-fenced block is skipped the same way", () => {
  const r = run(repo("~~~\nsee src/lib/widget.ts:400 for the shape\n~~~\n"));
  assert.equal(r.code, 0, r.out);
});

test("a table cell is the unit, so the fix column does not answer for the citation", () => {
  const prose = [
    "| id | where | fix |",
    "| --- | --- | --- |",
    "| P-1 | `src/lib/widget.ts:3` | call `farAway` instead |",
    "",
  ].join("\n");
  const r = run(repo(prose));
  assert.equal(r.code, 0, `the fix column names a symbol absent from the cited line by design: ${r.out}`);
});

test("a wrong citation in a table cell is still caught", () => {
  const prose = ["| id | where |", "| --- | --- |", "| P-1 | `farAway` at `src/lib/widget.ts:3` |", ""].join("\n");
  const r = run(repo(prose));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /symbol-not-there/);
});

test("a second path on the line does not excuse a wrong single citation", () => {
  // The symbol check stands down when a line cites more than one path,
  // because the mapping is ambiguous. The line and file checks do not.
  const r = run(repo("Both `src/lib/widget.ts:400` and `src/lib/other.ts` matter.\n"));
  assert.equal(r.code, 1, `an out-of-range line is caught whatever else the line mentions: ${r.out}`);
  assert.match(r.out, /out-of-range/);
});
